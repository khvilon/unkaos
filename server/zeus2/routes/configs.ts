/**
 * Configs Routes - кастомная реализация с фильтрацией
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createErrorResponse, isValidUuid, escapeIdentifier, Listener } from '../utils/crud-factory';
import { createLogger } from '../../common/logging';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('zeus2:configs');

export function registerConfigsRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const router = Router();

  // GET /api/v2/configs - список с фильтрацией по service
  router.get('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { service, name } = req.query;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }

    try {
      const conditions: string[] = ['deleted_at IS NULL'];
      const params: any[] = [];
      let paramIndex = 1;

      if (service) {
        conditions.push(`service = $${paramIndex}`);
        params.push(service);
        paramIndex++;
      }

      if (name) {
        conditions.push(`name = $${paramIndex}`);
        params.push(name);
        paramIndex++;
      }

      const sql = `
        SELECT 
          'configs' AS table_name,
          uuid, service, name, value, created_at, updated_at
        FROM ${escapeIdentifier(schema)}.configs
        WHERE ${conditions.join(' AND ')}
        ORDER BY service ASC, name ASC
      `;

      const items: any[] = params.length > 0
        ? await prisma.$queryRawUnsafe(sql, ...params)
        : await prisma.$queryRawUnsafe(sql);

      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error getting configs', error: error.message, stack: error.stack });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения configs'));
    }
  });

  // GET /api/v2/configs/:uuid
  router.get('/:uuid', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { uuid } = req.params;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!isValidUuid(uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Invalid UUID'));
    }

    try {
      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT 
          'configs' AS table_name,
          uuid, service, name, value, created_at, updated_at
        FROM ${escapeIdentifier(schema)}.configs
        WHERE uuid = $1::uuid AND deleted_at IS NULL
      `, uuid);

      if (items.length === 0) {
        return res.status(404).json(createErrorResponse(req, 'NOT_FOUND', 'Config не найден'));
      }

      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error getting config', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения config'));
    }
  });

  // POST /api/v2/configs
  router.post('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { service, name, value } = req.body;
    const uuid = req.body.uuid && isValidUuid(req.body.uuid) ? req.body.uuid : uuidv4();

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!service || !name) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'service and name required'));
    }

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO ${escapeIdentifier(schema)}.configs 
        (uuid, service, name, value, created_at, updated_at)
        VALUES ($1::uuid, $2, $3, $4, NOW(), NOW())
      `, uuid, service, name, value ?? '');

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT 
          'configs' AS table_name,
          uuid, service, name, value, created_at, updated_at
        FROM ${escapeIdentifier(schema)}.configs
        WHERE uuid = $1::uuid
      `, uuid);

      res.status(201).json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error creating config', error: error.message });
      if (error.code === '23505') {
        return res.status(409).json(createErrorResponse(req, 'CONFLICT', 'Config уже существует'));
      }
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка создания config'));
    }
  });

  // PUT /api/v2/configs/:uuid
  router.put('/:uuid', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { uuid } = req.params;
    const { service, name, value } = req.body;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!isValidUuid(uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Invalid UUID'));
    }

    try {
      const setClauses: string[] = ['updated_at = NOW()'];
      const params: any[] = [];
      let paramIndex = 1;

      if (service !== undefined) {
        setClauses.push(`service = $${paramIndex}`);
        params.push(service);
        paramIndex++;
      }
      if (name !== undefined) {
        setClauses.push(`name = $${paramIndex}`);
        params.push(name);
        paramIndex++;
      }
      if (value !== undefined) {
        setClauses.push(`value = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }

      params.push(uuid);
      await prisma.$executeRawUnsafe(`
        UPDATE ${escapeIdentifier(schema)}.configs
        SET ${setClauses.join(', ')}
        WHERE uuid = $${paramIndex}::uuid
      `, ...params);

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT 
          'configs' AS table_name,
          uuid, service, name, value, created_at, updated_at
        FROM ${escapeIdentifier(schema)}.configs
        WHERE uuid = $1::uuid
      `, uuid);

      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error updating config', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка обновления config'));
    }
  });

  // DELETE /api/v2/configs/:uuid (soft delete)
  router.delete('/:uuid', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { uuid } = req.params;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!isValidUuid(uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Invalid UUID'));
    }

    try {
      await prisma.$executeRawUnsafe(`
        UPDATE ${escapeIdentifier(schema)}.configs
        SET deleted_at = NOW()
        WHERE uuid = $1::uuid
      `, uuid);
      res.status(204).send();
    } catch (error: any) {
      logger.error({ msg: 'Error deleting config', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка удаления config'));
    }
  });

  app.use(`${apiPrefix}/configs`, router);

  listeners.push({ method: 'get', func: 'read_configs', entity: 'configs' });
  listeners.push({ method: 'get', func: 'read_config', entity: 'config' });
  listeners.push({ method: 'post', func: 'create_configs', entity: 'configs' });
  listeners.push({ method: 'put', func: 'update_configs', entity: 'configs' });
  listeners.push({ method: 'delete', func: 'delete_configs', entity: 'configs' });

  logger.info({ msg: 'Configs routes registered' });
}

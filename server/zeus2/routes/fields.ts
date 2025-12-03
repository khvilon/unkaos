/**
 * Fields Routes - с available_values (JSON)
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createErrorResponse, isValidUuid, escapeIdentifier, Listener } from '../utils/crud-factory';
import { createLogger } from '../../common/logging';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('zeus2:fields');

export function registerFieldsRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const router = Router();

  // GET /api/v2/fields
  router.get('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { is_custom } = req.query;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }

    try {
      const conditions: string[] = ['f.deleted_at IS NULL'];
      if (is_custom !== undefined) {
        conditions.push(`f.is_custom = ${is_custom === 'true'}`);
      }

      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          'fields' AS table_name,
          f.uuid, f.name, f.type_uuid, f.is_custom, f.available_values,
          f.created_at, f.updated_at,
          ft.name AS type_name, ft.code AS type_code
        FROM ${escapeIdentifier(schema)}.fields f
        LEFT JOIN ${escapeIdentifier(schema)}.field_types ft ON ft.uuid = f.type_uuid
        WHERE ${conditions.join(' AND ')}
        ORDER BY f.name ASC
      `);

      // Parse available_values JSON and add type array for frontend compatibility
      const result = (items as any[]).map((item: any) => ({
        ...item,
        available_values: item.available_values ? 
          (typeof item.available_values === 'string' ? JSON.parse(item.available_values) : item.available_values) 
          : null,
        // Добавляем type как массив для совместимости с фронтендом
        type: item.type_uuid ? [{
          uuid: item.type_uuid,
          name: item.type_name,
          code: item.type_code
        }] : []
      }));

      res.json({ rows: result });
    } catch (error: any) {
      logger.error({ msg: 'Error getting fields', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения полей'));
    }
  });

  // GET /api/v2/fields/:uuid
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
      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          'fields' AS table_name,
          f.uuid, f.name, f.type_uuid, f.is_custom, f.available_values,
          f.created_at, f.updated_at,
          ft.name AS type_name, ft.code AS type_code
        FROM ${escapeIdentifier(schema)}.fields f
        LEFT JOIN ${escapeIdentifier(schema)}.field_types ft ON ft.uuid = f.type_uuid
        WHERE f.uuid = $1::uuid AND f.deleted_at IS NULL
      `, uuid);

      if ((items as any[]).length === 0) {
        return res.status(404).json(createErrorResponse(req, 'NOT_FOUND', 'Поле не найдено'));
      }

      const result = (items as any[]).map((item: any) => ({
        ...item,
        available_values: item.available_values ? 
          (typeof item.available_values === 'string' ? JSON.parse(item.available_values) : item.available_values) 
          : null,
        // Добавляем type как массив для совместимости с фронтендом
        type: item.type_uuid ? [{
          uuid: item.type_uuid,
          name: item.type_name,
          code: item.type_code
        }] : []
      }));

      res.json({ rows: result });
    } catch (error: any) {
      logger.error({ msg: 'Error getting field', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения поля'));
    }
  });

  // POST /api/v2/fields
  router.post('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { name, type_uuid, is_custom, available_values } = req.body;
    const uuid = req.body.uuid && isValidUuid(req.body.uuid) ? req.body.uuid : uuidv4();

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!name) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'name required'));
    }
    if (!type_uuid || !isValidUuid(type_uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'type_uuid required'));
    }

    try {
      const avJson = available_values ? JSON.stringify(available_values) : null;

      await prisma.$executeRawUnsafe(`
        INSERT INTO ${escapeIdentifier(schema)}.fields 
        (uuid, name, type_uuid, is_custom, available_values, created_at, updated_at)
        VALUES ($1::uuid, $2, $3::uuid, $4, $5::json, NOW(), NOW())
      `, uuid, name, type_uuid, is_custom ?? false, avJson);

      // Return created field
      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          'fields' AS table_name,
          f.uuid, f.name, f.type_uuid, f.is_custom, f.available_values,
          f.created_at, f.updated_at,
          ft.name AS type_name, ft.code AS type_code
        FROM ${escapeIdentifier(schema)}.fields f
        LEFT JOIN ${escapeIdentifier(schema)}.field_types ft ON ft.uuid = f.type_uuid
        WHERE f.uuid = $1::uuid
      `, uuid);

      res.status(201).json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error creating field', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка создания поля'));
    }
  });

  // PUT /api/v2/fields/:uuid
  router.put('/:uuid', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { uuid } = req.params;
    const { name, type_uuid, is_custom, available_values } = req.body;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!isValidUuid(uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Invalid UUID'));
    }

    try {
      const setClauses: string[] = ['updated_at = NOW()'];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (name !== undefined) {
        setClauses.push(`name = $${paramIndex}`);
        values.push(name);
        paramIndex++;
      }
      if (type_uuid !== undefined && isValidUuid(type_uuid)) {
        setClauses.push(`type_uuid = $${paramIndex}::uuid`);
        values.push(type_uuid);
        paramIndex++;
      }
      if (is_custom !== undefined) {
        setClauses.push(`is_custom = $${paramIndex}`);
        values.push(is_custom);
        paramIndex++;
      }
      if (available_values !== undefined) {
        const avJson = available_values ? JSON.stringify(available_values) : null;
        setClauses.push(`available_values = $${paramIndex}::json`);
        values.push(avJson);
        paramIndex++;
      }

      values.push(uuid);
      await prisma.$executeRawUnsafe(`
        UPDATE ${escapeIdentifier(schema)}.fields
        SET ${setClauses.join(', ')}
        WHERE uuid = $${paramIndex}::uuid
      `, ...values);

      // Return updated field
      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          'fields' AS table_name,
          f.uuid, f.name, f.type_uuid, f.is_custom, f.available_values,
          f.created_at, f.updated_at,
          ft.name AS type_name, ft.code AS type_code
        FROM ${escapeIdentifier(schema)}.fields f
        LEFT JOIN ${escapeIdentifier(schema)}.field_types ft ON ft.uuid = f.type_uuid
        WHERE f.uuid = $1::uuid
      `, uuid);

      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error updating field', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка обновления поля'));
    }
  });

  // DELETE /api/v2/fields/:uuid
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
        UPDATE ${escapeIdentifier(schema)}.fields
        SET deleted_at = NOW()
        WHERE uuid = $1::uuid
      `, uuid);
      res.status(204).send();
    } catch (error: any) {
      logger.error({ msg: 'Error deleting field', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка удаления поля'));
    }
  });

  app.use(`${apiPrefix}/fields`, router);

  listeners.push({ method: 'get', func: 'read_fields', entity: 'fields' });
  listeners.push({ method: 'get', func: 'read_field', entity: 'field' });
  listeners.push({ method: 'post', func: 'create_fields', entity: 'fields' });
  listeners.push({ method: 'post', func: 'upsert_fields', entity: 'fields' });
  listeners.push({ method: 'post', func: 'upsert_field', entity: 'field' });
  listeners.push({ method: 'put', func: 'update_fields', entity: 'fields' });
  listeners.push({ method: 'delete', func: 'delete_fields', entity: 'fields' });

  logger.info({ msg: 'Fields routes registered' });
}

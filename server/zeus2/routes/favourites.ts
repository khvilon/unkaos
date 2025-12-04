/**
 * Favourites Routes - кастомный для поддержки type как массива
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createErrorResponse, isValidUuid, escapeIdentifier, Listener } from '../utils/crud-factory';
import { createLogger } from '../../common/logging';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('zeus2:favourites');

export function registerFavouritesRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const router = Router();

  // GET /api/v2/favourites
  router.get('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { author_uuid } = req.query;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }

    try {
      const conditions: string[] = ['f.deleted_at IS NULL'];
      const params: any[] = [];

      if (author_uuid && isValidUuid(author_uuid as string)) {
        params.push(author_uuid);
        conditions.push(`f.author_uuid = $${params.length}::uuid`);
      }

      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          'favourites' AS table_name,
          f.uuid, f.type_uuid, f.author_uuid, f.name, f.link,
          f.created_at, f.updated_at,
          ft.name AS type_name,
          u.name AS author_name
        FROM ${escapeIdentifier(schema)}.favourites f
        LEFT JOIN ${escapeIdentifier(schema)}.favourites_types ft ON ft.uuid = f.type_uuid
        LEFT JOIN ${escapeIdentifier(schema)}.users u ON u.uuid = f.author_uuid
        WHERE ${conditions.join(' AND ')}
        ORDER BY f.created_at DESC
      `, ...params);

      // Добавляем type как массив для совместимости с фронтендом
      const result = (items as any[]).map((item: any) => ({
        ...item,
        type: item.type_uuid ? [{
          uuid: item.type_uuid,
          name: item.type_name
        }] : []
      }));

      res.json({ rows: result });
    } catch (error: any) {
      logger.error({ msg: 'Error getting favourites', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения избранного'));
    }
  });

  // POST /api/v2/favourites
  router.post('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { type_uuid, author_uuid, name, link } = req.body;
    const uuid = req.body.uuid && isValidUuid(req.body.uuid) ? req.body.uuid : uuidv4();

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!author_uuid || !isValidUuid(author_uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'author_uuid required'));
    }
    if (!name) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'name required'));
    }
    if (!link) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'link required'));
    }

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO ${escapeIdentifier(schema)}.favourites 
        (uuid, type_uuid, author_uuid, name, link, created_at, updated_at)
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, NOW(), NOW())
      `, uuid, type_uuid ?? null, author_uuid, name, link);

      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          'favourites' AS table_name,
          f.uuid, f.type_uuid, f.author_uuid, f.name, f.link,
          f.created_at, f.updated_at,
          ft.name AS type_name,
          u.name AS author_name
        FROM ${escapeIdentifier(schema)}.favourites f
        LEFT JOIN ${escapeIdentifier(schema)}.favourites_types ft ON ft.uuid = f.type_uuid
        LEFT JOIN ${escapeIdentifier(schema)}.users u ON u.uuid = f.author_uuid
        WHERE f.uuid = $1::uuid
      `, uuid);

      const result = (items as any[]).map((item: any) => ({
        ...item,
        type: item.type_uuid ? [{
          uuid: item.type_uuid,
          name: item.type_name
        }] : []
      }));

      res.status(201).json({ rows: result });
    } catch (error: any) {
      logger.error({ msg: 'Error creating favourite', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка создания избранного'));
    }
  });

  // DELETE /api/v2/favourites/:uuid
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
        UPDATE ${escapeIdentifier(schema)}.favourites
        SET deleted_at = NOW()
        WHERE uuid = $1::uuid
      `, uuid);
      res.status(204).send();
    } catch (error: any) {
      logger.error({ msg: 'Error deleting favourite', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка удаления избранного'));
    }
  });

  app.use(`${apiPrefix}/favourites`, router);

  listeners.push({ method: 'get', func: 'read_favourites', entity: 'favourites' });
  listeners.push({ method: 'post', func: 'create_favourites', entity: 'favourites' });
  listeners.push({ method: 'post', func: 'upsert_favourites', entity: 'favourites' });
  listeners.push({ method: 'delete', func: 'delete_favourites', entity: 'favourites' });

  logger.info({ msg: 'Favourites routes registered' });
}








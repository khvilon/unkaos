/**
 * Watchers Routes - кастомная логика из-за composite key (user_uuid, issue_uuid)
 * Таблица watchers не имеет uuid и deleted_at - только user_uuid и issue_uuid
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createErrorResponse, isValidUuid, escapeIdentifier, Listener } from '../utils/crud-factory';
import { createLogger } from '../../common/logging';

const logger = createLogger('zeus2:watchers');

export function registerWatchersRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const router = Router();

  // GET /api/v2/watchers
  router.get('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { issue_uuid, user_uuid } = req.query;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }

    try {
      const conditions: string[] = [];
      const params: any[] = [];

      if (issue_uuid && isValidUuid(issue_uuid as string)) {
        params.push(issue_uuid);
        conditions.push(`w.issue_uuid = $${params.length}::uuid`);
      }
      if (user_uuid && isValidUuid(user_uuid as string)) {
        params.push(user_uuid);
        conditions.push(`w.user_uuid = $${params.length}::uuid`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          'watchers' AS table_name,
          w.user_uuid, w.issue_uuid,
          u.name AS user_name, u.mail AS user_mail
        FROM ${escapeIdentifier(schema)}.watchers w
        LEFT JOIN ${escapeIdentifier(schema)}.users u ON u.uuid = w.user_uuid
        ${whereClause}
        ORDER BY u.name ASC
      `, ...params);

      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error getting watchers', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения наблюдателей'));
    }
  });

  // POST /api/v2/watchers
  router.post('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { issue_uuid, user_uuid } = req.body;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!issue_uuid || !isValidUuid(issue_uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'issue_uuid required', [
        { field: 'issue_uuid', message: 'Обязательное поле' }
      ]));
    }
    if (!user_uuid || !isValidUuid(user_uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'user_uuid required', [
        { field: 'user_uuid', message: 'Обязательное поле' }
      ]));
    }

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO ${escapeIdentifier(schema)}.watchers (user_uuid, issue_uuid)
        VALUES ($1::uuid, $2::uuid)
        ON CONFLICT (user_uuid, issue_uuid) DO NOTHING
      `, user_uuid, issue_uuid);

      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          'watchers' AS table_name,
          w.user_uuid, w.issue_uuid,
          u.name AS user_name
        FROM ${escapeIdentifier(schema)}.watchers w
        LEFT JOIN ${escapeIdentifier(schema)}.users u ON u.uuid = w.user_uuid
        WHERE w.issue_uuid = $1::uuid AND w.user_uuid = $2::uuid
      `, issue_uuid, user_uuid);

      res.status(201).json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error creating watcher', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка добавления наблюдателя'));
    }
  });

  // DELETE /api/v2/watchers - удаление по composite key
  router.delete('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { issue_uuid, user_uuid } = req.query;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!issue_uuid || !isValidUuid(issue_uuid as string)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'issue_uuid required'));
    }
    if (!user_uuid || !isValidUuid(user_uuid as string)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'user_uuid required'));
    }

    try {
      await prisma.$executeRawUnsafe(`
        DELETE FROM ${escapeIdentifier(schema)}.watchers
        WHERE user_uuid = $1::uuid AND issue_uuid = $2::uuid
      `, user_uuid, issue_uuid);
      res.status(204).send();
    } catch (error: any) {
      logger.error({ msg: 'Error deleting watcher', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка удаления наблюдателя'));
    }
  });

  app.use(`${apiPrefix}/watchers`, router);

  // Listeners для Gateway
  listeners.push({ method: 'get', func: 'read_watchers', entity: 'watchers' });
  listeners.push({ method: 'get', func: 'read_watcher', entity: 'watcher' });
  listeners.push({ method: 'post', func: 'create_watchers', entity: 'watchers' });
  listeners.push({ method: 'post', func: 'upsert_watcher', entity: 'watcher' });
  listeners.push({ method: 'post', func: 'upsert_watchers', entity: 'watchers' });
  listeners.push({ method: 'delete', func: 'delete_watcher', entity: 'watcher' });
  listeners.push({ method: 'delete', func: 'delete_watchers', entity: 'watchers' });

  logger.info({ msg: 'Watchers routes registered' });
}








/**
 * Issue Actions Routes
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createErrorResponse, isValidUuid, escapeIdentifier, Listener } from '../utils/crud-factory';
import { createLogger } from '../../common/logging';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('zeus2:issue-actions');

export function registerIssueActionsRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const router = Router();

  // GET /api/v2/issue-actions
  router.get('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const issue_uuid = req.query.issue_uuid as string;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }

    try {
      const conditions: string[] = ['ia.deleted_at IS NULL'];
      const params: any[] = [];

      if (issue_uuid && isValidUuid(issue_uuid)) {
        params.push(issue_uuid);
        conditions.push(`ia.issue_uuid = $${params.length}::uuid`);
      }

      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          'issue_actions' AS table_name,
          ia.uuid, ia.issue_uuid, ia.author_uuid, ia.value, ia.type_uuid,
          ia.created_at, ia.archived_at,
          u.name AS author, iat.name AS name
        FROM ${escapeIdentifier(schema)}.issue_actions ia
        JOIN ${escapeIdentifier(schema)}.issue_actions_types iat ON iat.uuid = ia.type_uuid
        JOIN ${escapeIdentifier(schema)}.users u ON u.uuid = ia.author_uuid
        WHERE ${conditions.join(' AND ')}
        ORDER BY ia.created_at DESC
      `, ...params);

      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error getting issue actions', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения истории'));
    }
  });

  // POST /api/v2/issue-actions
  router.post('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { issue_uuid, author_uuid, value, type_uuid } = req.body;
    const uuid = req.body.uuid && isValidUuid(req.body.uuid) ? req.body.uuid : uuidv4();

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!issue_uuid || !isValidUuid(issue_uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'issue_uuid required'));
    }
    if (!author_uuid || !isValidUuid(author_uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'author_uuid required'));
    }
    if (!type_uuid || !isValidUuid(type_uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'type_uuid required'));
    }

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO ${escapeIdentifier(schema)}.issue_actions 
        (uuid, issue_uuid, author_uuid, value, type_uuid, created_at, updated_at)
        VALUES (${uuid}::uuid, ${issue_uuid}::uuid, ${author_uuid}::uuid, ${value ?? null}, ${type_uuid}::uuid, NOW(), NOW())
      `);

      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          'issue_actions' AS table_name,
          ia.uuid, ia.issue_uuid, ia.author_uuid, ia.value, ia.type_uuid,
          ia.created_at, ia.archived_at,
          u.name AS author, iat.name AS name
        FROM ${escapeIdentifier(schema)}.issue_actions ia
        JOIN ${escapeIdentifier(schema)}.issue_actions_types iat ON iat.uuid = ia.type_uuid
        JOIN ${escapeIdentifier(schema)}.users u ON u.uuid = ia.author_uuid
        WHERE ia.uuid = ${uuid}::uuid
      `);

      res.status(201).json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error creating issue action', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка создания записи истории'));
    }
  });

  // PUT /api/v2/issue-actions/:uuid (для архивации)
  router.put('/:uuid', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { uuid } = req.params;
    const { value, archived_at } = req.body;

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
      
      if (value !== undefined) {
        setClauses.push(`value = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
      if (archived_at !== undefined) {
        if (archived_at) {
          setClauses.push(`archived_at = $${paramIndex}`);
          values.push(archived_at);
          paramIndex++;
        } else {
          setClauses.push(`archived_at = NOW()`);
        }
      }

      values.push(uuid);
      await prisma.$executeRawUnsafe(`
        UPDATE ${escapeIdentifier(schema)}.issue_actions
        SET ${setClauses.join(', ')}
        WHERE uuid = $${paramIndex}::uuid
      `, ...values);

      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          'issue_actions' AS table_name,
          ia.uuid, ia.issue_uuid, ia.author_uuid, ia.value, ia.type_uuid,
          ia.created_at, ia.archived_at,
          u.name AS author, iat.name AS name
        FROM ${escapeIdentifier(schema)}.issue_actions ia
        JOIN ${escapeIdentifier(schema)}.issue_actions_types iat ON iat.uuid = ia.type_uuid
        JOIN ${escapeIdentifier(schema)}.users u ON u.uuid = ia.author_uuid
        WHERE ia.uuid = $1::uuid
      `, uuid);

      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error updating issue action', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка обновления записи'));
    }
  });

  // DELETE /api/v2/issue-actions/:uuid (архивация)
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
        UPDATE ${escapeIdentifier(schema)}.issue_actions
        SET archived_at = NOW()
        WHERE uuid = ${uuid}::uuid
      `);
      res.status(204).send();
    } catch (error: any) {
      logger.error({ msg: 'Error archiving issue action', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка архивации записи'));
    }
  });

  app.use(`${apiPrefix}/issue-actions`, router);

  listeners.push({ method: 'get', func: 'read_issue_actions', entity: 'issue_actions' });
  listeners.push({ method: 'get', func: 'read_issue_formated_actions', entity: 'issue_formated_actions' });
  listeners.push({ method: 'post', func: 'create_issue_actions', entity: 'issue_actions' });
  listeners.push({ method: 'post', func: 'upsert_issue_actions', entity: 'issue_actions' });
  listeners.push({ method: 'put', func: 'update_issue_actions', entity: 'issue_actions' });
  listeners.push({ method: 'delete', func: 'delete_issue_actions', entity: 'issue_actions' });

  logger.info({ msg: 'Issue actions routes registered' });
}




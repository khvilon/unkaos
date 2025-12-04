/**
 * Issue Tags Routes - используем CRUD Factory + кастомные роуты для issue_tags_selected
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createCrudRoutes, createErrorResponse, isValidUuid, escapeIdentifier, Listener } from '../utils/crud-factory';
import { createLogger } from '../../common/logging';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('zeus2:issue-tags');

export function registerIssueTagsRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  // Основные теги через фабрику
  createCrudRoutes(app, prisma, listeners, apiPrefix, {
    entity: 'issue_tags',
    singular: 'issue_tag',
    fields: ['uuid', 'name', 'color', 'created_at', 'updated_at'],
    requiredFields: ['name'],
    uuidFields: [],
    updatableFields: ['name', 'color'],
    defaultOrder: 'name ASC',
    softDelete: true
  });

  // Дополнительные роуты для issue_tags_selected
  const selectedRouter = Router();

  // GET /api/v2/issue-tags-selected
  selectedRouter.get('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { issue_uuid, tag_uuid } = req.query;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }

    try {
      let whereConditions = [`its.deleted_at IS NULL`];
      const params: any[] = [];
      
      if (issue_uuid && isValidUuid(issue_uuid as string)) {
        params.push(issue_uuid);
        whereConditions.push(`its.issue_uuid = $${params.length}::uuid`);
      }
      if (tag_uuid && isValidUuid(tag_uuid as string)) {
        params.push(tag_uuid);
        whereConditions.push(`its.issue_tags_uuid = $${params.length}::uuid`);
      }

      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          'issue_tags_selected' AS table_name,
          its.uuid, its.issue_uuid, its.issue_tags_uuid, its.created_at,
          it.name AS tag_name, it.color AS tag_color
        FROM ${escapeIdentifier(schema)}.issue_tags_selected its
        LEFT JOIN ${escapeIdentifier(schema)}.issue_tags it ON it.uuid = its.issue_tags_uuid
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY it.name
      `, ...params);

      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error getting issue_tags_selected', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения тегов задачи'));
    }
  });

  // POST /api/v2/issue-tags-selected
  selectedRouter.post('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { issue_uuid, tag_uuid } = req.body;
    const uuid = req.body.uuid && isValidUuid(req.body.uuid) ? req.body.uuid : uuidv4();

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!issue_uuid || !isValidUuid(issue_uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'issue_uuid required'));
    }
    if (!tag_uuid || !isValidUuid(tag_uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'tag_uuid (issue_tags_uuid) required'));
    }

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO ${escapeIdentifier(schema)}.issue_tags_selected 
        (uuid, issue_uuid, issue_tags_uuid, created_at, updated_at)
        VALUES ('${uuid}'::uuid, '${issue_uuid}'::uuid, '${tag_uuid}'::uuid, NOW(), NOW())
        ON CONFLICT (issue_uuid, issue_tags_uuid) DO NOTHING
      `);

      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          'issue_tags_selected' AS table_name,
          its.uuid, its.issue_uuid, its.issue_tags_uuid, its.created_at,
          it.name AS tag_name, it.color AS tag_color
        FROM ${escapeIdentifier(schema)}.issue_tags_selected its
        LEFT JOIN ${escapeIdentifier(schema)}.issue_tags it ON it.uuid = its.issue_tags_uuid
        WHERE its.issue_uuid = '${issue_uuid}'::uuid AND its.issue_tags_uuid = '${tag_uuid}'::uuid
      `);

      res.status(201).json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error creating issue_tag_selected', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка добавления тега'));
    }
  });

  // DELETE /api/v2/issue-tags-selected/:uuid
  selectedRouter.delete('/:uuid', async (req: Request, res: Response) => {
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
        UPDATE ${escapeIdentifier(schema)}.issue_tags_selected
        SET deleted_at = NOW()
        WHERE uuid = '${uuid}'::uuid
      `);
      res.status(204).send();
    } catch (error: any) {
      logger.error({ msg: 'Error deleting issue_tag_selected', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка удаления тега'));
    }
  });

  app.use(`${apiPrefix}/issue-tags-selected`, selectedRouter);

  // Регистрируем listeners для Gateway
  listeners.push({ method: 'get', func: 'read_issue_tags_selected', entity: 'issue_tags_selected' });
  listeners.push({ method: 'post', func: 'create_issue_tags_selected', entity: 'issue_tags_selected' });
  listeners.push({ method: 'post', func: 'upsert_issue_tags_selected', entity: 'issue_tags_selected' });
  listeners.push({ method: 'delete', func: 'delete_issue_tags_selected', entity: 'issue_tags_selected' });

  logger.info({ msg: 'Issue tags selected routes registered' });
}




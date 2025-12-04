/**
 * Issue Types Routes - с fields и workflow
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createErrorResponse, isValidUuid, escapeIdentifier, Listener } from '../utils/crud-factory';
import { createLogger } from '../../common/logging';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('zeus2:issue-types');

export function registerIssueTypesRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const router = Router();

  async function getIssueTypesWithFields(schema: string, uuid?: string) {
    const whereClause = uuid 
      ? `WHERE it.uuid = $1::uuid AND it.deleted_at IS NULL`
      : `WHERE it.deleted_at IS NULL`;

    const query = `
      SELECT 
        'issue_types' AS table_name,
        it.uuid, it.name, it.workflow_uuid, it.created_at, it.updated_at,
        w.name AS workflow_name,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'uuid', f.uuid,
              'name', f.name,
              'type_uuid', f.type_uuid,
              'is_custom', f.is_custom,
              'available_values', f.available_values,
              'type', json_build_array(
                json_build_object(
                  'uuid', ft.uuid,
                  'name', ft.name,
                  'code', ft.code
                )
              )
            )
          )
          FROM ${escapeIdentifier(schema)}.issue_types_to_fields itf
          JOIN ${escapeIdentifier(schema)}.fields f ON f.uuid = itf.fields_uuid AND f.deleted_at IS NULL
          LEFT JOIN ${escapeIdentifier(schema)}.field_types ft ON ft.uuid = f.type_uuid
          WHERE itf.issue_types_uuid = it.uuid
          ), '[]'
        ) AS fields
      FROM ${escapeIdentifier(schema)}.issue_types it
      LEFT JOIN ${escapeIdentifier(schema)}.workflows w ON w.uuid = it.workflow_uuid
      ${whereClause}
      ORDER BY it.name ASC
    `;

    return uuid 
      ? await prisma.$queryRawUnsafe(query, uuid)
      : await prisma.$queryRawUnsafe(query.replace('$1::uuid', "'dummy'"));
  }

  // GET /api/v2/issue-types
  router.get('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }

    try {
      const items = await getIssueTypesWithFields(schema);
      
      // Parse available_values JSON
      const result = (items as any[]).map((item: any) => ({
        ...item,
        fields: item.fields.map((f: any) => ({
          ...f,
          available_values: f.available_values ? 
            (typeof f.available_values === 'string' ? JSON.parse(f.available_values) : f.available_values) 
            : null
        }))
      }));
      
      res.json({ rows: result });
    } catch (error: any) {
      logger.error({ msg: 'Error getting issue types', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения типов задач'));
    }
  });

  // GET /api/v2/issue-types/:uuid
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
      const items = await getIssueTypesWithFields(schema, uuid);
      if ((items as any[]).length === 0) {
        return res.status(404).json(createErrorResponse(req, 'NOT_FOUND', 'Тип задачи не найден'));
      }
      
      const result = (items as any[]).map((item: any) => ({
        ...item,
        fields: item.fields.map((f: any) => ({
          ...f,
          available_values: f.available_values ? 
            (typeof f.available_values === 'string' ? JSON.parse(f.available_values) : f.available_values) 
            : null
        }))
      }));
      
      res.json({ rows: result });
    } catch (error: any) {
      logger.error({ msg: 'Error getting issue type', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения типа задачи'));
    }
  });

  // POST /api/v2/issue-types
  router.post('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { name, workflow_uuid, fields } = req.body;
    const uuid = req.body.uuid && isValidUuid(req.body.uuid) ? req.body.uuid : uuidv4();

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!name) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'name required'));
    }
    if (!workflow_uuid || !isValidUuid(workflow_uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'workflow_uuid required'));
    }

    try {
      // Создаём тип задачи
      await prisma.$executeRawUnsafe(`
        INSERT INTO ${escapeIdentifier(schema)}.issue_types (uuid, name, workflow_uuid, created_at, updated_at)
        VALUES ($1::uuid, $2, $3::uuid, NOW(), NOW())
      `, uuid, name, workflow_uuid);

      // Добавляем fields
      // Поддерживаем оба формата: массив UUID строк или массив объектов {uuid: '...'}
      if (fields && Array.isArray(fields)) {
        for (const field of fields) {
          const fieldUuid = typeof field === 'string' ? field : field?.uuid;
          if (fieldUuid && isValidUuid(fieldUuid)) {
            await prisma.$executeRawUnsafe(`
              INSERT INTO ${escapeIdentifier(schema)}.issue_types_to_fields (issue_types_uuid, fields_uuid)
              VALUES ($1::uuid, $2::uuid)
              ON CONFLICT DO NOTHING
            `, uuid, fieldUuid);
          }
        }
      }

      const items = await getIssueTypesWithFields(schema, uuid);
      res.status(201).json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error creating issue type', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка создания типа задачи'));
    }
  });

  // PUT /api/v2/issue-types/:uuid
  router.put('/:uuid', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { uuid } = req.params;
    const { name, workflow_uuid, fields } = req.body;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!isValidUuid(uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Invalid UUID'));
    }

    try {
      // Обновляем тип задачи
      const setClauses: string[] = ['updated_at = NOW()'];
      const values: any[] = [];
      let paramIndex = 1;

      if (name !== undefined) {
        setClauses.push(`name = $${paramIndex}`);
        values.push(name);
        paramIndex++;
      }
      if (workflow_uuid !== undefined && isValidUuid(workflow_uuid)) {
        setClauses.push(`workflow_uuid = $${paramIndex}::uuid`);
        values.push(workflow_uuid);
        paramIndex++;
      }

      values.push(uuid);
      await prisma.$executeRawUnsafe(`
        UPDATE ${escapeIdentifier(schema)}.issue_types
        SET ${setClauses.join(', ')}
        WHERE uuid = $${paramIndex}::uuid
      `, ...values);

      // Обновляем fields если переданы
      // По парадигме Full Replace: undefined = не трогаем, [] = удаляем все, [...] = заменяем
      // Поддерживаем оба формата: массив UUID строк или массив объектов {uuid: '...'}
      if (fields !== undefined && Array.isArray(fields)) {
        // Удаляем старые
        await prisma.$executeRawUnsafe(`
          DELETE FROM ${escapeIdentifier(schema)}.issue_types_to_fields
          WHERE issue_types_uuid = $1::uuid
        `, uuid);

        // Добавляем новые
        for (const field of fields) {
          const fieldUuid = typeof field === 'string' ? field : field?.uuid;
          if (fieldUuid && isValidUuid(fieldUuid)) {
            await prisma.$executeRawUnsafe(`
              INSERT INTO ${escapeIdentifier(schema)}.issue_types_to_fields (issue_types_uuid, fields_uuid)
              VALUES ($1::uuid, $2::uuid)
              ON CONFLICT DO NOTHING
            `, uuid, fieldUuid);
          }
        }
      }

      const items = await getIssueTypesWithFields(schema, uuid);
      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error updating issue type', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка обновления типа задачи'));
    }
  });

  // DELETE /api/v2/issue-types/:uuid
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
        UPDATE ${escapeIdentifier(schema)}.issue_types
        SET deleted_at = NOW()
        WHERE uuid = $1::uuid
      `, uuid);
      res.status(204).send();
    } catch (error: any) {
      logger.error({ msg: 'Error deleting issue type', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка удаления типа задачи'));
    }
  });

  app.use(`${apiPrefix}/issue-types`, router);

  listeners.push({ method: 'get', func: 'read_issue_types', entity: 'issue_types' });
  listeners.push({ method: 'get', func: 'read_issue_type', entity: 'issue_type' });
  listeners.push({ method: 'post', func: 'create_issue_types', entity: 'issue_types' });
  listeners.push({ method: 'post', func: 'upsert_issue_types', entity: 'issue_types' });
  listeners.push({ method: 'put', func: 'update_issue_types', entity: 'issue_types' });
  listeners.push({ method: 'delete', func: 'delete_issue_types', entity: 'issue_types' });

  logger.info({ msg: 'Issue types routes registered' });
}

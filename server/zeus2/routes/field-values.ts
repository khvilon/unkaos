/**
 * Field Values Routes - с защитой поля автора
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createErrorResponse, isValidUuid, escapeIdentifier, Listener } from '../utils/crud-factory';
import { createLogger } from '../../common/logging';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('zeus2:field-values');
const AUTHOR_FIELD_UUID = "733f669a-9584-4469-a41b-544e25b8d91a";

export function registerFieldValuesRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const router = Router();

  // GET /api/v2/field-values
  router.get('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { issue_uuid, field_uuid } = req.query;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }

    try {
      const conditions: string[] = ['fv.deleted_at IS NULL'];
      const params: any[] = [];

      if (issue_uuid && isValidUuid(issue_uuid as string)) {
        params.push(issue_uuid);
        conditions.push(`fv.issue_uuid = $${params.length}::uuid`);
      }
      if (field_uuid && isValidUuid(field_uuid as string)) {
        params.push(field_uuid);
        conditions.push(`fv.field_uuid = $${params.length}::uuid`);
      }

      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          'field_values' AS table_name,
          fv.uuid, fv.issue_uuid, fv.field_uuid, fv.value, fv.created_at, fv.updated_at,
          f.name AS field_name, ft.code AS field_type
        FROM ${escapeIdentifier(schema)}.field_values fv
        LEFT JOIN ${escapeIdentifier(schema)}.fields f ON f.uuid = fv.field_uuid
        LEFT JOIN ${escapeIdentifier(schema)}.field_types ft ON ft.uuid = f.type_uuid
        WHERE ${conditions.join(' AND ')}
        ORDER BY f.name
      `, ...params);

      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error getting field values', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения значений полей'));
    }
  });

  // POST /api/v2/field-values (upsert by issue_uuid + field_uuid)
  router.post('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { issue_uuid, field_uuid, value } = req.body;
    const uuid = req.body.uuid && isValidUuid(req.body.uuid) ? req.body.uuid : uuidv4();

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!issue_uuid || !isValidUuid(issue_uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'issue_uuid required'));
    }
    if (!field_uuid || !isValidUuid(field_uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'field_uuid required'));
    }

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO ${escapeIdentifier(schema)}.field_values 
        (uuid, issue_uuid, field_uuid, value, created_at, updated_at)
        VALUES (${uuid}::uuid, ${issue_uuid}::uuid, ${field_uuid}::uuid, ${value ?? null}, NOW(), NOW())
        ON CONFLICT (issue_uuid, field_uuid) DO UPDATE SET value = ${value ?? null}, updated_at = NOW()
      `);

      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          'field_values' AS table_name,
          fv.uuid, fv.issue_uuid, fv.field_uuid, fv.value, fv.created_at, fv.updated_at,
          f.name AS field_name, ft.code AS field_type
        FROM ${escapeIdentifier(schema)}.field_values fv
        LEFT JOIN ${escapeIdentifier(schema)}.fields f ON f.uuid = fv.field_uuid
        LEFT JOIN ${escapeIdentifier(schema)}.field_types ft ON ft.uuid = f.type_uuid
        WHERE fv.issue_uuid = ${issue_uuid}::uuid AND fv.field_uuid = ${field_uuid}::uuid
      `);

      res.status(201).json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error creating field value', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка создания значения поля'));
    }
  });

  // PUT /api/v2/field-values/:uuid
  router.put('/:uuid', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { uuid } = req.params;
    const { value, field_uuid } = req.body;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!isValidUuid(uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Invalid UUID'));
    }

    // Проверка на поле автора
    if (field_uuid === AUTHOR_FIELD_UUID) {
      return res.status(403).json(createErrorResponse(req, 'FORBIDDEN', 'Нельзя изменять поле автора'));
    }

    try {
      // Проверяем что это не поле автора
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT field_uuid FROM ${escapeIdentifier(schema)}.field_values WHERE uuid = ${uuid}::uuid
      `);
      
      if (existing.length > 0 && existing[0].field_uuid === AUTHOR_FIELD_UUID) {
        return res.status(403).json(createErrorResponse(req, 'FORBIDDEN', 'Нельзя изменять поле автора'));
      }

      await prisma.$executeRawUnsafe(`
        UPDATE ${escapeIdentifier(schema)}.field_values
        SET value = ${value ?? null}, updated_at = NOW()
        WHERE uuid = ${uuid}::uuid
      `);

      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          'field_values' AS table_name,
          fv.uuid, fv.issue_uuid, fv.field_uuid, fv.value, fv.created_at, fv.updated_at,
          f.name AS field_name, ft.code AS field_type
        FROM ${escapeIdentifier(schema)}.field_values fv
        LEFT JOIN ${escapeIdentifier(schema)}.fields f ON f.uuid = fv.field_uuid
        LEFT JOIN ${escapeIdentifier(schema)}.field_types ft ON ft.uuid = f.type_uuid
        WHERE fv.uuid = ${uuid}::uuid
      `);

      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error updating field value', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка обновления значения поля'));
    }
  });

  // DELETE /api/v2/field-values/:uuid
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
        UPDATE ${escapeIdentifier(schema)}.field_values
        SET deleted_at = NOW()
        WHERE uuid = ${uuid}::uuid
      `);
      res.status(204).send();
    } catch (error: any) {
      logger.error({ msg: 'Error deleting field value', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка удаления значения поля'));
    }
  });

  app.use(`${apiPrefix}/field-values`, router);

  listeners.push({ method: 'get', func: 'read_field_values', entity: 'field_values' });
  listeners.push({ method: 'post', func: 'create_field_values', entity: 'field_values' });
  listeners.push({ method: 'post', func: 'upsert_field_values', entity: 'field_values' });
  listeners.push({ method: 'put', func: 'update_field_values', entity: 'field_values' });
  listeners.push({ method: 'delete', func: 'delete_field_values', entity: 'field_values' });

  logger.info({ msg: 'Field values routes registered' });
}




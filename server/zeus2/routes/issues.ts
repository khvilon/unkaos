/**
 * Issues REST API Routes
 * 
 * GET    /api/v2/issues          - Список issues с фильтрацией
 * GET    /api/v2/issues/:uuid    - Одна issue по UUID
 * POST   /api/v2/issues          - Создание issue
 * PUT    /api/v2/issues/:uuid    - Обновление issue (upsert)
 * PATCH  /api/v2/issues/:uuid    - Частичное обновление
 * DELETE /api/v2/issues/:uuid    - Soft delete
 * 
 * GET    /api/v2/issues-count    - Подсчёт issues с фильтрацией
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { FieldMapping } from '@unkaos/query-lang';
import { createLogger } from '../../common/logging';
import { decodeQuery, parseIssueQuery } from '../utils/issue-query-parser';
import {
  buildIssuesListQuery,
  buildIssueByUuidQuery,
  buildIssuesCountQuery,
  buildInsertIssueParams,
  buildUpdateIssueParams,
  buildGetNextIssueNumQuery
} from '../utils/issue-query-builder';
import { escapeIdentifier } from '../utils/crud-factory';

const logger = createLogger('zeus2:issues');

// Use shared prisma instance
let prisma: PrismaClient;

const router = Router();
const basePath = '/api/v2/issues';

// Стандартный формат ошибки
function errorResponse(req: Request, code: string, message: string, details: any[] = []) {
  return {
    code,
    message,
    trace_id: req.headers['x-trace-id'] || '',
    details
  };
}

// Валидация UUID
function isValidUuid(value: string): boolean {
  return uuidValidate(value);
}

// Форматирование issue для ответа
// Примечание: BigInt преобразуется в Number для JSON сериализации
function formatIssue(item: any): any {
  return {
    uuid: item.uuid,
    num: typeof item.num === 'bigint' ? Number(item.num) : item.num,
    title: item.title,
    description: item.description,
    spent_time: item.spent_time ? Number(item.spent_time) : 0,
    type_uuid: item.type_uuid,
    type_name: item.type_name,
    workflow_uuid: item.workflow_uuid,
    created_at: item.created_at,
    updated_at: item.updated_at,
    deleted_at: item.deleted_at,
    resolved_at: item.resolved_at,
    project_uuid: item.project_uuid,
    project_name: item.project_name,
    project_short_name: item.project_short_name,
    author_uuid: item.author_uuid,
    author_name: item.author_name,
    status_uuid: item.status_uuid,
    status_name: item.status_name,
    sprint_uuid: item.sprint_uuid,
    sprint_name: item.sprint_name,
    parent_uuid: item.parent_uuid,
    values: item.values || [],
    table_name: 'issues'
  };
}

// Cache for custom fields: subdomain -> { timestamp, fields }
const fieldsCache: Record<string, { ts: number, fields: FieldMapping[] }> = {};
const CACHE_TTL = 60 * 1000; // 1 minute

function mapFieldType(code: string): string {
  switch (code) {
    case 'Numeric': return 'number';
    case 'Boolean': return 'boolean';
    case 'Date': 
    case 'Timestamp': return 'date';
    default: return 'string';
  }
}

async function getCustomFields(subdomain: string): Promise<FieldMapping[]> {
  const now = Date.now();
  if (fieldsCache[subdomain] && (now - fieldsCache[subdomain].ts < CACHE_TTL)) {
    return fieldsCache[subdomain].fields;
  }

  try {
    // Используем параметризованный запрос с безопасным экранированием схемы
    const fields: any[] = await prisma.$queryRawUnsafe(`
      SELECT F.name, F.uuid, FT.code as type_code
      FROM ${escapeIdentifier(subdomain)}.fields F
      JOIN ${escapeIdentifier(subdomain)}.field_types FT ON F.type_uuid = FT.uuid
      WHERE F.is_custom = true
    `);

    const mappedFields: FieldMapping[] = fields.map(f => ({
      name: f.name,
      field: 'value', // Custom fields value is stored in 'value' column of field_values
      type: mapFieldType(f.type_code),
      source: 'custom',
      uuid: f.uuid
    }));

    fieldsCache[subdomain] = { ts: now, fields: mappedFields };
    return mappedFields;
  } catch (e: any) {
    logger.error({ msg: 'Error fetching custom fields', error: e.message });
    return [];
  }
}

/**
 * GET /api/v2/issues - Список issues с фильтрацией
 */
router.get('/', async (req: Request, res: Response) => {
  const subdomain = req.headers.subdomain as string;
  const { query: encodedQuery, offset = '0', limit = '1000' } = req.query;

  logger.info({
    msg: 'GET issues',
    subdomain,
    hasQuery: !!encodedQuery,
    offset,
    limit,
    request_id: req.headers['x-request-id']
  });

  try {
    // Декодируем и парсим запрос фильтрации
    const userQuery = decodeQuery(encodedQuery as string);
    const customFields = await getCustomFields(subdomain);
    const parsedQuery = parseIssueQuery(userQuery, subdomain, customFields);

    // Проверяем ошибки валидации
    if (parsedQuery.validationErrors && parsedQuery.validationErrors.length > 0) {
      logger.warn({
        msg: 'Query validation failed',
        userQuery,
        errors: parsedQuery.validationErrors
      });
      return res.status(400).json(errorResponse(
        req, 
        'VALIDATION_ERROR', 
        'Ошибка в запросе фильтрации',
        parsedQuery.validationErrors.map(e => ({
          field: e.field,
          message: e.message,
          code: e.code
        }))
      ));
    }

    logger.debug({
      msg: 'Parsed query',
      userQuery,
      whereClause: parsedQuery.whereClause,
      orderByClause: parsedQuery.orderByClause
    });

    // Строим и выполняем SQL
    const sql = buildIssuesListQuery(subdomain, parsedQuery, {
      offset: parseInt(offset as string),
      limit: parseInt(limit as string)
    });

    logger.debug({ msg: 'Executing SQL', sql: sql.substring(0, 500) + '...' });

    const items: any[] = await prisma.$queryRawUnsafe(sql);

    logger.info({ msg: 'Issues found', subdomain, count: items.length });

    res.status(200).json({
      items: items.map(formatIssue),
      page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
      limit: parseInt(limit as string),
      total: items.length
    });
  } catch (error: any) {
    logger.error({ msg: 'Error getting issues', error: error.message, stack: error.stack });
    res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
  }
});

/**
 * GET /api/v2/issues/:uuid - Одна issue по UUID
 */
router.get('/:uuid', async (req: Request, res: Response) => {
  const subdomain = req.headers.subdomain as string;
  const { uuid } = req.params;

  // Валидация UUID для защиты от SQL injection
  if (!isValidUuid(uuid)) {
    return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Некорректный формат UUID'));
  }

  logger.info({ msg: 'GET issue by UUID', subdomain, uuid });

  try {
    const sql = buildIssueByUuidQuery(subdomain, uuid);
    const items: any[] = await prisma.$queryRawUnsafe(sql);

    if (items.length === 0) {
      return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Issue не найдена'));
    }

    res.status(200).json(formatIssue(items[0]));
  } catch (error: any) {
    logger.error({ msg: 'Error getting issue', error: error.message });
    res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
  }
});

/**
 * POST /api/v2/issues - Создание issue
 */
router.post('/', async (req: Request, res: Response) => {
  const subdomain = req.headers.subdomain as string;
  const userUuid = req.headers.user_uuid as string;
  const data = req.body;

  logger.info({ msg: 'POST issue', subdomain });

  try {
    // Валидация обязательных полей
    if (!data.type_uuid || !isValidUuid(data.type_uuid)) {
      return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поле type_uuid обязательно и должно быть валидным UUID', [
        { field: 'type_uuid', message: 'Обязательное поле' }
      ]));
    }
    if (!data.project_uuid || !isValidUuid(data.project_uuid)) {
      return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поле project_uuid обязательно и должно быть валидным UUID', [
        { field: 'project_uuid', message: 'Обязательное поле' }
      ]));
    }
    if (!data.status_uuid || !isValidUuid(data.status_uuid)) {
      return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поле status_uuid обязательно и должно быть валидным UUID', [
        { field: 'status_uuid', message: 'Обязательное поле' }
      ]));
    }

    // Валидация опциональных UUID полей
    if (data.sprint_uuid && !isValidUuid(data.sprint_uuid)) {
      return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'sprint_uuid должен быть валидным UUID'));
    }
    if (data.parent_uuid && !isValidUuid(data.parent_uuid)) {
      return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'parent_uuid должен быть валидным UUID'));
    }
    if (data.author_uuid && !isValidUuid(data.author_uuid)) {
      return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'author_uuid должен быть валидным UUID'));
    }

    // Генерируем UUID если не передан
    const issueUuid = data.uuid && isValidUuid(data.uuid) ? data.uuid : uuidv4();

    // Получаем следующий номер для проекта
    const numQuery = buildGetNextIssueNumQuery(subdomain, data.project_uuid);
    const numResult: any[] = await prisma.$queryRawUnsafe(numQuery);
    const nextNum = numResult[0]?.next_num || 1;

    // Подготавливаем данные для вставки
    const insertData = {
      uuid: issueUuid,
      num: nextNum,
      type_uuid: data.type_uuid,
      project_uuid: data.project_uuid,
      status_uuid: data.status_uuid,
      sprint_uuid: data.sprint_uuid || null,
      author_uuid: userUuid || data.author_uuid || null,
      title: data.title || '',
      description: data.description || '',
      spent_time: data.spent_time || 0,
      parent_uuid: data.parent_uuid || null
    };

    // Используем параметризованный запрос
    const { sql, params } = buildInsertIssueParams(subdomain, insertData);
    await prisma.$executeRawUnsafe(sql, ...params);

    // Обработка field_values если переданы
    if (data.values && Array.isArray(data.values)) {
      for (const fieldValue of data.values) {
        if (fieldValue.field_uuid && isValidUuid(fieldValue.field_uuid) && fieldValue.value !== undefined) {
          const fvUuid = fieldValue.uuid && isValidUuid(fieldValue.uuid) ? fieldValue.uuid : uuidv4();
          await prisma.$executeRawUnsafe(`
            INSERT INTO ${escapeIdentifier(subdomain)}.field_values (uuid, issue_uuid, field_uuid, value)
            VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
            ON CONFLICT (issue_uuid, field_uuid) DO UPDATE SET value = EXCLUDED.value
          `, fvUuid, issueUuid, fieldValue.field_uuid, String(fieldValue.value));
        }
      }
    }

    // Возвращаем созданную issue
    const selectSql = buildIssueByUuidQuery(subdomain, issueUuid);
    const items: any[] = await prisma.$queryRawUnsafe(selectSql);

    res.status(201).json(formatIssue(items[0]));
  } catch (error: any) {
    logger.error({ msg: 'Error creating issue', error: error.message, stack: error.stack });
    res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
  }
});

/**
 * PUT /api/v2/issues/:uuid - Обновление issue (upsert)
 */
router.put('/:uuid', async (req: Request, res: Response) => {
  const subdomain = req.headers.subdomain as string;
  const { uuid } = req.params;
  const data = req.body;

  // Валидация UUID
  if (!isValidUuid(uuid)) {
    return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Некорректный формат UUID'));
  }

  logger.info({ msg: 'PUT issue', subdomain, uuid });

  try {
    // Валидация UUID полей в данных
    if (data.type_uuid && !isValidUuid(data.type_uuid)) {
      return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'type_uuid должен быть валидным UUID'));
    }
    if (data.project_uuid && !isValidUuid(data.project_uuid)) {
      return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'project_uuid должен быть валидным UUID'));
    }
    if (data.status_uuid && !isValidUuid(data.status_uuid)) {
      return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'status_uuid должен быть валидным UUID'));
    }
    if (data.sprint_uuid && !isValidUuid(data.sprint_uuid)) {
      return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'sprint_uuid должен быть валидным UUID'));
    }
    if (data.parent_uuid && !isValidUuid(data.parent_uuid)) {
      return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'parent_uuid должен быть валидным UUID'));
    }
    if (data.author_uuid && !isValidUuid(data.author_uuid)) {
      return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'author_uuid должен быть валидным UUID'));
    }

    // Проверяем существование с параметризованным запросом
    const existing: any[] = await prisma.$queryRawUnsafe(
      `SELECT uuid FROM ${escapeIdentifier(subdomain)}.issues WHERE uuid = $1::uuid`,
      uuid
    );

    if (existing.length === 0) {
      // Создаём новую issue если не существует
      const insertData = { ...data, uuid };
      
      // Получаем следующий номер если нет
      if (!insertData.num && insertData.project_uuid) {
        const numQuery = buildGetNextIssueNumQuery(subdomain, insertData.project_uuid);
        const numResult: any[] = await prisma.$queryRawUnsafe(numQuery);
        insertData.num = numResult[0]?.next_num || 1;
      }

      const { sql, params } = buildInsertIssueParams(subdomain, insertData);
      await prisma.$executeRawUnsafe(sql, ...params);

      const selectSql = buildIssueByUuidQuery(subdomain, uuid);
      const items: any[] = await prisma.$queryRawUnsafe(selectSql);
      return res.status(201).json(formatIssue(items[0]));
    }

    // Обновляем существующую с параметризованным запросом
    const { sql: updateSql, params: updateParams } = buildUpdateIssueParams(subdomain, uuid, data);
    await prisma.$executeRawUnsafe(updateSql, ...updateParams);

    // Обработка field_values если переданы
    if (data.values && Array.isArray(data.values)) {
      for (const fieldValue of data.values) {
        if (fieldValue.field_uuid && isValidUuid(fieldValue.field_uuid) && fieldValue.value !== undefined) {
          const fvUuid = fieldValue.uuid && isValidUuid(fieldValue.uuid) ? fieldValue.uuid : uuidv4();
          await prisma.$executeRawUnsafe(`
            INSERT INTO ${escapeIdentifier(subdomain)}.field_values (uuid, issue_uuid, field_uuid, value)
            VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
            ON CONFLICT (issue_uuid, field_uuid) DO UPDATE SET value = EXCLUDED.value
          `, fvUuid, uuid, fieldValue.field_uuid, String(fieldValue.value));
        }
      }
    }

    // Возвращаем обновлённую issue
    const selectSql = buildIssueByUuidQuery(subdomain, uuid);
    const items: any[] = await prisma.$queryRawUnsafe(selectSql);

    res.status(200).json(formatIssue(items[0]));
  } catch (error: any) {
    logger.error({ msg: 'Error updating issue', error: error.message, stack: error.stack });
    res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
  }
});

/**
 * PATCH /api/v2/issues/:uuid - Частичное обновление
 */
router.patch('/:uuid', async (req: Request, res: Response) => {
  const subdomain = req.headers.subdomain as string;
  const { uuid } = req.params;
  const data = req.body;

  // Валидация UUID
  if (!isValidUuid(uuid)) {
    return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Некорректный формат UUID'));
  }

  logger.info({ msg: 'PATCH issue', subdomain, uuid });

  try {
    // Проверяем существование с параметризованным запросом
    const existing: any[] = await prisma.$queryRawUnsafe(
      `SELECT uuid FROM ${escapeIdentifier(subdomain)}.issues WHERE uuid = $1::uuid AND deleted_at IS NULL`,
      uuid
    );

    if (existing.length === 0) {
      return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Issue не найдена'));
    }

    // Обновляем только переданные поля
    const { sql: updateSql, params: updateParams } = buildUpdateIssueParams(subdomain, uuid, data);
    await prisma.$executeRawUnsafe(updateSql, ...updateParams);

    // Возвращаем обновлённую issue
    const selectSql = buildIssueByUuidQuery(subdomain, uuid);
    const items: any[] = await prisma.$queryRawUnsafe(selectSql);

    res.status(200).json(formatIssue(items[0]));
  } catch (error: any) {
    logger.error({ msg: 'Error patching issue', error: error.message });
    res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
  }
});

/**
 * DELETE /api/v2/issues/:uuid - Soft delete
 */
router.delete('/:uuid', async (req: Request, res: Response) => {
  const subdomain = req.headers.subdomain as string;
  const { uuid } = req.params;

  // Валидация UUID
  if (!isValidUuid(uuid)) {
    return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Некорректный формат UUID'));
  }

  logger.info({ msg: 'DELETE issue', subdomain, uuid });

  try {
    // Soft delete с параметризованным запросом
    const result: any[] = await prisma.$queryRawUnsafe(`
      UPDATE ${escapeIdentifier(subdomain)}.issues
      SET deleted_at = NOW()
      WHERE uuid = $1::uuid AND deleted_at IS NULL
      RETURNING uuid
    `, uuid);

    if (result.length === 0) {
      return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Issue не найдена'));
    }

    res.status(204).send();
  } catch (error: any) {
    logger.error({ msg: 'Error deleting issue', error: error.message });
    res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
  }
});

/**
 * Регистрация роутов для issues-count (отдельный endpoint)
 */
export function registerIssuesCountRoutes(app: any) {
  app.get('/api/v2/issues-count', async (req: Request, res: Response) => {
    const subdomain = req.headers.subdomain as string;
    const { query: encodedQuery } = req.query;

    logger.info({ msg: 'GET issues-count', subdomain, hasQuery: !!encodedQuery });

    try {
      const userQuery = decodeQuery(encodedQuery as string);
      const customFields = await getCustomFields(subdomain);
      const parsedQuery = parseIssueQuery(userQuery, subdomain, customFields);

      // Проверяем ошибки валидации
      if (parsedQuery.validationErrors && parsedQuery.validationErrors.length > 0) {
        logger.warn({
          msg: 'Query validation failed',
          userQuery,
          errors: parsedQuery.validationErrors
        });
        return res.status(400).json(errorResponse(
          req, 
          'VALIDATION_ERROR', 
          'Ошибка в запросе фильтрации',
          parsedQuery.validationErrors.map(e => ({
            field: e.field,
            message: e.message,
            code: e.code
          }))
        ));
      }

      const sql = buildIssuesCountQuery(subdomain, parsedQuery);
      const result: any[] = await prisma.$queryRawUnsafe(sql);

      res.status(200).json({
        count: Number(result[0]?.count || 0)
      });
    } catch (error: any) {
      logger.error({ msg: 'Error counting issues', error: error.message });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
}

/**
 * Регистрация специальных эндпоинтов для поиска issues
 */
export function registerSpecialIssuesRoutes(app: any) {
  // short_issue_info - поиск задач по номеру/названию (для автодополнения)
  app.get('/read_short_issue_info', async (req: Request, res: Response) => {
    const subdomain = req.headers.subdomain as string;
    const like = req.query.like as string || '';

    logger.info({ msg: 'GET short_issue_info', subdomain, like });

    try {
      // Параметризованный запрос для защиты от SQL injection
      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          I.UUID, 
          P.SHORT_NAME || '-' || I.NUM || ' ' || I.TITLE AS name
        FROM ${escapeIdentifier(subdomain)}.ISSUES I
        JOIN ${escapeIdentifier(subdomain)}.PROJECTS P ON P.UUID = I.PROJECT_UUID 
        WHERE I.DELETED_AT IS NULL 
          AND (P.SHORT_NAME || '-' || I.NUM || ' ' || I.TITLE) ILIKE $1
        LIMIT 20
      `, `%${like}%`);

      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error getting short_issue_info', error: error.message });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Ошибка поиска задач'));
    }
  });

  // short_issue_info_for_imort - для импорта
  app.get('/read_short_issue_info_for_imort', async (req: Request, res: Response) => {
    const subdomain = req.headers.subdomain as string;

    logger.info({ msg: 'GET short_issue_info_for_imort', subdomain });

    try {
      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          I.UUID, 
          P.SHORT_NAME || '-' || I.NUM AS full_num,
          I.CREATED_AT, 
          I.UUID
        FROM ${escapeIdentifier(subdomain)}.ISSUES I
        JOIN ${escapeIdentifier(subdomain)}.PROJECTS P ON P.UUID = I.PROJECT_UUID 
        WHERE I.DELETED_AT IS NULL
      `);

      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error getting short_issue_info_for_imort', error: error.message });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения задач для импорта'));
    }
  });

  // issue_uuid - получить UUID задачи по фильтру
  app.get('/read_issue_uuid', async (req: Request, res: Response) => {
    const subdomain = req.headers.subdomain as string;
    const { num, project_uuid } = req.query;

    logger.info({ msg: 'GET issue_uuid', subdomain, num, project_uuid });

    // Валидация project_uuid если передан
    if (project_uuid && !isValidUuid(project_uuid as string)) {
      return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Некорректный формат project_uuid'));
    }

    try {
      let items: any[];
      
      if (num && project_uuid) {
        items = await prisma.$queryRawUnsafe(`
          SELECT UUID FROM ${escapeIdentifier(subdomain)}.ISSUES 
          WHERE DELETED_AT IS NULL AND num = $1 AND project_uuid = $2::uuid
          LIMIT 1
        `, parseInt(num as string), project_uuid);
      } else if (num) {
        items = await prisma.$queryRawUnsafe(`
          SELECT UUID FROM ${escapeIdentifier(subdomain)}.ISSUES 
          WHERE DELETED_AT IS NULL AND num = $1
          LIMIT 1
        `, parseInt(num as string));
      } else if (project_uuid) {
        items = await prisma.$queryRawUnsafe(`
          SELECT UUID FROM ${escapeIdentifier(subdomain)}.ISSUES 
          WHERE DELETED_AT IS NULL AND project_uuid = $1::uuid
          LIMIT 1
        `, project_uuid);
      } else {
        items = await prisma.$queryRawUnsafe(`
          SELECT UUID FROM ${escapeIdentifier(subdomain)}.ISSUES 
          WHERE DELETED_AT IS NULL
          LIMIT 1
        `);
      }

      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error getting issue_uuid', error: error.message });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения UUID задачи'));
    }
  });

  // old_issue_uuid - для старых номеров задач (миграция)
  app.get('/read_old_issue_uuid', async (req: Request, res: Response) => {
    const subdomain = req.headers.subdomain as string;
    const { num, project_uuid } = req.query;

    logger.info({ msg: 'GET old_issue_uuid', subdomain, num, project_uuid });

    // Валидация project_uuid если передан
    if (project_uuid && !isValidUuid(project_uuid as string)) {
      return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Некорректный формат project_uuid'));
    }

    try {
      let items: any[];
      
      if (num && project_uuid) {
        items = await prisma.$queryRawUnsafe(`
          SELECT ISSUE_UUID AS UUID FROM ${escapeIdentifier(subdomain)}.OLD_ISSUES_NUM 
          WHERE DELETED_AT IS NULL AND num = $1 AND project_uuid = $2::uuid
          LIMIT 1
        `, parseInt(num as string), project_uuid);
      } else if (num) {
        items = await prisma.$queryRawUnsafe(`
          SELECT ISSUE_UUID AS UUID FROM ${escapeIdentifier(subdomain)}.OLD_ISSUES_NUM 
          WHERE DELETED_AT IS NULL AND num = $1
          LIMIT 1
        `, parseInt(num as string));
      } else if (project_uuid) {
        items = await prisma.$queryRawUnsafe(`
          SELECT ISSUE_UUID AS UUID FROM ${escapeIdentifier(subdomain)}.OLD_ISSUES_NUM 
          WHERE DELETED_AT IS NULL AND project_uuid = $1::uuid
          LIMIT 1
        `, project_uuid);
      } else {
        items = await prisma.$queryRawUnsafe(`
          SELECT ISSUE_UUID AS UUID FROM ${escapeIdentifier(subdomain)}.OLD_ISSUES_NUM 
          WHERE DELETED_AT IS NULL
          LIMIT 1
        `);
      }

      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error getting old_issue_uuid', error: error.message });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения старого UUID задачи'));
    }
  });
}

export function registerIssuesRoutes(app: any, sharedPrisma?: PrismaClient) {
  // Use shared prisma if provided
  if (sharedPrisma) {
    prisma = sharedPrisma;
  } else {
    prisma = new PrismaClient();
  }
  
  app.use(basePath, router);
  registerIssuesCountRoutes(app);
  registerSpecialIssuesRoutes(app);
  
  logger.info({ msg: 'Issues routes registered', basePath });
}

export default router;

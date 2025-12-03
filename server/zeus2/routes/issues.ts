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
import { v4 as uuidv4 } from 'uuid';
import { FieldMapping } from '@unkaos/query-lang';
import { createLogger } from '../../common/logging';
import { decodeQuery, parseIssueQuery } from '../utils/issue-query-parser';
import {
  buildIssuesListQuery,
  buildIssueByUuidQuery,
  buildIssuesCountQuery,
  buildInsertIssueQuery,
  buildUpdateIssueQuery,
  buildDeleteIssueQuery,
  buildGetNextIssueNumQuery
} from '../utils/issue-query-builder';

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
    const fields: any[] = await prisma.$queryRawUnsafe(`
      SELECT F.name, F.uuid, FT.code as type_code
      FROM "${subdomain}".fields F
      JOIN "${subdomain}".field_types FT ON F.type_uuid = FT.uuid
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

  logger.info({ msg: 'POST issue', subdomain, data });

  try {
    // Валидация обязательных полей
    if (!data.type_uuid) {
      return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поле type_uuid обязательно', [
        { field: 'type_uuid', message: 'Обязательное поле' }
      ]));
    }
    if (!data.project_uuid) {
      return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поле project_uuid обязательно', [
        { field: 'project_uuid', message: 'Обязательное поле' }
      ]));
    }
    if (!data.status_uuid) {
      return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поле status_uuid обязательно', [
        { field: 'status_uuid', message: 'Обязательное поле' }
      ]));
    }

    // Генерируем UUID если не передан
    const issueUuid = data.uuid || uuidv4();

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

    const insertSql = buildInsertIssueQuery(subdomain, insertData);
    await prisma.$executeRawUnsafe(insertSql);

    // Обработка field_values если переданы
    if (data.values && Array.isArray(data.values)) {
      for (const fieldValue of data.values) {
        if (fieldValue.field_uuid && fieldValue.value !== undefined) {
          const fvUuid = fieldValue.uuid || uuidv4();
          await prisma.$executeRawUnsafe(`
            INSERT INTO "${subdomain}".field_values (uuid, issue_uuid, field_uuid, value)
            VALUES ('${fvUuid}', '${issueUuid}', '${fieldValue.field_uuid}', '${String(fieldValue.value).replace(/'/g, "''")}')
            ON CONFLICT (issue_uuid, field_uuid) DO UPDATE SET value = EXCLUDED.value
          `);
        }
      }
    }

    // Возвращаем созданную issue
    const sql = buildIssueByUuidQuery(subdomain, issueUuid);
    const items: any[] = await prisma.$queryRawUnsafe(sql);

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

  logger.info({ msg: 'PUT issue', subdomain, uuid, data });

  try {
    // Проверяем существование
    const checkSql = `SELECT uuid FROM "${subdomain}".issues WHERE uuid = '${uuid}'`;
    const existing: any[] = await prisma.$queryRawUnsafe(checkSql);

    if (existing.length === 0) {
      // Создаём новую issue если не существует
      const insertData = { ...data, uuid };
      
      // Получаем следующий номер если нет
      if (!insertData.num && insertData.project_uuid) {
        const numQuery = buildGetNextIssueNumQuery(subdomain, insertData.project_uuid);
        const numResult: any[] = await prisma.$queryRawUnsafe(numQuery);
        insertData.num = numResult[0]?.next_num || 1;
      }

      const insertSql = buildInsertIssueQuery(subdomain, insertData);
      await prisma.$executeRawUnsafe(insertSql);

      const sql = buildIssueByUuidQuery(subdomain, uuid);
      const items: any[] = await prisma.$queryRawUnsafe(sql);
      return res.status(201).json(formatIssue(items[0]));
    }

    // Обновляем существующую
    const updateSql = buildUpdateIssueQuery(subdomain, uuid, data);
    await prisma.$executeRawUnsafe(updateSql);

    // Обработка field_values если переданы
    if (data.values && Array.isArray(data.values)) {
      for (const fieldValue of data.values) {
        if (fieldValue.field_uuid && fieldValue.value !== undefined) {
          const fvUuid = fieldValue.uuid || uuidv4();
          await prisma.$executeRawUnsafe(`
            INSERT INTO "${subdomain}".field_values (uuid, issue_uuid, field_uuid, value)
            VALUES ('${fvUuid}', '${uuid}', '${fieldValue.field_uuid}', '${String(fieldValue.value).replace(/'/g, "''")}')
            ON CONFLICT (issue_uuid, field_uuid) DO UPDATE SET value = EXCLUDED.value
          `);
        }
      }
    }

    // Возвращаем обновлённую issue
    const sql = buildIssueByUuidQuery(subdomain, uuid);
    const items: any[] = await prisma.$queryRawUnsafe(sql);

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

  logger.info({ msg: 'PATCH issue', subdomain, uuid });

  try {
    // Проверяем существование
    const checkSql = `SELECT uuid FROM "${subdomain}".issues WHERE uuid = '${uuid}' AND deleted_at IS NULL`;
    const existing: any[] = await prisma.$queryRawUnsafe(checkSql);

    if (existing.length === 0) {
      return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Issue не найдена'));
    }

    // Обновляем только переданные поля
    const updateSql = buildUpdateIssueQuery(subdomain, uuid, data);
    await prisma.$executeRawUnsafe(updateSql);

    // Возвращаем обновлённую issue
    const sql = buildIssueByUuidQuery(subdomain, uuid);
    const items: any[] = await prisma.$queryRawUnsafe(sql);

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

  logger.info({ msg: 'DELETE issue', subdomain, uuid });

  try {
    const deleteSql = buildDeleteIssueQuery(subdomain, uuid);
    const result: any[] = await prisma.$queryRawUnsafe(deleteSql);

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
      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          I.UUID, 
          P.SHORT_NAME || '-' || I.NUM || ' ' || I.TITLE AS name
        FROM "${subdomain}".ISSUES I
        JOIN "${subdomain}".PROJECTS P ON P.UUID = I.PROJECT_UUID 
        WHERE I.DELETED_AT IS NULL 
          AND (P.SHORT_NAME || '-' || I.NUM || ' ' || I.TITLE) ILIKE '%${like.replace(/'/g, "''")}%'
        LIMIT 20
      `);

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
        FROM "${subdomain}".ISSUES I
        JOIN "${subdomain}".PROJECTS P ON P.UUID = I.PROJECT_UUID 
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

    try {
      let whereClause = `WHERE DELETED_AT IS NULL`;
      if (num) {
        whereClause += ` AND num = ${num}`;
      }
      if (project_uuid) {
        whereClause += ` AND project_uuid = '${project_uuid}'`;
      }

      const items = await prisma.$queryRawUnsafe(`
        SELECT UUID FROM "${subdomain}".ISSUES ${whereClause} LIMIT 1
      `);

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

    try {
      let whereClause = `WHERE DELETED_AT IS NULL`;
      if (num) {
        whereClause += ` AND num = ${num}`;
      }
      if (project_uuid) {
        whereClause += ` AND project_uuid = '${project_uuid}'`;
      }

      const items = await prisma.$queryRawUnsafe(`
        SELECT ISSUE_UUID AS UUID FROM "${subdomain}".OLD_ISSUES_NUM ${whereClause} LIMIT 1
      `);

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


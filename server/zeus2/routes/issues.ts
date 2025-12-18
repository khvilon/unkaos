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
import axios from 'axios';
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

// URL Athena для исправления запросов через ИИ
const ATHENA_URL = process.env.ATHENA_URL || 'http://athena:5010';

/**
 * Попытка исправить невалидный запрос через ИИ (Athena)
 * @returns исправленный запрос или null если ИИ не смог исправить
 */
async function tryFixQueryWithAI(userQuery: string, subdomain: string): Promise<string | null> {
  try {
    logger.info({ msg: 'Trying to fix query with AI', userQuery, subdomain });
    
    const response = await axios.post(`${ATHENA_URL}/gpt`, {
      userInput: `Найди задачи ${userQuery}`,
      command: 'find_issues'
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data?.humanGpt?.filter) {
      logger.info({ 
        msg: 'AI fixed query successfully', 
        original: userQuery, 
        fixed: response.data.humanGpt.filter 
      });
      return response.data.humanGpt.filter;
    }

    logger.warn({ msg: 'AI could not fix query', userQuery });
    return null;
  } catch (error: any) {
    logger.error({ msg: 'AI query fix failed', error: error.message, userQuery });
    return null;
  }
}

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

import { getCache } from '../index';

function mapFieldType(code: string): string {
  switch (code) {
    case 'Numeric': return 'number';
    case 'Boolean': return 'boolean';
    case 'Date': 
    case 'Timestamp': return 'date';
    default: return 'string';
  }
}

/**
 * Получить кастомные поля (использует Redis кеш через Ossa)
 */
async function getCustomFields(subdomain: string): Promise<FieldMapping[]> {
  const cache = getCache();
  
  // Пробуем получить из кеша
  if (cache) {
    try {
      const cachedFields = await cache.getFields(subdomain);
      if (cachedFields && cachedFields.length > 0) {
        const customFields = cachedFields.filter((f: any) => f.is_custom);
        return customFields.map((f: any) => ({
          name: f.name,
          field: 'value',
          type: mapFieldType(f.type_code),
          source: 'custom',
          uuid: f.uuid
        }));
      }
    } catch (cacheErr) {
      logger.warn({ msg: 'Cache miss for custom fields', error: cacheErr });
    }
  }

  // Fallback на БД
  try {
    const fields: any[] = await prisma.$queryRawUnsafe(`
      SELECT F.name, F.uuid, FT.code as type_code
      FROM ${escapeIdentifier(subdomain)}.fields F
      JOIN ${escapeIdentifier(subdomain)}.field_types FT ON F.type_uuid = FT.uuid
      WHERE F.is_custom = true
    `);

    return fields.map(f => ({
      name: f.name,
      field: 'value',
      type: mapFieldType(f.type_code),
      source: 'custom',
      uuid: f.uuid
    }));
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
    let userQuery = decodeQuery(encodedQuery as string);
    const customFields = await getCustomFields(subdomain);
    let parsedQuery = parseIssueQuery(userQuery, subdomain, customFields);

    // Проверяем ошибки валидации
    if (parsedQuery.validationErrors && parsedQuery.validationErrors.length > 0) {
      logger.warn({
        msg: 'Query validation failed, trying AI fix',
        userQuery,
        errors: parsedQuery.validationErrors
      });

      // Пробуем исправить через ИИ
      const fixedQuery = await tryFixQueryWithAI(userQuery, subdomain);
      
      if (fixedQuery) {
        // ИИ вернул исправленный запрос — перевалидируем
        const revalidatedQuery = parseIssueQuery(fixedQuery, subdomain, customFields);
        
        if (!revalidatedQuery.validationErrors || revalidatedQuery.validationErrors.length === 0) {
          // Исправленный запрос валиден — используем его
          logger.info({ msg: 'Using AI-fixed query', original: userQuery, fixed: fixedQuery });
          userQuery = fixedQuery;
          parsedQuery = revalidatedQuery;
        } else {
          // ИИ вернул невалидный запрос
          logger.warn({ msg: 'AI-fixed query still invalid', fixedQuery, errors: revalidatedQuery.validationErrors });
          return res.status(400).json(errorResponse(
            req, 
            'VALIDATION_ERROR', 
            'Не удалось распознать запрос. Проверьте правильность написания полей и значений.',
            parsedQuery.validationErrors.map(e => ({
              field: e.field,
              message: e.message,
              code: e.code
            }))
          ));
        }
      } else {
        // ИИ не смог исправить
        return res.status(400).json(errorResponse(
          req, 
          'VALIDATION_ERROR', 
          'Ошибка в запросе фильтрации. ИИ не смог исправить запрос автоматически.',
          parsedQuery.validationErrors.map(e => ({
            field: e.field,
            message: e.message,
            code: e.code
          }))
        ));
      }
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
    
    // Анализируем ошибку для понятного сообщения
    const errorMsg = error.message || '';
    
    // Ошибки PostgreSQL связанные с запросом
    if (errorMsg.includes('column') && errorMsg.includes('does not exist')) {
      // Неизвестное поле в запросе
      const columnMatch = errorMsg.match(/column "([^"]+)" does not exist/);
      const fieldName = columnMatch ? columnMatch[1] : 'неизвестное поле';
      return res.status(400).json(errorResponse(
        req, 
        'QUERY_ERROR', 
        `Поле "${fieldName}" не найдено. Проверьте правильность написания.`
      ));
    }
    
    if (errorMsg.includes('syntax error') || errorMsg.includes('invalid input syntax')) {
      return res.status(400).json(errorResponse(
        req, 
        'QUERY_ERROR', 
        'Ошибка синтаксиса в запросе фильтрации. Проверьте правильность запроса.'
      ));
    }
    
    if (errorMsg.includes('invalid input value') || errorMsg.includes('invalid')) {
      return res.status(400).json(errorResponse(
        req, 
        'QUERY_ERROR', 
        'Некорректное значение в запросе фильтрации. Проверьте типы данных.'
      ));
    }
    
    // Общая ошибка
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

    // Возвращаем массив в rows для совместимости с фронтендом
    res.status(200).json({ rows: [formatIssue(items[0])] });
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
    
    // Если status_uuid не передан - получаем начальный статус из workflow
    let statusUuid = data.status_uuid;
    if (!statusUuid || !isValidUuid(statusUuid)) {
      const initialStatusQuery = `
        SELECT ist.uuid 
        FROM ${escapeIdentifier(subdomain)}.issue_types it
        JOIN ${escapeIdentifier(subdomain)}.workflow_nodes wn ON wn.workflows_uuid = it.workflow_uuid AND wn.deleted_at IS NULL
        JOIN ${escapeIdentifier(subdomain)}.issue_statuses ist ON ist.uuid = wn.issue_statuses_uuid AND ist.is_start = true
        WHERE it.uuid = $1::uuid AND it.deleted_at IS NULL
        LIMIT 1
      `;
      const statusResult: any[] = await prisma.$queryRawUnsafe(initialStatusQuery, data.type_uuid);
      
      if (!statusResult || statusResult.length === 0 || !statusResult[0]?.uuid) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Не удалось определить начальный статус для данного типа задачи. Проверьте настройки workflow.', [
          { field: 'status_uuid', message: 'Начальный статус не найден' }
        ]));
      }
      statusUuid = statusResult[0].uuid;
      logger.info({ msg: 'Auto-resolved initial status', subdomain, typeUuid: data.type_uuid, statusUuid });
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
      status_uuid: statusUuid,
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
            ON CONFLICT (issue_uuid, field_uuid) WHERE deleted_at IS NULL
            DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
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
            ON CONFLICT (issue_uuid, field_uuid) WHERE deleted_at IS NULL
            DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
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

  // issue_uuid - получить UUID задачи по фильтру (REST и legacy пути)
  const issueUuidHandler = async (req: Request, res: Response) => {
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
  };
  app.get('/api/v2/issue-uuid', issueUuidHandler);
  app.get('/read_issue_uuid', issueUuidHandler);

  // old_issue_uuid - для старых номеров задач (миграция) (REST и legacy пути)
  const oldIssueUuidHandler = async (req: Request, res: Response) => {
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
  };
  app.get('/api/v2/old-issue-uuid', oldIssueUuidHandler);
  app.get('/read_old_issue_uuid', oldIssueUuidHandler);
}

export function registerIssuesRoutes(app: any, sharedPrisma?: PrismaClient) {
  // Use shared prisma if provided
  if (sharedPrisma) {
    prisma = sharedPrisma;
  } else {
    prisma = new PrismaClient();
  }
  
  app.use(basePath, router);
  // Алиас для единственного числа (legacy compatibility)
  app.use('/api/v2/issue', router);
  registerIssuesCountRoutes(app);
  registerSpecialIssuesRoutes(app);
  
  logger.info({ msg: 'Issues routes registered', basePath, alias: '/api/v2/issue' });
}

export default router;

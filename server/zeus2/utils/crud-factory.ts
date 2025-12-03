/**
 * CRUD Factory - генератор типовых CRUD роутов
 * 
 * Устраняет дублирование кода и обеспечивает:
 * - Параметризованные SQL запросы (защита от SQL injection)
 * - Единообразную обработку ошибок
 * - Типизацию
 * - Валидацию входных данных
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { createLogger } from '../../common/logging';

// ==================== TYPES ====================

export interface CrudConfig {
  /** Название сущности (таблицы) */
  entity: string;
  /** Название в единственном числе (для API путей) */
  singular?: string;
  /** Список полей для SELECT */
  fields: string[];
  /** Поля, которые можно обновлять */
  updatableFields?: string[];
  /** Обязательные поля при создании */
  requiredFields?: string[];
  /** Поля с типом UUID для валидации */
  uuidFields?: string[];
  /** Связи для JOIN */
  relations?: CrudRelation[];
  /** Использовать soft delete (deleted_at) */
  softDelete?: boolean;
  /** Название колонки для soft delete (по умолчанию deleted_at) */
  deletedAtColumn?: string;
  /** Сортировка по умолчанию */
  defaultOrder?: string;
  /** Кастомные WHERE условия для списка */
  listWhere?: (req: Request, schema: string) => string;
}

export interface CrudRelation {
  /** Название связанной таблицы */
  table: string;
  /** Алиас для JOIN */
  alias: string;
  /** Поле для JOIN */
  foreignKey: string;
  /** Поля для SELECT из связанной таблицы */
  selectFields: { field: string; as: string }[];
  /** Если true, создаёт массив объектов для совместимости с фронтендом */
  asArray?: boolean;
  /** Имя поля массива (по умолчанию - название таблицы) */
  arrayFieldName?: string;
}

export interface Listener {
  method: string;
  func: string;
  entity: string;
}

export interface ApiError {
  code: string;
  message: string;
  trace_id: string;
  details: { field?: string; message: string }[];
}

// ==================== HELPERS ====================

/**
 * Создаёт стандартный ответ об ошибке
 */
export function createErrorResponse(
  req: Request,
  code: string,
  message: string,
  details: { field?: string; message: string }[] = []
): ApiError {
  return {
    code,
    message,
    trace_id: (req.headers['x-trace-id'] as string) || '',
    details
  };
}

/**
 * Валидирует UUID
 */
export function isValidUuid(value: string): boolean {
  return uuidValidate(value);
}

/**
 * Экранирует идентификатор для SQL (название схемы, таблицы, колонки)
 * Защита от SQL injection в идентификаторах
 */
export function escapeIdentifier(identifier: string): string {
  // Разрешаем только буквы, цифры, подчёркивания и дефисы
  if (!/^[a-zA-Z0-9_-]+$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

/**
 * Строит SELECT часть запроса
 */
function buildSelectFields(config: CrudConfig, schema: string): string {
  const mainFields = config.fields.map(f => `${escapeIdentifier('T')}.${escapeIdentifier(f)}`);
  
  // Добавляем table_name
  mainFields.unshift(`'${config.entity}' AS table_name`);
  
  // Добавляем поля из связей
  if (config.relations) {
    for (const rel of config.relations) {
      for (const sf of rel.selectFields) {
        mainFields.push(`${escapeIdentifier(rel.alias)}.${escapeIdentifier(sf.field)} AS ${escapeIdentifier(sf.as)}`);
      }
    }
  }
  
  return mainFields.join(', ');
}

/**
 * Строит JOIN часть запроса
 */
function buildJoins(config: CrudConfig, schema: string): string {
  if (!config.relations || config.relations.length === 0) return '';
  
  return config.relations.map(rel => 
    `LEFT JOIN ${escapeIdentifier(schema)}.${escapeIdentifier(rel.table)} ${escapeIdentifier(rel.alias)} ` +
    `ON ${escapeIdentifier(rel.alias)}.uuid = ${escapeIdentifier('T')}.${escapeIdentifier(rel.foreignKey)}`
  ).join(' ');
}

// ==================== CRUD FACTORY ====================

/**
 * Создаёт CRUD роуты для сущности
 */
export function createCrudRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string,
  config: CrudConfig
) {
  const logger = createLogger(`zeus2:${config.entity}`);
  const router = Router();
  const entityName = config.entity;
  const singularName = config.singular || entityName.replace(/s$/, '');
  
  // ==================== GET LIST ====================
  
  async function getList(req: Request, res: Response) {
    const schema = req.headers.subdomain as string;
    
    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain header required'));
    }
    
    logger.info({ msg: `GET ${entityName}`, schema });
    
    try {
      const selectFields = buildSelectFields(config, schema);
      const joins = buildJoins(config, schema);
      
      const deletedAtCol = config.deletedAtColumn || 'deleted_at';
      let whereClause = config.softDelete !== false ? `WHERE ${escapeIdentifier('T')}.${escapeIdentifier(deletedAtCol)} IS NULL` : 'WHERE TRUE';
      
      // Добавляем кастомные условия
      if (config.listWhere) {
        whereClause += ` AND ${config.listWhere(req, schema)}`;
      }
      
      const orderBy = config.defaultOrder || 'created_at DESC';
      
      // Обрабатываем ORDER BY - может содержать несколько полей
      const orderByClause = orderBy.split(',').map(part => {
        const trimmed = part.trim();
        const [field, direction] = trimmed.split(/\s+/);
        return `${escapeIdentifier('T')}.${escapeIdentifier(field)} ${direction || 'ASC'}`;
      }).join(', ');
      
      const sql = `
        SELECT ${selectFields}
        FROM ${escapeIdentifier(schema)}.${escapeIdentifier(entityName)} ${escapeIdentifier('T')}
        ${joins}
        ${whereClause}
        ORDER BY ${orderByClause}
      `;
      
      const items: any[] = await prisma.$queryRawUnsafe(sql);
      
      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: `Error getting ${entityName}`, error: error.message, stack: error.stack });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', `Ошибка получения ${entityName}`));
    }
  }
  
  // ==================== GET BY UUID ====================
  
  async function getByUuid(req: Request, res: Response) {
    const schema = req.headers.subdomain as string;
    const { uuid } = req.params;
    
    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain header required'));
    }
    
    if (!isValidUuid(uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Invalid UUID format', [
        { field: 'uuid', message: 'Некорректный формат UUID' }
      ]));
    }
    
    logger.info({ msg: `GET ${singularName}`, schema, uuid });
    
    try {
      const selectFields = buildSelectFields(config, schema);
      const joins = buildJoins(config, schema);
      
      const deletedAtCol = config.deletedAtColumn || 'deleted_at';
      const deleteCondition = config.softDelete !== false ? `AND "T".${escapeIdentifier(deletedAtCol)} IS NULL` : '';
      
      const sql = `
        SELECT ${selectFields}
        FROM ${escapeIdentifier(schema)}.${escapeIdentifier(entityName)} "T"
        ${joins}
        WHERE "T".uuid = $1::uuid ${deleteCondition}
      `;
      
      const items: any[] = await prisma.$queryRawUnsafe(sql, uuid);
      
      if (items.length === 0) {
        return res.status(404).json(createErrorResponse(req, 'NOT_FOUND', `${singularName} не найден`));
      }
      
      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: `Error getting ${singularName}`, error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', `Ошибка получения ${singularName}`));
    }
  }
  
  // ==================== CREATE ====================
  
  async function create(req: Request, res: Response) {
    const schema = req.headers.subdomain as string;
    const data = req.body;
    
    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain header required'));
    }
    
    // Валидация обязательных полей
    const validationErrors: { field: string; message: string }[] = [];
    
    if (config.requiredFields) {
      for (const field of config.requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
          validationErrors.push({ field, message: `Поле ${field} обязательно` });
        }
      }
    }
    
    // Валидация UUID полей
    if (config.uuidFields) {
      for (const field of config.uuidFields) {
        if (data[field] && !isValidUuid(data[field])) {
          validationErrors.push({ field, message: `Поле ${field} должно быть валидным UUID` });
        }
      }
    }
    
    if (validationErrors.length > 0) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Ошибка валидации', validationErrors));
    }
    
    const uuid = data.uuid && isValidUuid(data.uuid) ? data.uuid : uuidv4();
    
    logger.info({ msg: `POST ${singularName}`, schema, uuid });
    
    try {
      // Строим INSERT с параметрами
      const deletedAtCol = config.deletedAtColumn || 'deleted_at';
      const insertFields = config.fields.filter(f => f !== 'uuid' && f !== 'created_at' && f !== 'updated_at' && f !== deletedAtCol);
      const columns = ['uuid', ...insertFields, 'created_at', 'updated_at'];
      
      const values: any[] = [uuid];
      for (const field of insertFields) {
        values.push(data[field] ?? null);
      }
      
      // Генерируем placeholders с учётом UUID полей
      const placeholders = columns.map((col, i) => {
        if (i >= columns.length - 2) return 'NOW()'; // created_at, updated_at
        if (col === 'uuid' || config.uuidFields?.includes(col)) {
          return `$${i + 1}::uuid`;
        }
        return `$${i + 1}`;
      }).join(', ');
      const columnNames = columns.map(c => escapeIdentifier(c)).join(', ');
      
      await prisma.$executeRawUnsafe(
        `INSERT INTO ${escapeIdentifier(schema)}.${escapeIdentifier(entityName)} (${columnNames}) VALUES (${placeholders})`,
        ...values
      );
      
      // Возвращаем созданную запись
      req.params = { uuid };
      await getByUuid(req, res);
      
    } catch (error: any) {
      logger.error({ msg: `Error creating ${singularName}`, error: error.message, stack: error.stack });
      
      // Проверяем на дубликат
      if (error.code === '23505') {
        return res.status(409).json(createErrorResponse(req, 'CONFLICT', 'Запись уже существует'));
      }
      
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', `Ошибка создания ${singularName}`));
    }
  }
  
  // ==================== UPDATE ====================
  
  async function update(req: Request, res: Response) {
    const schema = req.headers.subdomain as string;
    const { uuid } = req.params;
    const data = req.body;
    
    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain header required'));
    }
    
    if (!isValidUuid(uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Invalid UUID format'));
    }
    
    // Валидация UUID полей
    if (config.uuidFields) {
      for (const field of config.uuidFields) {
        if (data[field] && !isValidUuid(data[field])) {
          return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Ошибка валидации', [
            { field, message: `Поле ${field} должно быть валидным UUID` }
          ]));
        }
      }
    }
    
    logger.info({ msg: `PUT ${singularName}`, schema, uuid });
    
    try {
      const updateFields = config.updatableFields || config.fields.filter(f => 
        !['uuid', 'created_at', 'updated_at', 'deleted_at', 'author_uuid'].includes(f)
      );
      
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      for (const field of updateFields) {
        if (data[field] !== undefined) {
          // Приводим UUID поля к типу uuid
          const isUuidField = config.uuidFields?.includes(field);
          if (isUuidField) {
            setClauses.push(`${escapeIdentifier(field)} = $${paramIndex}::uuid`);
          } else {
            setClauses.push(`${escapeIdentifier(field)} = $${paramIndex}`);
          }
          values.push(data[field]);
          paramIndex++;
        }
      }
      
      if (setClauses.length === 0) {
        return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Нет полей для обновления'));
      }
      
      setClauses.push('updated_at = NOW()');
      values.push(uuid);
      
      const result = await prisma.$executeRawUnsafe(
        `UPDATE ${escapeIdentifier(schema)}.${escapeIdentifier(entityName)} 
         SET ${setClauses.join(', ')} 
         WHERE uuid = $${paramIndex}::uuid`,
        ...values
      );
      
      if (result === 0) {
        return res.status(404).json(createErrorResponse(req, 'NOT_FOUND', `${singularName} не найден`));
      }
      
      // Возвращаем обновлённую запись
      await getByUuid(req, res);
      
    } catch (error: any) {
      logger.error({ msg: `Error updating ${singularName}`, error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', `Ошибка обновления ${singularName}`));
    }
  }
  
  // ==================== DELETE ====================
  
  async function remove(req: Request, res: Response) {
    const schema = req.headers.subdomain as string;
    const { uuid } = req.params;
    
    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain header required'));
    }
    
    if (!isValidUuid(uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Invalid UUID format'));
    }
    
    logger.info({ msg: `DELETE ${singularName}`, schema, uuid });
    
    try {
      let result: number;
      const deletedAtCol = config.deletedAtColumn || 'deleted_at';
      
      if (config.softDelete !== false) {
        result = await prisma.$executeRawUnsafe(`
          UPDATE ${escapeIdentifier(schema)}.${escapeIdentifier(entityName)}
          SET ${escapeIdentifier(deletedAtCol)} = NOW()
          WHERE uuid = $1::uuid AND ${escapeIdentifier(deletedAtCol)} IS NULL
        `, uuid);
      } else {
        result = await prisma.$executeRawUnsafe(`
          DELETE FROM ${escapeIdentifier(schema)}.${escapeIdentifier(entityName)}
          WHERE uuid = $1::uuid
        `, uuid);
      }
      
      if (result === 0) {
        return res.status(404).json(createErrorResponse(req, 'NOT_FOUND', `${singularName} не найден`));
      }
      
      res.status(204).send();
      
    } catch (error: any) {
      logger.error({ msg: `Error deleting ${singularName}`, error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', `Ошибка удаления ${singularName}`));
    }
  }
  
  // ==================== REGISTER ROUTES ====================
  
  router.get('/', getList);
  router.get('/:uuid', getByUuid);
  router.post('/', create);
  router.put('/:uuid', update);
  router.patch('/:uuid', update);
  router.delete('/:uuid', remove);
  
  // Use kebab-case for REST paths (field_types -> field-types)
  const restEntityName = entityName.replace(/_/g, '-');
  app.use(`${apiPrefix}/${restEntityName}`, router);
  
  // Регистрируем listeners для Gateway
  listeners.push({ method: 'get', func: `read_${entityName}`, entity: entityName });
  listeners.push({ method: 'get', func: `read_${singularName}`, entity: singularName });
  listeners.push({ method: 'post', func: `create_${entityName}`, entity: entityName });
  listeners.push({ method: 'post', func: `upsert_${entityName}`, entity: entityName });
  listeners.push({ method: 'post', func: `upsert_${singularName}`, entity: singularName });
  listeners.push({ method: 'put', func: `update_${entityName}`, entity: entityName });
  listeners.push({ method: 'delete', func: `delete_${entityName}`, entity: entityName });
  
  logger.info({ msg: `${entityName} routes registered` });
  
  return { router, getList, getByUuid, create, update, remove };
}





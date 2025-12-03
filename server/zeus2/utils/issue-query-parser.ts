/**
 * Issue Query Parser
 * 
 * Использует @unkaos/query-lang (Chevrotain) для парсинга JQL-подобных запросов
 * 
 * Формат запросов:
 * - Проект = 'Основной проект'
 * - Статус != Решенные
 * - Проект = 'A' AND Статус != Решенные
 * - Создана > '2024-01-01' ORDER BY Создана DESC
 */

import { 
  parseQuery, 
  generateSQL, 
  decodeBase64Query, 
  normalizeQuery, 
  validateQuery,
  FieldMapping, 
  SQLGeneratorContext,
  ValidationError 
} from '@unkaos/query-lang';
import { createLogger } from '../../common/logging';

const logger = createLogger('zeus2:issue-query-parser');

export interface ParsedQuery {
  whereClause: string;
  orderByClause: string;
  validationErrors?: ValidationError[];
}

/**
 * Декодирует base64 запрос
 */
export function decodeQuery(encodedQuery: string): string {
  if (!encodedQuery || encodedQuery.trim() === '') {
    return '';
  }
  return decodeBase64Query(encodedQuery);
}

/**
 * Парсит и трансформирует запрос фильтрации
 * Использует Chevrotain парсер для JQL-подобного синтаксиса
 * 
 * @param userQuery - уже декодированный запрос (plain text)
 * @param subdomain - схема БД
 * @param customFields - дополнительные маппинги полей
 */
export function parseIssueQuery(
  userQuery: string, 
  subdomain: string,
  customFields?: FieldMapping[]
): ParsedQuery {
  if (!userQuery || userQuery.trim() === '') {
    return { whereClause: ' TRUE ', orderByClause: '' };
  }

  try {
    // Нормализуем запрос (убираем неразрывные пробелы и т.д.)
    const normalized = normalizeQuery(userQuery);
    logger.debug({ msg: 'Normalized query', query: normalized });
    
    // Парсим в AST
    const parseResult = parseQuery(normalized);
    
    if (!parseResult.success || !parseResult.ast) {
      logger.error({ msg: 'Parse errors', errors: parseResult.errors });
      // Возвращаем ошибки парсинга как ошибки валидации
      return { 
        whereClause: ' TRUE ', 
        orderByClause: '',
        validationErrors: parseResult.errors.map(e => ({
          code: 'PARSE_ERROR',
          message: e.message
        }))
      };
    }
    
    // Валидируем AST (проверка типов)
    const validation = validateQuery(parseResult.ast, customFields);
    
    if (!validation.valid) {
      logger.error({ msg: 'Validation errors', errors: validation.errors });
      return {
        whereClause: ' TRUE ',
        orderByClause: '',
        validationErrors: validation.errors
      };
    }
    
    // Генерируем SQL
    const context: SQLGeneratorContext = {
      subdomain,
      tableAlias: 'I',
      fieldMappings: customFields || []
    };
    
    const sql = generateSQL(parseResult.ast, context);
    
    logger.debug({ 
      msg: 'Query parsed successfully',
      input: normalized,
      whereClause: sql.whereClause,
      orderByClause: sql.orderByClause
    });
    
    return {
      whereClause: sql.whereClause || ' TRUE ',
      orderByClause: sql.orderByClause || '',
      validationErrors: validation.warnings.length > 0 ? undefined : undefined // warnings не блокируют
    };
    
  } catch (error: any) {
    logger.error({ msg: 'Exception during query parsing', error: error.message, stack: error.stack });
    return { 
      whereClause: ' TRUE ', 
      orderByClause: '',
      validationErrors: [{
        code: 'INTERNAL_ERROR',
        message: 'Внутренняя ошибка при обработке запроса'
      }]
    };
  }
}

/**
 * Экранирование строк для SQL (базовая защита от инъекций)
 * @deprecated Используйте параметризованные запросы вместо экранирования
 */
export function escapeSqlString(value: string): string {
  if (typeof value !== 'string') return value;
  return value.replace(/'/g, "''");
}

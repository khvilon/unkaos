/**
 * Issue Query Language (IQL)
 * 
 * JQL-подобный язык запросов для фильтрации issues
 * 
 * Примеры запросов:
 * - Проект = 'Основной проект'
 * - Статус != Решенные
 * - Проект = 'A' AND Статус != Решенные
 * - Создана > '2024-01-01' ORDER BY Создана DESC
 * - Название like '%test%'
 * 
 * Поддержка русских операторов:
 * - И → AND
 * - ИЛИ → OR
 * - НЕ → NOT
 * - СОРТИРОВАТЬ ПО → ORDER BY
 * - СОДЕРЖИТ → LIKE
 */

// ============================================
// Экспорт токенов
// ============================================

export {
  QueryLexer,
  allTokens,
  tokenVocabulary
} from './tokens';

// ============================================
// Экспорт типов AST
// ============================================

export {
  // Типы узлов
  ASTNodeType,
  ComparisonOperator,
  LogicalOperator,
  ValueType,
  FieldSource,
  SortDirection,
  
  // Интерфейсы узлов
  BaseNode,
  QueryNode,
  FilterNode,
  LogicalNode,
  NotNode,
  ComparisonNode,
  FieldNode,
  ValueNode,
  ListNode,
  OrderByNode,
  
  // Результаты
  ParseError,
  ParseResult,
  
  // Контекст
  FieldMapping,
  SQLGeneratorContext,
  
  // Фабричные функции
  createQueryNode,
  createLogicalNode,
  createNotNode,
  createComparisonNode,
  createFieldNode,
  createValueNode,
  createListNode,
  createOrderByNode
} from './ast';

// ============================================
// Экспорт парсера
// ============================================

export { parseQuery } from './parser';

// ============================================
// Экспорт SQL генератора
// ============================================

export {
  SQLGenerator,
  SQLGenerationResult,
  DEFAULT_ISSUE_FIELDS,
  generateSQL
} from './sql-generator';

// ============================================
// Экспорт декодера
// ============================================

export {
  decodeBase64Query,
  normalizeQuery,
  prepareQueryForParsing
} from './decoder';

// ============================================
// Экспорт автокомплита
// ============================================

export {
  SuggestionType,
  Suggestion,
  AutocompleteContext,
  QueryState,
  detectQueryState,
  getSuggestions,
  validateQuerySyntax
} from './autocomplete';

// ============================================
// Экспорт валидатора
// ============================================

export {
  ValidationError,
  ValidationResult,
  QueryValidator,
  validateQuery
} from './validator';

// ============================================
// Удобные функции высокого уровня
// ============================================

import { parseQuery } from './parser';
import { generateSQL, SQLGenerationResult, DEFAULT_ISSUE_FIELDS } from './sql-generator';
import { prepareQueryForParsing, decodeBase64Query } from './decoder';
import { QueryNode, SQLGeneratorContext, ParseResult, FieldMapping } from './ast';
import { validateQuery as validateAST, ValidationResult, ValidationError } from './validator';

export interface ParseAndGenerateResult {
  success: boolean;
  sql: SQLGenerationResult | null;
  parseResult: ParseResult;
  decodedQuery: string;
  validation: ValidationResult | null;
}

/**
 * Полный пайплайн: encoded query → SQL
 */
export function parseAndGenerateSQL(
  encodedQuery: string,
  subdomain: string,
  tableAlias: string = 'I',
  customFields?: FieldMapping[]
): ParseAndGenerateResult {
  // 1. Декодируем и подготавливаем
  const prepared = prepareQueryForParsing(encodedQuery);
  
  if (!prepared || prepared.trim() === '') {
    return {
      success: true,
      sql: {
        whereClause: 'TRUE',
        orderByClause: '',
        parameters: [],
        usedFields: [],
        hasCustomFields: false
      },
      parseResult: { success: true, ast: null, errors: [] },
      decodedQuery: '',
      validation: { valid: true, errors: [], warnings: [] }
    };
  }
  
  // 2. Парсим в AST
  const parseResult = parseQuery(prepared);
  
  if (!parseResult.success || !parseResult.ast) {
    return { 
      success: false, 
      sql: null, 
      parseResult, 
      decodedQuery: prepared,
      validation: null
    };
  }
  
  // 3. Валидируем AST
  const validation = validateAST(parseResult.ast, customFields);
  
  if (!validation.valid) {
    return {
      success: false,
      sql: null,
      parseResult,
      decodedQuery: prepared,
      validation
    };
  }
  
  // 4. Генерируем SQL
  const context: SQLGeneratorContext = {
    subdomain,
    tableAlias,
    fieldMappings: customFields || []
  };
  
  const sql = generateSQL(parseResult.ast, context);
  
  return { success: true, sql, parseResult, decodedQuery: prepared, validation };
}

/**
 * Только парсинг (для валидации)
 */
export function parseQueryString(query: string): ParseResult {
  return parseQuery(query);
}

/**
 * Валидация запроса
 */
export function isValidQuery(query: string): boolean {
  if (!query || query.trim() === '') {
    return true;
  }
  
  const result = parseQuery(query);
  return result.success;
}

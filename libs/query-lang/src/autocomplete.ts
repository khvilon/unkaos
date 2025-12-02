/**
 * Autocomplete Engine для Issue Query Language
 * 
 * Предоставляет подсказки при вводе запроса
 */

import { QueryLexer, allTokens } from './tokens';
import { FieldMapping } from './ast';
import { DEFAULT_ISSUE_FIELDS } from './sql-generator';

// ============================================
// Types
// ============================================

export type SuggestionType = 'field' | 'operator' | 'value' | 'logical' | 'orderBy' | 'direction';

export interface Suggestion {
  type: SuggestionType;
  value: string;
  displayValue?: string;
  description?: string;
  insertText?: string;      // Что вставить (может отличаться от value)
}

export interface AutocompleteContext {
  fields: FieldMapping[];
  operators?: string[];
  logicalOperators?: string[];
  values?: { field: string; values: { name: string; uuid?: string }[] }[];
}

// ============================================
// Default operators
// ============================================

const DEFAULT_OPERATORS = ['=', '!=', '<', '>', '<=', '>=', 'like'];

const DEFAULT_LOGICAL_OPERATORS = ['and', 'or'];

const ORDER_KEYWORDS = ['order by'];

const DIRECTION_KEYWORDS = ['asc', 'desc'];

// ============================================
// State detection
// ============================================

export type QueryState = 
  | 'start'           // Начало запроса - ожидаем поле
  | 'afterField'      // После поля - ожидаем оператор
  | 'afterOperator'   // После оператора - ожидаем значение
  | 'afterValue'      // После значения - ожидаем логический оператор или ORDER BY
  | 'afterLogical'    // После AND/OR - ожидаем поле
  | 'afterOrderBy'    // После ORDER BY - ожидаем поле
  | 'afterOrderField' // После поля сортировки - ожидаем направление или запятую
  | 'unknown';

/**
 * Определяет текущее состояние ввода
 */
export function detectQueryState(input: string): { state: QueryState; currentToken: string } {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { state: 'start', currentToken: '' };
  }

  // Токенизируем
  const lexResult = QueryLexer.tokenize(trimmed);
  const tokens = lexResult.tokens;
  
  if (tokens.length === 0) {
    // Возможно частичный ввод - это начало поля
    return { state: 'start', currentToken: trimmed };
  }

  const lastToken = tokens[tokens.length - 1];
  const lastTokenType = lastToken.tokenType.name;
  
  // Проверяем, есть ли незавершённый токен после последнего распознанного
  const afterLastToken = trimmed.substring(lastToken.endOffset! + 1).trim();
  
  // Определяем состояние по типу последнего токена
  switch (lastTokenType) {
    case 'Identifier':
    case 'AttrMarker':
    case 'FieldMarker':
      // Это может быть поле или значение
      // Смотрим на предыдущий токен
      if (tokens.length >= 2) {
        const prevToken = tokens[tokens.length - 2];
        const prevType = prevToken.tokenType.name;
        if (['Equals', 'NotEquals', 'Less', 'Greater', 'LessEquals', 'GreaterEquals', 'Like', 'NotLike', 'In', 'NotIn'].includes(prevType)) {
          // Это значение
          return { state: afterLastToken ? 'afterValue' : 'afterOperator', currentToken: afterLastToken || lastToken.image };
        }
        if (prevType === 'OrderBy' || prevType === 'Comma') {
          return { state: afterLastToken ? 'afterOrderField' : 'afterOrderBy', currentToken: afterLastToken || lastToken.image };
        }
      }
      return { state: afterLastToken ? 'afterField' : 'start', currentToken: afterLastToken || lastToken.image };
    
    case 'Equals':
    case 'NotEquals':
    case 'Less':
    case 'Greater':
    case 'LessEquals':
    case 'GreaterEquals':
    case 'Like':
    case 'NotLike':
    case 'In':
    case 'NotIn':
      return { state: 'afterOperator', currentToken: afterLastToken };
    
    case 'StringLiteral':
    case 'NumberLiteral':
    case 'DateLiteral':
    case 'UuidLiteral':
    case 'Null':
    case 'Resolved':
    case 'RParen':
      return { state: 'afterValue', currentToken: afterLastToken };
    
    case 'And':
    case 'Or':
      return { state: 'afterLogical', currentToken: afterLastToken };
    
    case 'OrderBy':
      return { state: 'afterOrderBy', currentToken: afterLastToken };
    
    case 'Asc':
    case 'Desc':
      return { state: 'afterOrderField', currentToken: afterLastToken };
    
    case 'Comma':
      // После запятой смотрим контекст
      // Если до этого был ORDER BY - это поле сортировки
      const hasOrderBy = tokens.some(t => t.tokenType.name === 'OrderBy');
      if (hasOrderBy) {
        return { state: 'afterOrderBy', currentToken: afterLastToken };
      }
      return { state: 'afterValue', currentToken: afterLastToken };
    
    default:
      return { state: 'unknown', currentToken: afterLastToken };
  }
}

// ============================================
// Suggestions Generator
// ============================================

/**
 * Генерирует подсказки для текущего ввода
 */
export function getSuggestions(input: string, context?: AutocompleteContext): Suggestion[] {
  const { state, currentToken } = detectQueryState(input);
  const fields = context?.fields || DEFAULT_ISSUE_FIELDS;
  
  let suggestions: Suggestion[] = [];
  
  switch (state) {
    case 'start':
    case 'afterLogical':
      // Предлагаем поля
      suggestions = fields.map(f => ({
        type: 'field' as SuggestionType,
        value: f.name,
        displayValue: f.name,
        description: f.field,
        insertText: f.name
      }));
      break;
    
    case 'afterField':
      // Предлагаем операторы
      const operators = context?.operators || DEFAULT_OPERATORS;
      suggestions = operators.map(op => ({
        type: 'operator' as SuggestionType,
        value: op,
        displayValue: op,
        insertText: ` ${op} `
      }));
      break;
    
    case 'afterOperator':
      // Предлагаем значения (если есть) или ничего
      // Здесь нужно знать тип поля, чтобы предложить правильные значения
      suggestions = [
        { type: 'value', value: 'null', displayValue: 'NULL', insertText: 'null' }
      ];
      break;
    
    case 'afterValue':
      // Предлагаем логические операторы и ORDER BY
      suggestions = [
        ...DEFAULT_LOGICAL_OPERATORS.map(op => ({
          type: 'logical' as SuggestionType,
          value: op,
          displayValue: op.toUpperCase(),
          insertText: ` ${op} `
        })),
        { type: 'orderBy' as SuggestionType, value: 'order by', displayValue: 'ORDER BY', insertText: ' order by ' }
      ];
      break;
    
    case 'afterOrderBy':
      // Предлагаем поля для сортировки
      suggestions = fields.map(f => ({
        type: 'field' as SuggestionType,
        value: f.name,
        displayValue: f.name,
        description: 'Сортировка',
        insertText: f.field.replace('_uuid', '_name')
      }));
      break;
    
    case 'afterOrderField':
      // Предлагаем направление или запятую
      suggestions = DIRECTION_KEYWORDS.map(d => ({
        type: 'direction' as SuggestionType,
        value: d,
        displayValue: d.toUpperCase(),
        insertText: ` ${d}`
      }));
      suggestions.push({
        type: 'field',
        value: ',',
        displayValue: ', (ещё поле)',
        insertText: ', '
      });
      break;
  }
  
  // Фильтруем по текущему вводу
  if (currentToken) {
    const lowerToken = currentToken.toLowerCase();
    suggestions = suggestions.filter(s => 
      s.value.toLowerCase().startsWith(lowerToken) ||
      (s.displayValue && s.displayValue.toLowerCase().startsWith(lowerToken))
    );
  }
  
  return suggestions;
}

/**
 * Проверяет синтаксическую валидность запроса (только токенизация)
 */
export function validateQuerySyntax(input: string): { valid: boolean; error?: string; position?: number } {
  if (!input || input.trim() === '') {
    return { valid: true };
  }
  
  const lexResult = QueryLexer.tokenize(input);
  
  if (lexResult.errors.length > 0) {
    const firstError = lexResult.errors[0];
    return {
      valid: false,
      error: `Неизвестный символ: "${input.charAt(firstError.offset)}"`,
      position: firstError.offset
    };
  }
  
  // Можно добавить синтаксическую проверку через парсер
  
  return { valid: true };
}


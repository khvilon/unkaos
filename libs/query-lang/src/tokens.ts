/**
 * Tokens definition for Issue Query Language (IQL)
 * 
 * Чистый JQL-подобный синтаксис:
 * - Проект = 'MyProject'
 * - Статус != Решенные
 * - Создана > '2024-01-01' AND Проект = 'Test'
 * - Название like '%test%' ORDER BY Создана DESC
 */

import { createToken, Lexer } from 'chevrotain';

// ============================================
// Вспомогательные токены (пробелы - пропускаем)
// ============================================

export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /[\s\u00A0]+/,  // включая неразрывный пробел
  group: Lexer.SKIPPED
});

// ============================================
// Ключевые слова (должны быть ПЕРЕД идентификаторами)
// ============================================

// Логические операторы - русские и английские
export const And = createToken({
  name: 'And',
  pattern: /AND|И(?![а-яА-ЯёЁ])/i
});

export const Or = createToken({
  name: 'Or',
  pattern: /OR|ИЛИ/i
});

export const Not = createToken({
  name: 'Not',
  pattern: /NOT(?!\s+(?:LIKE|IN))|НЕ(?![а-яА-ЯёЁ])/i
});

// ORDER BY
export const OrderBy = createToken({
  name: 'OrderBy',
  pattern: /ORDER\s+BY|СОРТИРОВАТЬ\s+ПО|СОРТИРОВКА\s+ПО|СОРТИРОВКА/i
});

export const Desc = createToken({
  name: 'Desc',
  pattern: /DESC|УБЫВ/i
});

export const Asc = createToken({
  name: 'Asc',
  pattern: /ASC|ВОЗР/i
});

// NULL значения
export const Null = createToken({
  name: 'Null',
  pattern: /NULL|ПУСТО/i
});

// Специальные значения для статусов
export const Resolved = createToken({
  name: 'Resolved',
  pattern: /Решен(?:ные|ая|о|ы)?|resolved/i
});

// ============================================
// Операторы сравнения
// ============================================

export const NotEquals = createToken({
  name: 'NotEquals',
  pattern: /!=|<>/
});

export const LessEquals = createToken({
  name: 'LessEquals',
  pattern: /<=/
});

export const GreaterEquals = createToken({
  name: 'GreaterEquals',
  pattern: />=/
});

export const Equals = createToken({
  name: 'Equals',
  pattern: /=/
});

export const Less = createToken({
  name: 'Less',
  pattern: /</
});

export const Greater = createToken({
  name: 'Greater',
  pattern: />/
});

export const Like = createToken({
  name: 'Like',
  pattern: /LIKE|СОДЕРЖИТ|~~|~\*/i
});

export const NotLike = createToken({
  name: 'NotLike',
  pattern: /NOT\s+LIKE|НЕ\s+СОДЕРЖИТ|!~~|!~\*/i
});

export const In = createToken({
  name: 'In',
  pattern: /IN(?![а-яА-ЯёЁ])|В(?![а-яА-ЯёЁ])/i
});

export const NotIn = createToken({
  name: 'NotIn',
  pattern: /NOT\s+IN|НЕ\s+В(?![а-яА-ЯёЁ])/i
});

export const Is = createToken({
  name: 'Is',
  pattern: /IS/i
});

// ============================================
// Скобки и разделители
// ============================================

export const LParen = createToken({
  name: 'LParen',
  pattern: /\(/
});

export const RParen = createToken({
  name: 'RParen',
  pattern: /\)/
});

export const Comma = createToken({
  name: 'Comma',
  pattern: /,/
});

// ============================================
// Литералы
// ============================================

// Строка в одинарных кавычках 'value'
export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /'(?:[^'\\]|\\.)*'/
});

// Строка в двойных кавычках "value"
export const DoubleQuotedString = createToken({
  name: 'DoubleQuotedString',
  pattern: /"(?:[^"\\]|\\.)*"/
});

// Числа (целые и дробные)
export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /-?\d+(\.\d+)?/
});

// Дата в формате YYYY-MM-DD
export const DateLiteral = createToken({
  name: 'DateLiteral',
  pattern: /\d{4}-\d{2}-\d{2}/
});

// UUID
export const UuidLiteral = createToken({
  name: 'UuidLiteral',
  pattern: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
});

// ============================================
// Идентификаторы (поля) - ДОЛЖНЫ БЫТЬ ПОСЛЕДНИМИ
// ============================================

// Идентификатор (поле) - поддержка кириллицы и латиницы
// Может содержать пробелы если в кавычках, иначе без пробелов
export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[a-zA-Zа-яА-ЯёЁ_][a-zA-Zа-яА-ЯёЁ0-9_]*/
});

// ============================================
// Порядок токенов ВАЖЕН!
// Более специфичные токены должны быть раньше
// ============================================

export const allTokens = [
  // Пробелы (пропускаем)
  WhiteSpace,
  
  // Литералы (перед ключевыми словами для UUID и дат)
  UuidLiteral,
  DateLiteral,
  StringLiteral,
  DoubleQuotedString,
  NumberLiteral,
  
  // Многословные ключевые слова (перед однословными)
  OrderBy,
  NotLike,
  NotIn,
  NotEquals,
  LessEquals,
  GreaterEquals,
  
  // Ключевые слова
  And,
  Or,
  Not,
  Desc,
  Asc,
  Null,
  Resolved,
  Like,
  In,
  Is,
  
  // Операторы
  Equals,
  Less,
  Greater,
  
  // Скобки и разделители
  LParen,
  RParen,
  Comma,
  
  // Идентификаторы (последние - ловят всё остальное)
  Identifier
];

// ============================================
// Создаём лексер
// ============================================

export const QueryLexer = new Lexer(allTokens, {
  ensureOptimizations: true
});

// Экспорт типов токенов для парсера
export const tokenVocabulary = {
  WhiteSpace,
  And,
  Or,
  Not,
  OrderBy,
  Desc,
  Asc,
  Null,
  Resolved,
  NotEquals,
  LessEquals,
  GreaterEquals,
  Equals,
  Less,
  Greater,
  Like,
  NotLike,
  In,
  NotIn,
  Is,
  LParen,
  RParen,
  Comma,
  StringLiteral,
  DoubleQuotedString,
  NumberLiteral,
  DateLiteral,
  UuidLiteral,
  Identifier
};

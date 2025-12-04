/**
 * Unit tests for Query Language Parser
 */

import { parseQuery } from '../parser';
import { QueryLexer } from '../tokens';

describe('Lexer', () => {
  it('should tokenize simple field = value', () => {
    const result = QueryLexer.tokenize("Проект = 'Test'");
    expect(result.errors).toHaveLength(0);
    expect(result.tokens.length).toBeGreaterThan(0);
  });

  it('should tokenize operators', () => {
    const operators = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'like', 'IN', 'in'];
    operators.forEach(op => {
      const result = QueryLexer.tokenize(`Field ${op} 'value'`);
      expect(result.errors).toHaveLength(0);
    });
  });

  it('should tokenize logical operators', () => {
    const result = QueryLexer.tokenize("A = 'x' AND B = 'y' OR C = 'z'");
    expect(result.errors).toHaveLength(0);
  });

  it('should tokenize Russian logical operators', () => {
    const result = QueryLexer.tokenize("Проект = 'x' И Статус = 'y' ИЛИ Тип = 'z'");
    expect(result.errors).toHaveLength(0);
  });

  it('should tokenize quoted strings with spaces', () => {
    const result = QueryLexer.tokenize("Проект = 'Основной проект'");
    expect(result.errors).toHaveLength(0);
  });

  it('should tokenize dates', () => {
    const result = QueryLexer.tokenize("Создана > 2024-01-15");
    expect(result.errors).toHaveLength(0);
  });

  it('should tokenize numbers', () => {
    const result = QueryLexer.tokenize("Номер = 123");
    expect(result.errors).toHaveLength(0);
  });

  it('should tokenize parentheses', () => {
    const result = QueryLexer.tokenize("(A = 'x' OR B = 'y') AND C = 'z'");
    expect(result.errors).toHaveLength(0);
  });
});

describe('Parser', () => {
  it('should parse simple equality', () => {
    const result = parseQuery("Проект = 'Test'");
    expect(result.success).toBe(true);
    expect(result.ast).toBeDefined();
    expect(result.ast?.filter?.type).toBe('comparison');
  });

  it('should parse not equal', () => {
    const result = parseQuery("Статус != 'Закрыт'");
    expect(result.success).toBe(true);
    expect(result.ast).toBeDefined();
    if (result.ast?.filter?.type === 'comparison') {
      expect(result.ast.filter.operator).toBe('neq');
    }
  });

  it('should parse comparison operators', () => {
    const operators = ['>', '<', '>=', '<='];
    operators.forEach(op => {
      const result = parseQuery(`Создана ${op} 2024-01-01`);
      expect(result.success).toBe(true);
      expect(result.ast).toBeDefined();
    });
  });

  it('should parse LIKE operator', () => {
    const result = parseQuery("Название LIKE '%test%'");
    expect(result.success).toBe(true);
    expect(result.ast).toBeDefined();
  });

  it('should parse AND expression', () => {
    const result = parseQuery("Проект = 'A' AND Статус = 'B'");
    expect(result.success).toBe(true);
    expect(result.ast).toBeDefined();
    expect(result.ast?.filter?.type).toBe('logical');
    if (result.ast?.filter?.type === 'logical') {
      expect(result.ast.filter.operator).toBe('and');
    }
  });

  it('should parse OR expression', () => {
    const result = parseQuery("Проект = 'A' OR Проект = 'B'");
    expect(result.success).toBe(true);
    expect(result.ast).toBeDefined();
    expect(result.ast?.filter?.type).toBe('logical');
    if (result.ast?.filter?.type === 'logical') {
      expect(result.ast.filter.operator).toBe('or');
    }
  });

  it('should parse Russian AND (И)', () => {
    const result = parseQuery("Проект = 'A' И Статус = 'B'");
    expect(result.success).toBe(true);
    expect(result.ast).toBeDefined();
    expect(result.ast?.filter?.type).toBe('logical');
    if (result.ast?.filter?.type === 'logical') {
      expect(result.ast.filter.operator).toBe('and');
    }
  });

  it('should parse Russian OR (ИЛИ)', () => {
    const result = parseQuery("Проект = 'A' ИЛИ Проект = 'B'");
    expect(result.success).toBe(true);
    expect(result.ast).toBeDefined();
    expect(result.ast?.filter?.type).toBe('logical');
  });

  it('should parse parenthesized expressions', () => {
    const result = parseQuery("(Проект = 'A' OR Проект = 'B') AND Статус = 'C'");
    expect(result.success).toBe(true);
    expect(result.ast).toBeDefined();
    expect(result.ast?.filter?.type).toBe('logical');
  });

  it('should parse complex nested expressions', () => {
    const result = parseQuery("(A = '1' AND B = '2') OR (C = '3' AND D = '4')");
    expect(result.success).toBe(true);
    expect(result.ast).toBeDefined();
    expect(result.ast?.filter?.type).toBe('logical');
  });

  it('should handle empty query', () => {
    const result = parseQuery("");
    expect(result.success).toBe(true);
    // Parser returns QueryNode with filter: null for empty queries
    expect(result.ast?.filter).toBeNull();
  });

  it('should handle whitespace-only query', () => {
    const result = parseQuery("   ");
    expect(result.success).toBe(true);
    // Parser returns QueryNode with filter: null for whitespace-only queries
    expect(result.ast?.filter).toBeNull();
  });
});

describe('Parser Error Handling', () => {
  it('should return error for incomplete expression', () => {
    const result = parseQuery("Проект =");
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should return error for missing operator', () => {
    const result = parseQuery("Проект 'value'");
    expect(result.success).toBe(false);
  });

  it('should return error for unbalanced parentheses', () => {
    const result1 = parseQuery("(Проект = 'A'");
    expect(result1.success).toBe(false);
    
    const result2 = parseQuery("Проект = 'A')");
    expect(result2.success).toBe(false);
  });
});







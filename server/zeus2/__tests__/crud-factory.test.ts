/**
 * Tests for CRUD Factory
 */

import { 
  escapeIdentifier, 
  isValidUuid, 
  createErrorResponse 
} from '../utils/crud-factory';

// Mock для Request
const mockRequest = (headers: Record<string, string> = {}) => ({
  headers: {
    'x-trace-id': 'test-trace-id',
    ...headers
  }
} as any);

describe('escapeIdentifier', () => {
  test('экранирует простой идентификатор', () => {
    expect(escapeIdentifier('users')).toBe('"users"');
    expect(escapeIdentifier('issue_statuses')).toBe('"issue_statuses"');
  });

  test('экранирует идентификатор с дефисами', () => {
    expect(escapeIdentifier('my-schema')).toBe('"my-schema"');
  });

  test('экранирует идентификатор с цифрами', () => {
    expect(escapeIdentifier('table123')).toBe('"table123"');
    expect(escapeIdentifier('123table')).toBe('"123table"');
  });

  test('выбрасывает ошибку для недопустимых символов', () => {
    expect(() => escapeIdentifier('table; DROP TABLE users;--')).toThrow('Invalid identifier');
    expect(() => escapeIdentifier('table"name')).toThrow('Invalid identifier');
    expect(() => escapeIdentifier("table'name")).toThrow('Invalid identifier');
    expect(() => escapeIdentifier('table name')).toThrow('Invalid identifier');
    expect(() => escapeIdentifier('table.name')).toThrow('Invalid identifier');
  });

  test('выбрасывает ошибку для пустой строки', () => {
    expect(() => escapeIdentifier('')).toThrow('Invalid identifier');
  });
});

describe('isValidUuid', () => {
  test('валидирует корректные UUID v4', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    expect(isValidUuid('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
  });

  test('отклоняет некорректные UUID', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false);
    expect(isValidUuid('550e8400e29b41d4a716446655440000')).toBe(false);
    expect(isValidUuid('')).toBe(false);
    expect(isValidUuid('null')).toBe(false);
  });

  test('отклоняет SQL injection в UUID', () => {
    expect(isValidUuid("550e8400-e29b-41d4-a716-446655440000'; DROP TABLE--")).toBe(false);
    expect(isValidUuid("' OR '1'='1")).toBe(false);
  });
});

describe('createErrorResponse', () => {
  test('создает правильную структуру ошибки', () => {
    const req = mockRequest();
    const error = createErrorResponse(req, 'VALIDATION_ERROR', 'Ошибка валидации');

    expect(error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Ошибка валидации',
      trace_id: 'test-trace-id',
      details: []
    });
  });

  test('включает детали ошибки', () => {
    const req = mockRequest();
    const details = [
      { field: 'name', message: 'Поле обязательно' },
      { field: 'email', message: 'Некорректный формат' }
    ];
    const error = createErrorResponse(req, 'VALIDATION_ERROR', 'Ошибка валидации', details);

    expect(error.details).toEqual(details);
  });

  test('использует пустую строку если trace_id отсутствует', () => {
    const req = mockRequest({});
    delete req.headers['x-trace-id'];
    const error = createErrorResponse(req, 'ERROR', 'Test');

    expect(error.trace_id).toBe('');
  });
});

describe('SQL Injection Prevention', () => {
  test('escapeIdentifier блокирует SQL injection атаки', () => {
    const attackVectors = [
      "'; DROP TABLE users; --",
      "1; DELETE FROM issues WHERE 1=1; --",
      "UNION SELECT * FROM passwords",
      "users WHERE 1=1 OR 1=1",
      "users; INSERT INTO admins VALUES('hacker')",
      '"; DELETE FROM * --',
      "' OR ''='",
      "admin'--",
      "1' OR '1' = '1",
      "1; UPDATE users SET role='admin'",
    ];

    for (const attack of attackVectors) {
      expect(() => escapeIdentifier(attack)).toThrow('Invalid identifier');
    }
  });

  test('isValidUuid блокирует SQL injection в UUID', () => {
    const attackVectors = [
      "550e8400-e29b-41d4-a716-446655440000'; DROP TABLE users;--",
      "550e8400-e29b-41d4-a716-446655440000 OR 1=1",
      "'; DELETE FROM issues; --",
      "1 UNION SELECT password FROM users",
    ];

    for (const attack of attackVectors) {
      expect(isValidUuid(attack)).toBe(false);
    }
  });
});

describe('Edge Cases', () => {
  test('escapeIdentifier обрабатывает граничные случаи', () => {
    // Одиночные символы
    expect(escapeIdentifier('a')).toBe('"a"');
    expect(escapeIdentifier('1')).toBe('"1"');
    expect(escapeIdentifier('_')).toBe('"_"');
    
    // Длинные идентификаторы
    const longName = 'a'.repeat(100);
    expect(escapeIdentifier(longName)).toBe(`"${longName}"`);
  });

  test('isValidUuid обрабатывает null-подобные значения', () => {
    expect(isValidUuid(null as any)).toBe(false);
    expect(isValidUuid(undefined as any)).toBe(false);
    expect(isValidUuid({} as any)).toBe(false);
    expect(isValidUuid([] as any)).toBe(false);
    expect(isValidUuid(123 as any)).toBe(false);
  });
});


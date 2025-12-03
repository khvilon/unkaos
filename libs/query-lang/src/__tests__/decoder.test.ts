/**
 * Unit tests for Query Decoder
 */

import { decodeBase64Query, normalizeQuery, prepareQueryForParsing } from '../decoder';

describe('normalizeQuery', () => {
  it('should replace non-breaking spaces with regular spaces', () => {
    const input = 'Проект\u00A0=\u00A0Test';
    const result = normalizeQuery(input);
    expect(result).toBe('Проект = Test');
  });

  it('should replace &nbsp; with regular spaces', () => {
    const input = 'Проект&nbsp;=&nbsp;Test';
    const result = normalizeQuery(input);
    expect(result).toBe('Проект = Test');
  });

  it('should trim whitespace', () => {
    const input = '  Проект = Test  ';
    const result = normalizeQuery(input);
    expect(result).toBe('Проект = Test');
  });

  it('should handle empty string', () => {
    expect(normalizeQuery('')).toBe('');
    expect(normalizeQuery('   ')).toBe('');
  });
  
  it('should collapse multiple spaces', () => {
    const input = 'Проект   =   Test';
    const result = normalizeQuery(input);
    expect(result).toBe('Проект = Test');
  });
});

describe('decodeBase64Query', () => {
  it('should decode base64 encoded query', () => {
    // "Проект = 'Test'" encoded as base64(encodeURIComponent(...))
    const original = "Проект = 'Test'";
    const encoded = Buffer.from(encodeURIComponent(original), 'latin1').toString('base64');
    const result = decodeBase64Query(encoded);
    expect(result).toContain('Проект');
    expect(result).toContain('Test');
  });

  it('should handle plain text query', () => {
    const plain = "Проект = 'Test'";
    const result = decodeBase64Query(plain);
    // Plain text should be returned as-is if it's not valid base64
    expect(result).toBeDefined();
  });

  it('should handle empty string', () => {
    expect(decodeBase64Query('')).toBe('');
  });
  
  it('should handle null/undefined gracefully', () => {
    expect(decodeBase64Query(null as any)).toBe('');
    expect(decodeBase64Query(undefined as any)).toBe('');
  });
});

describe('prepareQueryForParsing', () => {
  it('should decode and normalize query', () => {
    const original = "Проект\u00A0=\u00A0'Test'";
    const encoded = Buffer.from(encodeURIComponent(original), 'latin1').toString('base64');
    const result = prepareQueryForParsing(encoded);
    expect(result).not.toContain('\u00A0');
    expect(result).toContain('Проект');
  });
  
  it('should handle empty input', () => {
    expect(prepareQueryForParsing('')).toBe('');
  });
});

describe('Base64 Encoding Edge Cases', () => {
  it('should handle Cyrillic characters', () => {
    const original = "Создана > 2024-01-01 И Статус = 'Новая'";
    const encoded = Buffer.from(encodeURIComponent(original), 'latin1').toString('base64');
    const decoded = decodeBase64Query(encoded);
    expect(decoded).toContain('Создана');
    expect(decoded).toContain('Статус');
    expect(decoded).toContain('Новая');
  });

  it('should handle special characters', () => {
    const original = "Название LIKE '%тест%'";
    const encoded = Buffer.from(encodeURIComponent(original), 'latin1').toString('base64');
    const decoded = decodeBase64Query(encoded);
    expect(decoded).toContain('%тест%');
  });
  
  it('should handle complex queries', () => {
    const original = "(Проект = 'A' OR Проект = 'B') AND Статус != 'Закрыт'";
    const encoded = Buffer.from(encodeURIComponent(original), 'latin1').toString('base64');
    const decoded = decodeBase64Query(encoded);
    expect(decoded).toContain('Проект');
    expect(decoded).toContain('Статус');
    expect(decoded).toContain('Закрыт');
  });
});




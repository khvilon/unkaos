/**
 * Query Decoder - декодирование запросов
 * 
 * Поддерживает:
 * - Base64 encoded запросы (которые содержат URI-encoded UTF-8)
 * - Plain text запросы
 */

/**
 * Декодирует base64-encoded запрос
 * Формат: base64(encodeURIComponent(query))
 * 
 * Браузер делает: btoa(encodeURIComponent(query))
 * btoa работает с latin1, поэтому encodeURIComponent сначала конвертирует UTF-8 в ASCII %XX
 */
export function decodeBase64Query(encodedQuery: string): string {
  if (!encodedQuery || encodedQuery.trim() === '') {
    return '';
  }
  
  console.log('[IQL Decoder] Input (first 100 chars):', JSON.stringify(encodedQuery.substring(0, 100)));
  console.log('[IQL Decoder] Input length:', encodedQuery.length);
  
  try {
    // base64 → URI-encoded string (ASCII)
    // Важно: btoa в браузере работает с latin1, поэтому используем latin1 для декодирования
    const base64Decoded = Buffer.from(encodedQuery, 'base64').toString('latin1');
    console.log('[IQL Decoder] After base64 (first 100 chars):', JSON.stringify(base64Decoded.substring(0, 100)));
    
    // URI decode → plain text (UTF-8)
    try {
      const uriDecoded = decodeURIComponent(base64Decoded);
      console.log('[IQL Decoder] After URI decode (first 100 chars):', JSON.stringify(uriDecoded.substring(0, 100)));
      return uriDecoded;
    } catch (uriError) {
      // Если URIComponent не сработал, возможно строка уже декодирована
      // Пробуем как UTF-8
      const utf8Decoded = Buffer.from(encodedQuery, 'base64').toString('utf-8');
      console.log('[IQL Decoder] URI decode failed, trying UTF-8:', utf8Decoded.substring(0, 100));
      return utf8Decoded;
    }
  } catch (error) {
    // Возможно это уже plain text (не base64)
    console.log('[IQL Decoder] Base64 decode failed, treating as plain text');
    return encodedQuery;
  }
}

/**
 * Нормализует запрос перед парсингом
 * 
 * Преобразования:
 * - Неразрывные пробелы → обычные пробелы
 * - Множественные пробелы → один пробел
 * - Trim
 */
export function normalizeQuery(query: string): string {
  return query
    .replace(/\u00A0/g, ' ')      // неразрывный пробел (Unicode)
    .replace(/\xA0/g, ' ')        // неразрывный пробел (Latin-1)
    .replace(/&nbsp;/g, ' ')       // HTML неразрывный пробел
    .replace(/\s+/g, ' ')          // множественные пробелы
    .trim();
}

/**
 * Полная подготовка запроса для парсинга
 */
export function prepareQueryForParsing(encodedQuery: string): string {
  const decoded = decodeBase64Query(encodedQuery);
  const normalized = normalizeQuery(decoded);
  console.log('[IQL Decoder] Final query:', JSON.stringify(normalized.substring(0, 100)));
  return normalized;
}

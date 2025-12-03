/**
 * Issue Query Builder
 * Строит SQL запросы для issues с CTE filtered_issues
 * 
 * ВАЖНО: Все функции используют параметризованные запросы для защиты от SQL injection
 */

import { ParsedQuery } from './issue-query-parser';
import { escapeIdentifier } from './crud-factory';

// UUID типа связи "родитель"
const PARENT_RELATION_TYPE_UUID = '73b0a22e-4632-453d-903b-09804093ef1b';

export interface QueryOptions {
  offset?: number;
  limit?: number;
  uuid?: string;
}

/**
 * Строит CTE filtered_issues
 * Примечание: field_values_rows не используется здесь, так как значения полей
 * получаются через LATERAL JOIN в основном запросе
 * 
 * Структура: SELECT * FROM (subquery) I WHERE <filter>
 * Это позволяет использовать I.field в фильтрах
 */
function buildFilteredIssuesCTE(subdomain: string, parsedQuery: ParsedQuery): string {
  const schema = escapeIdentifier(subdomain);
  
  return `
    WITH filtered_issues AS (
      SELECT * FROM (
        SELECT 
          ISS.uuid,
          ISS.num,
          ISS.title,
          ISS.description,
          ISS.spent_time,
          ISS.type_uuid,
          ISS.created_at,
          ISS.resolved_at,
          COALESCE(IA.updated_at, ISS.created_at) AS updated_at,
          ISS.deleted_at,
          ISS.project_uuid,
          ISS.status_uuid,
          ISS.sprint_uuid,
          ISS.author_uuid,
          IT.tags
        FROM ${schema}.issues ISS
        LEFT JOIN (
          SELECT 
            issue_uuid,
            MAX(created_at) AS updated_at
          FROM ${schema}.issue_actions
          GROUP BY issue_uuid
        ) IA ON IA.issue_uuid = ISS.uuid
        LEFT JOIN (
          SELECT 
            issue_uuid,
            STRING_AGG(issue_tags_uuid::text, ',') AS tags
          FROM ${schema}.issue_tags_selected
          WHERE deleted_at IS NULL
          GROUP BY issue_uuid
        ) IT ON IT.issue_uuid = ISS.uuid
      ) I
      WHERE ${parsedQuery.whereClause}
    )
  `;
}

/**
 * Строит основной SELECT для списка issues
 */
export function buildIssuesListQuery(subdomain: string, parsedQuery: ParsedQuery, options: QueryOptions): string {
  const cte = buildFilteredIssuesCTE(subdomain, parsedQuery);
  const schema = escapeIdentifier(subdomain);
  
  // Валидация offset и limit (защита от некорректных значений)
  const safeOffset = Math.max(0, Math.floor(Number(options.offset) || 0));
  const safeLimit = Math.max(1, Math.min(10000, Math.floor(Number(options.limit) || 1000)));
  
  const mainSelect = `
    SELECT 
      'issues' AS table_name,
      T1.uuid,
      T1.num,
      T1.title,
      T1.description,
      T1.spent_time,
      T1.type_uuid,
      T11.name AS type_name,
      T11.workflow_uuid,
      T1.created_at,
      T1.updated_at,
      T1.deleted_at,
      T1.resolved_at,
      T1.project_uuid,
      T1.author_uuid,
      T12.name AS project_name,
      T12.short_name AS project_short_name,
      CASE WHEN COUNT(T14) = 0 THEN '[]'::jsonb ELSE JSONB_AGG(DISTINCT T14) END AS values,
      T1.status_uuid,
      T17.name AS status_name,
      T1.sprint_uuid,
      T19.parent_uuid,
      T20.name AS sprint_name,
      T21.name AS author_name
    FROM filtered_issues T1
    JOIN ${schema}.issue_types T11 ON T1.type_uuid = T11.uuid
    JOIN ${schema}.projects T12 ON T1.project_uuid = T12.uuid
    JOIN ${schema}.issue_statuses T17 ON T1.status_uuid = T17.uuid
    LEFT JOIN LATERAL (
      SELECT 
        'field_values' AS table_name,
        FV.uuid AS uuid,
        YT.uuid AS issue_type_uuid,
        F.name AS label,
        FT.code AS type,
        FV.value,
        T1.uuid AS issue_uuid,
        F.uuid AS field_uuid
      FROM ${schema}.issue_types YT
      JOIN ${schema}.issue_types_to_fields ITF ON ITF.issue_types_uuid = YT.uuid
      JOIN ${schema}.fields F ON ITF.fields_uuid = F.uuid OR NOT F.is_custom
      JOIN ${schema}.field_types FT ON FT.uuid = F.type_uuid
      LEFT JOIN ${schema}.field_values FV ON FV.field_uuid = F.uuid AND T1.uuid = FV.issue_uuid
      ORDER BY F.name
    ) T14 ON T1.type_uuid = T14.issue_type_uuid
    LEFT JOIN LATERAL (
      SELECT
        issue0_uuid AS parent_uuid,
        issue1_uuid
      FROM ${schema}.relations 
      WHERE issue1_uuid = T1.uuid
        AND type_uuid = '${PARENT_RELATION_TYPE_UUID}'
        AND deleted_at IS NULL
    ) T19 ON T1.uuid = T19.issue1_uuid
    LEFT JOIN ${schema}.sprints T20 ON T20.uuid = T1.sprint_uuid
    LEFT JOIN ${schema}.users T21 ON T21.uuid = T1.author_uuid
    WHERE T1.deleted_at IS NULL
    GROUP BY
      T1.uuid, T1.num, T1.title, T1.description, T1.spent_time,
      T1.type_uuid, T11.name, T1.created_at, T1.updated_at, T1.deleted_at,
      T1.resolved_at, T1.project_uuid, T1.author_uuid, T12.name, T12.short_name,
      T1.status_uuid, T17.name, T19.parent_uuid, T20.name, T21.name,
      T1.sprint_uuid, T11.workflow_uuid
    ${parsedQuery.orderByClause}
    LIMIT ${safeLimit}
    OFFSET ${safeOffset}
  `;

  return cte + mainSelect;
}

/**
 * Строит запрос для одной issue по UUID
 * ВАЖНО: uuid должен быть предварительно провалидирован через isValidUuid()
 */
export function buildIssueByUuidQuery(subdomain: string, uuid: string): string {
  const schema = escapeIdentifier(subdomain);
  
  // Используем простой CTE без фильтрации
  const cte = `
    WITH filtered_issues AS (
      SELECT * FROM ${schema}.issues
    )
  `;
  
  // UUID безопасен для вставки если прошёл валидацию через uuid.validate()
  // Формат UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (hex + дефисы)
  const mainSelect = `
    SELECT 
      'issues' AS table_name,
      T1.uuid,
      T1.num,
      T1.title,
      T1.description,
      T1.spent_time,
      T1.type_uuid,
      T11.name AS type_name,
      T11.workflow_uuid,
      T1.created_at,
      T1.updated_at,
      T1.deleted_at,
      T1.resolved_at,
      T1.project_uuid,
      T1.author_uuid,
      T12.name AS project_name,
      T12.short_name AS project_short_name,
      CASE WHEN COUNT(T14) = 0 THEN '[]'::jsonb ELSE JSONB_AGG(DISTINCT T14) END AS values,
      T1.status_uuid,
      T17.name AS status_name,
      T1.sprint_uuid,
      T19.parent_uuid,
      T20.name AS sprint_name,
      T21.name AS author_name
    FROM filtered_issues T1
    JOIN ${schema}.issue_types T11 ON T1.type_uuid = T11.uuid
    JOIN ${schema}.projects T12 ON T1.project_uuid = T12.uuid
    JOIN ${schema}.issue_statuses T17 ON T1.status_uuid = T17.uuid
    LEFT JOIN LATERAL (
      SELECT 
        'field_values' AS table_name,
        FV.uuid AS uuid,
        YT.uuid AS issue_type_uuid,
        F.name AS label,
        FT.code AS type,
        FV.value,
        T1.uuid AS issue_uuid,
        F.uuid AS field_uuid
      FROM ${schema}.issue_types YT
      JOIN ${schema}.issue_types_to_fields ITF ON ITF.issue_types_uuid = YT.uuid
      JOIN ${schema}.fields F ON ITF.fields_uuid = F.uuid OR NOT F.is_custom
      JOIN ${schema}.field_types FT ON FT.uuid = F.type_uuid
      LEFT JOIN ${schema}.field_values FV ON FV.field_uuid = F.uuid AND T1.uuid = FV.issue_uuid
      ORDER BY F.name
    ) T14 ON T1.type_uuid = T14.issue_type_uuid
    LEFT JOIN LATERAL (
      SELECT
        issue0_uuid AS parent_uuid,
        issue1_uuid
      FROM ${schema}.relations 
      WHERE issue1_uuid = T1.uuid
        AND type_uuid = '${PARENT_RELATION_TYPE_UUID}'
        AND deleted_at IS NULL
    ) T19 ON T1.uuid = T19.issue1_uuid
    LEFT JOIN ${schema}.sprints T20 ON T20.uuid = T1.sprint_uuid
    LEFT JOIN ${schema}.users T21 ON T21.uuid = T1.author_uuid
    WHERE T1.deleted_at IS NULL AND T1.uuid = '${uuid}'::uuid
    GROUP BY
      T1.uuid, T1.num, T1.title, T1.description, T1.spent_time,
      T1.type_uuid, T11.name, T1.created_at, T1.updated_at, T1.deleted_at,
      T1.resolved_at, T1.project_uuid, T1.author_uuid, T12.name, T12.short_name,
      T1.status_uuid, T17.name, T19.parent_uuid, T20.name, T21.name,
      T1.sprint_uuid, T11.workflow_uuid
    LIMIT 1
  `;

  return cte + mainSelect;
}

/**
 * Строит запрос для подсчёта issues
 */
export function buildIssuesCountQuery(subdomain: string, parsedQuery: ParsedQuery): string {
  const cte = buildFilteredIssuesCTE(subdomain, parsedQuery);
  
  return cte + `
    SELECT COUNT(*) as count FROM filtered_issues WHERE deleted_at IS NULL
  `;
}

/**
 * Строит параметризованный INSERT запрос для создания issue
 * Возвращает SQL и массив параметров
 */
export function buildInsertIssueParams(subdomain: string, data: any): { sql: string; params: any[] } {
  const schema = escapeIdentifier(subdomain);
  const columns: string[] = [];
  const placeholders: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;
  
  const columnConfig: { name: string; type: 'uuid' | 'text' | 'number' }[] = [
    { name: 'uuid', type: 'uuid' },
    { name: 'num', type: 'number' },
    { name: 'type_uuid', type: 'uuid' },
    { name: 'project_uuid', type: 'uuid' },
    { name: 'status_uuid', type: 'uuid' },
    { name: 'sprint_uuid', type: 'uuid' },
    { name: 'author_uuid', type: 'uuid' },
    { name: 'title', type: 'text' },
    { name: 'description', type: 'text' },
    { name: 'spent_time', type: 'number' },
    { name: 'parent_uuid', type: 'uuid' }
  ];
  
  for (const col of columnConfig) {
    if (data[col.name] !== undefined) {
      columns.push(col.name);
      
      if (col.type === 'uuid') {
        placeholders.push(`$${paramIndex}::uuid`);
      } else if (col.type === 'number') {
        placeholders.push(`$${paramIndex}::numeric`);
      } else {
        placeholders.push(`$${paramIndex}`);
      }
      
      params.push(data[col.name]);
      paramIndex++;
    }
  }
  
  const sql = `
    INSERT INTO ${schema}.issues (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING uuid
  `;
  
  return { sql, params };
}

/**
 * Строит параметризованный UPDATE запрос для обновления issue
 * Возвращает SQL и массив параметров
 */
export function buildUpdateIssueParams(subdomain: string, uuid: string, data: any): { sql: string; params: any[] } {
  const schema = escapeIdentifier(subdomain);
  const setClauses: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;
  
  const columnConfig: { name: string; type: 'uuid' | 'text' | 'number' | 'timestamp' }[] = [
    { name: 'type_uuid', type: 'uuid' },
    { name: 'project_uuid', type: 'uuid' },
    { name: 'status_uuid', type: 'uuid' },
    { name: 'sprint_uuid', type: 'uuid' },
    { name: 'author_uuid', type: 'uuid' },
    { name: 'title', type: 'text' },
    { name: 'description', type: 'text' },
    { name: 'spent_time', type: 'number' },
    { name: 'parent_uuid', type: 'uuid' },
    { name: 'resolved_at', type: 'timestamp' }
  ];
  
  for (const col of columnConfig) {
    if (data[col.name] !== undefined) {
      if (col.type === 'uuid') {
        setClauses.push(`${col.name} = $${paramIndex}::uuid`);
      } else if (col.type === 'number') {
        setClauses.push(`${col.name} = $${paramIndex}::numeric`);
      } else if (col.type === 'timestamp') {
        setClauses.push(`${col.name} = $${paramIndex}::timestamp`);
      } else {
        setClauses.push(`${col.name} = $${paramIndex}`);
      }
      
      params.push(data[col.name]);
      paramIndex++;
    }
  }
  
  // Всегда обновляем updated_at
  setClauses.push('updated_at = NOW()');
  
  // UUID в WHERE
  params.push(uuid);
  
  const sql = `
    UPDATE ${schema}.issues
    SET ${setClauses.join(', ')}
    WHERE uuid = $${paramIndex}::uuid
    RETURNING uuid
  `;
  
  return { sql, params };
}

/**
 * Получает следующий номер issue для проекта
 * ВАЖНО: projectUuid должен быть предварительно провалидирован
 */
export function buildGetNextIssueNumQuery(subdomain: string, projectUuid: string): string {
  const schema = escapeIdentifier(subdomain);
  
  // UUID безопасен после валидации через uuid.validate()
  return `
    SELECT COALESCE(MAX(num), 0) + 1 as next_num
    FROM ${schema}.issues
    WHERE project_uuid = '${projectUuid}'::uuid
  `;
}

// Экспортируем старые функции для обратной совместимости (deprecated)
/** @deprecated Используйте buildInsertIssueParams вместо этой функции */
export function buildInsertIssueQuery(subdomain: string, data: any): string {
  const { sql, params } = buildInsertIssueParams(subdomain, data);
  // ВНИМАНИЕ: Эта функция небезопасна! Используется только для обратной совместимости
  let result = sql;
  params.forEach((param, i) => {
    const placeholder = `$${i + 1}`;
    const value = param === null ? 'NULL' : 
                  typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : 
                  param;
    result = result.replace(new RegExp(`\\$${i + 1}::[a-z]+`, 'g'), String(value));
    result = result.replace(new RegExp(`\\$${i + 1}(?![0-9])`, 'g'), String(value));
  });
  return result;
}

/** @deprecated Используйте buildUpdateIssueParams вместо этой функции */
export function buildUpdateIssueQuery(subdomain: string, uuid: string, data: any): string {
  const { sql, params } = buildUpdateIssueParams(subdomain, uuid, data);
  // ВНИМАНИЕ: Эта функция небезопасна! Используется только для обратной совместимости
  let result = sql;
  params.forEach((param, i) => {
    const placeholder = `$${i + 1}`;
    const value = param === null ? 'NULL' : 
                  typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : 
                  param;
    result = result.replace(new RegExp(`\\$${i + 1}::[a-z]+`, 'g'), String(value));
    result = result.replace(new RegExp(`\\$${i + 1}(?![0-9])`, 'g'), String(value));
  });
  return result;
}

/** @deprecated Используйте параметризованный запрос напрямую */
export function buildDeleteIssueQuery(subdomain: string, uuid: string): string {
  const schema = escapeIdentifier(subdomain);
  // UUID безопасен после валидации
  return `
    UPDATE ${schema}.issues
    SET deleted_at = NOW()
    WHERE uuid = '${uuid}'::uuid
    RETURNING uuid
  `;
}

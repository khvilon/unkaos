/**
 * Issue Query Builder
 * Строит SQL запросы для issues с CTE filtered_issues
 */

import { ParsedQuery } from './issue-query-parser';

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
        FROM "${subdomain}".issues ISS
        LEFT JOIN (
          SELECT 
            issue_uuid,
            MAX(created_at) AS updated_at
          FROM "${subdomain}".issue_actions
          GROUP BY issue_uuid
        ) IA ON IA.issue_uuid = ISS.uuid
        LEFT JOIN (
          SELECT 
            issue_uuid,
            STRING_AGG(issue_tags_uuid::text, ',') AS tags
          FROM "${subdomain}".issue_tags_selected
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
    JOIN "${subdomain}".issue_types T11 ON T1.type_uuid = T11.uuid
    JOIN "${subdomain}".projects T12 ON T1.project_uuid = T12.uuid
    JOIN "${subdomain}".issue_statuses T17 ON T1.status_uuid = T17.uuid
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
      FROM "${subdomain}".issue_types YT
      JOIN "${subdomain}".issue_types_to_fields ITF ON ITF.issue_types_uuid = YT.uuid
      JOIN "${subdomain}".fields F ON ITF.fields_uuid = F.uuid OR NOT F.is_custom
      JOIN "${subdomain}".field_types FT ON FT.uuid = F.type_uuid
      LEFT JOIN "${subdomain}".field_values FV ON FV.field_uuid = F.uuid AND T1.uuid = FV.issue_uuid
      ORDER BY F.name
    ) T14 ON T1.type_uuid = T14.issue_type_uuid
    LEFT JOIN LATERAL (
      SELECT
        issue0_uuid AS parent_uuid,
        issue1_uuid
      FROM "${subdomain}".relations 
      WHERE issue1_uuid = T1.uuid
        AND type_uuid = '${PARENT_RELATION_TYPE_UUID}'
        AND deleted_at IS NULL
    ) T19 ON T1.uuid = T19.issue1_uuid
    LEFT JOIN "${subdomain}".sprints T20 ON T20.uuid = T1.sprint_uuid
    LEFT JOIN "${subdomain}".users T21 ON T21.uuid = T1.author_uuid
    WHERE T1.deleted_at IS NULL
    GROUP BY
      T1.uuid, T1.num, T1.title, T1.description, T1.spent_time,
      T1.type_uuid, T11.name, T1.created_at, T1.updated_at, T1.deleted_at,
      T1.resolved_at, T1.project_uuid, T1.author_uuid, T12.name, T12.short_name,
      T1.status_uuid, T17.name, T19.parent_uuid, T20.name, T21.name,
      T1.sprint_uuid, T11.workflow_uuid
    ${parsedQuery.orderByClause}
    LIMIT ${options.limit || 1000}
    OFFSET ${options.offset || 0}
  `;

  return cte + mainSelect;
}

/**
 * Строит запрос для одной issue по UUID
 */
export function buildIssueByUuidQuery(subdomain: string, uuid: string): string {
  const parsedQuery = { whereClause: ` T1.uuid = '${uuid}' `, orderByClause: '' };
  
  // Используем простой CTE без фильтрации
  const cte = `
    WITH filtered_issues AS (
      SELECT * FROM "${subdomain}".issues
    )
  `;
  
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
    JOIN "${subdomain}".issue_types T11 ON T1.type_uuid = T11.uuid
    JOIN "${subdomain}".projects T12 ON T1.project_uuid = T12.uuid
    JOIN "${subdomain}".issue_statuses T17 ON T1.status_uuid = T17.uuid
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
      FROM "${subdomain}".issue_types YT
      JOIN "${subdomain}".issue_types_to_fields ITF ON ITF.issue_types_uuid = YT.uuid
      JOIN "${subdomain}".fields F ON ITF.fields_uuid = F.uuid OR NOT F.is_custom
      JOIN "${subdomain}".field_types FT ON FT.uuid = F.type_uuid
      LEFT JOIN "${subdomain}".field_values FV ON FV.field_uuid = F.uuid AND T1.uuid = FV.issue_uuid
      ORDER BY F.name
    ) T14 ON T1.type_uuid = T14.issue_type_uuid
    LEFT JOIN LATERAL (
      SELECT
        issue0_uuid AS parent_uuid,
        issue1_uuid
      FROM "${subdomain}".relations 
      WHERE issue1_uuid = T1.uuid
        AND type_uuid = '${PARENT_RELATION_TYPE_UUID}'
        AND deleted_at IS NULL
    ) T19 ON T1.uuid = T19.issue1_uuid
    LEFT JOIN "${subdomain}".sprints T20 ON T20.uuid = T1.sprint_uuid
    LEFT JOIN "${subdomain}".users T21 ON T21.uuid = T1.author_uuid
    WHERE T1.deleted_at IS NULL AND ${parsedQuery.whereClause}
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
 * Строит INSERT запрос для создания issue
 */
export function buildInsertIssueQuery(subdomain: string, data: any): string {
  const columns = [];
  const values = [];
  
  const allowedColumns = [
    'uuid', 'type_uuid', 'project_uuid', 'status_uuid', 'sprint_uuid',
    'author_uuid', 'title', 'description', 'spent_time', 'parent_uuid', 'num'
  ];
  
  for (const col of allowedColumns) {
    if (data[col] !== undefined) {
      columns.push(col);
      if (data[col] === null) {
        values.push('NULL');
      } else if (typeof data[col] === 'string') {
        values.push(`'${data[col].replace(/'/g, "''")}'`);
      } else {
        values.push(data[col]);
      }
    }
  }
  
  return `
    INSERT INTO "${subdomain}".issues (${columns.join(', ')})
    VALUES (${values.join(', ')})
    RETURNING uuid
  `;
}

/**
 * Строит UPDATE запрос для обновления issue
 */
export function buildUpdateIssueQuery(subdomain: string, uuid: string, data: any): string {
  const setClauses = [];
  
  const allowedColumns = [
    'type_uuid', 'project_uuid', 'status_uuid', 'sprint_uuid',
    'author_uuid', 'title', 'description', 'spent_time', 'parent_uuid',
    'resolved_at'
  ];
  
  for (const col of allowedColumns) {
    if (data[col] !== undefined) {
      if (data[col] === null) {
        setClauses.push(`${col} = NULL`);
      } else if (typeof data[col] === 'string') {
        setClauses.push(`${col} = '${data[col].replace(/'/g, "''")}'`);
      } else {
        setClauses.push(`${col} = ${data[col]}`);
      }
    }
  }
  
  setClauses.push(`updated_at = NOW()`);
  
  return `
    UPDATE "${subdomain}".issues
    SET ${setClauses.join(', ')}
    WHERE uuid = '${uuid}'
    RETURNING uuid
  `;
}

/**
 * Строит DELETE (soft) запрос
 */
export function buildDeleteIssueQuery(subdomain: string, uuid: string): string {
  return `
    UPDATE "${subdomain}".issues
    SET deleted_at = NOW()
    WHERE uuid = '${uuid}'
    RETURNING uuid
  `;
}

/**
 * Получает следующий номер issue для проекта
 */
export function buildGetNextIssueNumQuery(subdomain: string, projectUuid: string): string {
  return `
    SELECT COALESCE(MAX(num), 0) + 1 as next_num
    FROM "${subdomain}".issues
    WHERE project_uuid = '${projectUuid}'
  `;
}


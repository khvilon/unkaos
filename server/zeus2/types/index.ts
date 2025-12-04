/**
 * Type definitions for Zeus2 API
 * 
 * Централизованные типы для всех сущностей и API
 */

// ==================== BASE TYPES ====================

/** Базовая сущность с общими полями */
export interface BaseEntity {
  uuid: string;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at?: Date | string | null;
}

/** API ошибка */
export interface ApiError {
  code: string;
  message: string;
  trace_id: string;
  details: ApiErrorDetail[];
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

/** Ответ со списком */
export interface ListResponse<T> {
  rows: T[];
}

/** Ответ с пагинацией */
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

// ==================== ISSUE TYPES ====================

export interface Issue extends BaseEntity {
  num: number;
  title: string;
  description: string;
  spent_time: number;
  type_uuid: string;
  type_name?: string;
  workflow_uuid?: string;
  project_uuid: string;
  project_name?: string;
  project_short_name?: string;
  author_uuid?: string | null;
  author_name?: string;
  status_uuid: string;
  status_name?: string;
  sprint_uuid?: string | null;
  sprint_name?: string | null;
  parent_uuid?: string | null;
  resolved_at?: Date | string | null;
  values?: FieldValue[];
  table_name: 'issues';
}

export interface CreateIssueInput {
  uuid?: string;
  type_uuid: string;
  project_uuid: string;
  status_uuid: string;
  sprint_uuid?: string | null;
  author_uuid?: string | null;
  parent_uuid?: string | null;
  title?: string;
  description?: string;
  spent_time?: number;
  values?: CreateFieldValueInput[];
}

export interface UpdateIssueInput {
  type_uuid?: string;
  project_uuid?: string;
  status_uuid?: string;
  sprint_uuid?: string | null;
  author_uuid?: string | null;
  parent_uuid?: string | null;
  title?: string;
  description?: string;
  spent_time?: number;
  resolved_at?: string | null;
  values?: CreateFieldValueInput[];
}

// ==================== USER TYPES ====================

export interface User extends BaseEntity {
  name: string;
  login: string;
  mail: string;
  active: boolean;
  avatar?: string | null;
  telegram: string;
  discord: string;
  telegram_id?: string;
  discord_id?: string;
  roles?: Role[];
  table_name: 'users';
}

export interface CreateUserInput {
  uuid?: string;
  name: string;
  login?: string;
  mail?: string;
  active?: boolean;
  avatar?: string | null;
  telegram?: string;
  discord?: string;
  roles?: string[] | { uuid: string }[];
}

export interface UpdateUserInput {
  name?: string;
  login?: string;
  mail?: string;
  active?: boolean;
  avatar?: string | null;
  telegram?: string;
  discord?: string;
  telegram_id?: string;
  discord_id?: string;
  roles?: string[] | { uuid: string }[];
}

// ==================== PROJECT TYPES ====================

export interface Project extends BaseEntity {
  name: string;
  short_name: string;
  owner_uuid?: string | null;
  owner_name?: string;
  description?: string;
  avatar?: string | null;
  table_name: 'projects';
}

export interface CreateProjectInput {
  uuid?: string;
  name: string;
  short_name: string;
  owner_uuid?: string | null;
  description?: string;
  avatar?: string | null;
}

export interface UpdateProjectInput {
  name?: string;
  short_name?: string;
  owner_uuid?: string | null;
  description?: string;
  avatar?: string | null;
}

// ==================== ISSUE STATUS TYPES ====================

export interface IssueStatus extends BaseEntity {
  name: string;
  color?: string;
  is_initial: boolean;
  is_final: boolean;
  order_num: number;
  table_name: 'issue_statuses';
}

export interface CreateIssueStatusInput {
  uuid?: string;
  name: string;
  color?: string;
  is_initial?: boolean;
  is_final?: boolean;
  order_num?: number;
}

// ==================== WORKFLOW TYPES ====================

export interface Workflow extends BaseEntity {
  name: string;
  description?: string;
  statuses?: WorkflowStatus[];
  table_name: 'workflows';
}

export interface WorkflowStatus {
  uuid: string;
  status_uuid: string;
  status_name?: string;
  order_num: number;
}

export interface CreateWorkflowInput {
  uuid?: string;
  name: string;
  description?: string;
}

// ==================== ISSUE TYPE TYPES ====================

export interface IssueType extends BaseEntity {
  name: string;
  workflow_uuid: string;
  workflow_name?: string;
  description?: string;
  icon?: string;
  fields?: Field[];
  table_name: 'issue_types';
}

export interface CreateIssueTypeInput {
  uuid?: string;
  name: string;
  workflow_uuid: string;
  description?: string;
  icon?: string;
}

// ==================== FIELD TYPES ====================

export interface Field extends BaseEntity {
  name: string;
  type_uuid: string;
  type_code?: string;
  is_custom: boolean;
  is_required: boolean;
  default_value?: string;
  options?: string[];
  table_name: 'fields';
}

export interface FieldValue {
  uuid: string;
  issue_uuid: string;
  field_uuid: string;
  label?: string;
  type?: string;
  value: string | number | boolean | null;
  table_name: 'field_values';
}

export interface CreateFieldValueInput {
  uuid?: string;
  field_uuid: string;
  value: string | number | boolean | null;
}

// ==================== SPRINT TYPES ====================

export interface Sprint extends BaseEntity {
  name: string;
  project_uuid: string;
  project_name?: string;
  start_date?: Date | string | null;
  end_date?: Date | string | null;
  goal?: string;
  table_name: 'sprints';
}

export interface CreateSprintInput {
  uuid?: string;
  name: string;
  project_uuid: string;
  start_date?: string;
  end_date?: string;
  goal?: string;
}

// ==================== ROLE TYPES ====================

export interface Role extends BaseEntity {
  name: string;
  description?: string;
  permissions?: Permission[];
  table_name: 'roles';
}

export interface Permission {
  uuid: string;
  name: string;
  code: string;
}

export interface CreateRoleInput {
  uuid?: string;
  name: string;
  description?: string;
  permissions?: string[] | { uuid: string }[];
}

// ==================== BOARD TYPES ====================

export interface Board extends BaseEntity {
  name: string;
  project_uuid?: string | null;
  project_name?: string;
  filter_query?: string;
  columns?: BoardColumn[];
  table_name: 'boards';
}

export interface BoardColumn {
  uuid: string;
  status_uuid: string;
  status_name?: string;
  order_num: number;
}

export interface CreateBoardInput {
  uuid?: string;
  name: string;
  project_uuid?: string | null;
  filter_query?: string;
  columns?: { status_uuid: string; order_num: number }[];
}

// ==================== DASHBOARD TYPES ====================

export interface Dashboard extends BaseEntity {
  name: string;
  description?: string;
  is_default: boolean;
  gadgets?: Gadget[];
  table_name: 'dashboards';
}

export interface Gadget {
  uuid: string;
  type: string;
  title: string;
  config: Record<string, any>;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface CreateDashboardInput {
  uuid?: string;
  name: string;
  description?: string;
  is_default?: boolean;
}

// ==================== TIME ENTRY TYPES ====================

export interface TimeEntry extends BaseEntity {
  issue_uuid: string;
  user_uuid: string;
  user_name?: string;
  hours: number;
  date: Date | string;
  comment?: string;
  table_name: 'time_entries';
}

export interface CreateTimeEntryInput {
  uuid?: string;
  issue_uuid: string;
  user_uuid: string;
  hours: number;
  date: string;
  comment?: string;
}

// ==================== ATTACHMENT TYPES ====================

export interface Attachment extends BaseEntity {
  issue_uuid: string;
  author_uuid?: string;
  author_name?: string;
  filename: string;
  mime_type: string;
  size: number;
  url?: string;
  table_name: 'attachments';
}

export interface CreateAttachmentInput {
  uuid?: string;
  issue_uuid: string;
  filename: string;
  mime_type: string;
  size: number;
  url?: string;
}

// ==================== RELATION TYPES ====================

export interface Relation extends BaseEntity {
  type_uuid: string;
  type_name?: string;
  issue0_uuid: string;
  issue1_uuid: string;
  table_name: 'relations';
}

export interface CreateRelationInput {
  uuid?: string;
  type_uuid: string;
  issue0_uuid: string;
  issue1_uuid: string;
}

// ==================== WATCHER TYPES ====================

export interface Watcher extends BaseEntity {
  issue_uuid: string;
  user_uuid: string;
  user_name?: string;
  table_name: 'watchers';
}

// ==================== TAG TYPES ====================

export interface IssueTag extends BaseEntity {
  name: string;
  color?: string;
  table_name: 'issue_tags';
}

export interface IssueTagSelected {
  uuid: string;
  issue_uuid: string;
  issue_tags_uuid: string;
  tag_name?: string;
}

// ==================== FAVOURITE TYPES ====================

export interface Favourite extends BaseEntity {
  user_uuid: string;
  entity_type: string;
  entity_uuid: string;
  table_name: 'favourites';
}

// ==================== CONFIG TYPES ====================

export interface Config {
  key: string;
  value: string | number | boolean | object;
}

// ==================== LISTENER TYPES ====================

export interface Listener {
  method: string;
  func: string;
  entity: string;
}

// ==================== REQUEST EXTENSIONS ====================

declare global {
  namespace Express {
    interface Request {
      validatedBody?: any;
      validatedQuery?: any;
      validatedParams?: any;
    }
  }
}


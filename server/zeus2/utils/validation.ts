/**
 * Validation schemas using Zod
 * 
 * Централизованная валидация входных данных для всех API endpoints
 */

import { z } from 'zod';

// ==================== COMMON SCHEMAS ====================

/** UUID схема с валидацией формата */
export const uuidSchema = z.string().uuid({ message: 'Некорректный формат UUID' });

/** Опциональный UUID (может быть null) */
export const optionalUuidSchema = z.string().uuid().nullable().optional();

/** Схема пагинации */
export const paginationSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(10000).default(1000)
});

// ==================== ISSUE SCHEMAS ====================

/** Схема создания issue */
export const createIssueSchema = z.object({
  uuid: uuidSchema.optional(),
  type_uuid: uuidSchema,
  project_uuid: uuidSchema,
  status_uuid: uuidSchema,
  sprint_uuid: optionalUuidSchema,
  author_uuid: optionalUuidSchema,
  parent_uuid: optionalUuidSchema,
  title: z.string().max(500).default(''),
  description: z.string().max(100000).default(''),
  spent_time: z.number().min(0).default(0),
  values: z.array(z.object({
    uuid: uuidSchema.optional(),
    field_uuid: uuidSchema,
    value: z.union([z.string(), z.number(), z.boolean(), z.null()])
  })).optional()
});

/** Схема обновления issue */
export const updateIssueSchema = z.object({
  type_uuid: uuidSchema.optional(),
  project_uuid: uuidSchema.optional(),
  status_uuid: uuidSchema.optional(),
  sprint_uuid: optionalUuidSchema,
  author_uuid: optionalUuidSchema,
  parent_uuid: optionalUuidSchema,
  title: z.string().max(500).optional(),
  description: z.string().max(100000).optional(),
  spent_time: z.number().min(0).optional(),
  resolved_at: z.string().datetime().nullable().optional(),
  values: z.array(z.object({
    uuid: uuidSchema.optional(),
    field_uuid: uuidSchema,
    value: z.union([z.string(), z.number(), z.boolean(), z.null()])
  })).optional()
});

// ==================== USER SCHEMAS ====================

/** Схема создания пользователя */
export const createUserSchema = z.object({
  uuid: uuidSchema.optional(),
  name: z.string().min(1, 'Имя обязательно').max(255),
  login: z.string().max(255).optional(),
  mail: z.string().email('Некорректный email').optional().or(z.literal('')),
  active: z.boolean().default(true),
  avatar: z.string().url().nullable().optional(),
  telegram: z.string().max(255).optional(),
  discord: z.string().max(255).optional(),
  roles: z.array(
    z.union([
      uuidSchema,
      z.object({ uuid: uuidSchema })
    ])
  ).optional()
});

/** Схема обновления пользователя */
export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  login: z.string().max(255).optional(),
  mail: z.string().email().optional().or(z.literal('')),
  active: z.boolean().optional(),
  avatar: z.string().url().nullable().optional(),
  telegram: z.string().max(255).optional(),
  discord: z.string().max(255).optional(),
  telegram_id: z.string().max(255).optional(),
  discord_id: z.string().max(255).optional(),
  roles: z.array(
    z.union([
      uuidSchema,
      z.object({ uuid: uuidSchema })
    ])
  ).optional()
});

// ==================== PROJECT SCHEMAS ====================

/** Схема создания проекта */
export const createProjectSchema = z.object({
  uuid: uuidSchema.optional(),
  name: z.string().min(1, 'Название обязательно').max(255),
  short_name: z.string().min(1, 'Код обязателен').max(10).regex(/^[A-Z0-9]+$/, 'Код должен содержать только заглавные буквы и цифры'),
  owner_uuid: optionalUuidSchema,
  description: z.string().max(10000).optional(),
  avatar: z.string().url().nullable().optional()
});

/** Схема обновления проекта */
export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  short_name: z.string().min(1).max(10).regex(/^[A-Z0-9]+$/).optional(),
  owner_uuid: optionalUuidSchema,
  description: z.string().max(10000).optional(),
  avatar: z.string().url().nullable().optional()
});

// ==================== ISSUE TYPE SCHEMAS ====================

/** Схема создания типа задачи */
export const createIssueTypeSchema = z.object({
  uuid: uuidSchema.optional(),
  name: z.string().min(1, 'Название обязательно').max(255),
  workflow_uuid: uuidSchema,
  description: z.string().max(10000).optional(),
  icon: z.string().max(50).optional()
});

// ==================== STATUS SCHEMAS ====================

/** Схема создания статуса */
export const createStatusSchema = z.object({
  uuid: uuidSchema.optional(),
  name: z.string().min(1, 'Название обязательно').max(255),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Цвет должен быть в формате #RRGGBB').optional(),
  is_initial: z.boolean().default(false),
  is_final: z.boolean().default(false),
  order_num: z.number().int().min(0).optional()
});

// ==================== WORKFLOW SCHEMAS ====================

/** Схема создания workflow */
export const createWorkflowSchema = z.object({
  uuid: uuidSchema.optional(),
  name: z.string().min(1, 'Название обязательно').max(255),
  description: z.string().max(10000).optional()
});

// ==================== SPRINT SCHEMAS ====================

/** Схема создания спринта */
export const createSprintSchema = z.object({
  uuid: uuidSchema.optional(),
  name: z.string().min(1, 'Название обязательно').max(255),
  project_uuid: uuidSchema,
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  goal: z.string().max(10000).optional()
});

// ==================== ROLE SCHEMAS ====================

/** Схема создания роли */
export const createRoleSchema = z.object({
  uuid: uuidSchema.optional(),
  name: z.string().min(1, 'Название обязательно').max(255),
  description: z.string().max(10000).optional(),
  permissions: z.array(
    z.union([
      uuidSchema,
      z.object({ uuid: uuidSchema })
    ])
  ).optional()
});

// ==================== FIELD SCHEMAS ====================

/** Схема создания поля */
export const createFieldSchema = z.object({
  uuid: uuidSchema.optional(),
  name: z.string().min(1, 'Название обязательно').max(255),
  type_uuid: uuidSchema,
  is_custom: z.boolean().default(true),
  is_required: z.boolean().default(false),
  default_value: z.string().optional(),
  options: z.array(z.string()).optional() // Для полей типа Select
});

// ==================== BOARD SCHEMAS ====================

/** Схема создания доски */
export const createBoardSchema = z.object({
  uuid: uuidSchema.optional(),
  name: z.string().min(1, 'Название обязательно').max(255),
  project_uuid: optionalUuidSchema,
  filter_query: z.string().max(10000).optional(),
  columns: z.array(z.object({
    status_uuid: uuidSchema,
    order_num: z.number().int().min(0)
  })).optional()
});

// ==================== DASHBOARD SCHEMAS ====================

/** Схема создания дашборда */
export const createDashboardSchema = z.object({
  uuid: uuidSchema.optional(),
  name: z.string().min(1, 'Название обязательно').max(255),
  description: z.string().max(10000).optional(),
  is_default: z.boolean().default(false)
});

// ==================== TIME ENTRY SCHEMAS ====================

/** Схема создания записи времени */
export const createTimeEntrySchema = z.object({
  uuid: uuidSchema.optional(),
  issue_uuid: uuidSchema,
  user_uuid: uuidSchema,
  hours: z.number().min(0).max(24),
  date: z.string().datetime(),
  comment: z.string().max(1000).optional()
});

// ==================== ATTACHMENT SCHEMAS ====================

/** Схема создания вложения */
export const createAttachmentSchema = z.object({
  uuid: uuidSchema.optional(),
  issue_uuid: uuidSchema,
  filename: z.string().min(1).max(255),
  mime_type: z.string().max(100),
  size: z.number().int().min(0),
  url: z.string().url().optional()
});

// ==================== HELPERS ====================

/**
 * Валидирует данные и возвращает результат или ошибки
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): 
  { success: true; data: T } | { success: false; errors: { field: string; message: string }[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.issues.map((err: z.ZodIssue) => ({
    field: err.path.join('.'),
    message: err.message
  }));
  
  return { success: false, errors };
}

/**
 * Middleware для валидации body запроса
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = validateData(schema, req.body);
    
    if (!result.success) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Ошибка валидации',
        trace_id: req.headers['x-trace-id'] || '',
        details: result.errors
      });
    }
    
    req.validatedBody = result.data;
    next();
  };
}

/**
 * Middleware для валидации query параметров
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = validateData(schema, req.query);
    
    if (!result.success) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Ошибка валидации параметров',
        trace_id: req.headers['x-trace-id'] || '',
        details: result.errors
      });
    }
    
    req.validatedQuery = result.data;
    next();
  };
}

/**
 * Middleware для валидации params
 */
export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = validateData(schema, req.params);
    
    if (!result.success) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Ошибка валидации параметров пути',
        trace_id: req.headers['x-trace-id'] || '',
        details: result.errors
      });
    }
    
    req.validatedParams = result.data;
    next();
  };
}


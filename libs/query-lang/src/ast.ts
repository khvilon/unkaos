/**
 * AST (Abstract Syntax Tree) Types for Issue Query Language
 * 
 * Примеры запросов и их AST:
 * 
 * 1. Простое сравнение:
 *    "Проект = 'MyProject'"
 *    → { type: 'comparison', field: {...}, operator: 'eq', value: {...} }
 * 
 * 2. Логическое выражение:
 *    "Проект = 'A' AND Статус != 'Done'"
 *    → { type: 'logical', operator: 'and', left: {...}, right: {...} }
 * 
 * 3. С сортировкой:
 *    "Проект = 'A' ORDER BY Создана DESC"
 *    → { type: 'query', filter: {...}, orderBy: [{...}] }
 */

// ============================================
// Базовые типы
// ============================================

export type ASTNodeType = 
  | 'query'           // Корневой узел запроса
  | 'logical'         // Логическое выражение (AND, OR)
  | 'not'             // NOT выражение
  | 'comparison'      // Сравнение (field op value)
  | 'field'           // Поле (атрибут или кастомное)
  | 'value'           // Значение
  | 'function'        // Функция (для будущего расширения)
  | 'list'            // Список значений (для IN)
  | 'orderBy';        // Элемент сортировки

export type ComparisonOperator = 
  | 'eq'              // =
  | 'neq'             // !=
  | 'lt'              // <
  | 'lte'             // <=
  | 'gt'              // >
  | 'gte'             // >=
  | 'like'            // LIKE
  | 'notLike'         // NOT LIKE
  | 'in'              // IN
  | 'notIn'           // NOT IN
  | 'isNull'          // IS NULL
  | 'isNotNull';      // IS NOT NULL

export type LogicalOperator = 'and' | 'or';

export type ValueType = 
  | 'string'
  | 'number'
  | 'date'
  | 'uuid'
  | 'boolean'
  | 'null'
  | 'resolved'        // Специальное значение (resolved)
  | 'identifier';     // Ссылка на другое поле

export type FieldSource = 
  | 'attribute'       // Встроенный атрибут (project_uuid, status_uuid, etc.)
  | 'custom'          // Кастомное поле (fields#uuid#)
  | 'identifier';     // Идентификатор (ещё не разрешён)

export type SortDirection = 'asc' | 'desc';

// ============================================
// AST Nodes
// ============================================

export interface BaseNode {
  type: ASTNodeType;
  // Позиция в исходном тексте (для сообщений об ошибках)
  startOffset?: number;
  endOffset?: number;
}

/**
 * Корневой узел запроса
 */
export interface QueryNode extends BaseNode {
  type: 'query';
  filter: FilterNode | null;      // WHERE часть
  orderBy: OrderByNode[];         // ORDER BY часть
}

/**
 * Фильтрующее выражение (может быть логическим или сравнением)
 */
export type FilterNode = LogicalNode | NotNode | ComparisonNode;

/**
 * Логическое выражение (AND, OR)
 */
export interface LogicalNode extends BaseNode {
  type: 'logical';
  operator: LogicalOperator;
  left: FilterNode;
  right: FilterNode;
}

/**
 * NOT выражение
 */
export interface NotNode extends BaseNode {
  type: 'not';
  operand: FilterNode;
}

/**
 * Сравнение поля со значением
 */
export interface ComparisonNode extends BaseNode {
  type: 'comparison';
  field: FieldNode;
  operator: ComparisonOperator;
  value: ValueNode | ListNode;
  typeCast?: string;              // ::numeric, ::date, etc.
}

/**
 * Поле (атрибут или кастомное поле)
 */
export interface FieldNode extends BaseNode {
  type: 'field';
  source: FieldSource;
  name: string;                   // Имя атрибута или UUID кастомного поля
  displayName?: string;           // Отображаемое имя (для автокомплита)
}

/**
 * Значение
 */
export interface ValueNode extends BaseNode {
  type: 'value';
  valueType: ValueType;
  value: string | number | boolean | null;
  raw?: string;                   // Исходное текстовое представление
}

/**
 * Список значений (для IN оператора)
 */
export interface ListNode extends BaseNode {
  type: 'list';
  items: ValueNode[];
}

/**
 * Элемент сортировки
 */
export interface OrderByNode extends BaseNode {
  type: 'orderBy';
  field: FieldNode;
  direction: SortDirection;
}

// ============================================
// Результат парсинга
// ============================================

export interface ParseError {
  message: string;
  offset: number;
  line?: number;
  column?: number;
  token?: string;
}

export interface ParseResult {
  success: boolean;
  ast: QueryNode | null;
  errors: ParseError[];
}

// ============================================
// Контекст для генерации SQL
// ============================================

export interface FieldMapping {
  name: string;                   // Отображаемое имя (Проект, Статус)
  field: string;                  // SQL имя (project_uuid, status_uuid)
  type: string;                   // Тип данных (User, Project, Status, etc.)
  source: FieldSource;            // attribute или custom
  uuid?: string;                  // UUID для кастомных полей
  lookupTable?: string;           // Таблица для поиска по названию (projects, users, etc.)
  lookupField?: string;           // Поле для поиска (name по умолчанию)
}

export interface SQLGeneratorContext {
  subdomain: string;              // Схема БД
  tableAlias: string;             // Алиас таблицы (I)
  fieldMappings: FieldMapping[];  // Маппинги полей
  customFieldsTable?: string;     // Таблица для кастомных полей
}

// ============================================
// Helper functions для создания AST узлов
// ============================================

export function createQueryNode(filter: FilterNode | null, orderBy: OrderByNode[] = []): QueryNode {
  return { type: 'query', filter, orderBy };
}

export function createLogicalNode(operator: LogicalOperator, left: FilterNode, right: FilterNode): LogicalNode {
  return { type: 'logical', operator, left, right };
}

export function createNotNode(operand: FilterNode): NotNode {
  return { type: 'not', operand };
}

export function createComparisonNode(
  field: FieldNode,
  operator: ComparisonOperator,
  value: ValueNode | ListNode,
  typeCast?: string
): ComparisonNode {
  return { type: 'comparison', field, operator, value, typeCast };
}

export function createFieldNode(source: FieldSource, name: string, displayName?: string): FieldNode {
  return { type: 'field', source, name, displayName };
}

export function createValueNode(valueType: ValueType, value: string | number | boolean | null, raw?: string): ValueNode {
  return { type: 'value', valueType, value, raw };
}

export function createListNode(items: ValueNode[]): ListNode {
  return { type: 'list', items };
}

export function createOrderByNode(field: FieldNode, direction: SortDirection = 'asc'): OrderByNode {
  return { type: 'orderBy', field, direction };
}


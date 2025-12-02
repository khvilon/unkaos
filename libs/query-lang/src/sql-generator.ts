/**
 * SQL Generator - преобразует AST в SQL
 * 
 * Генерирует PostgreSQL-совместимый SQL из AST запроса
 * Поддерживает:
 * - Маппинг русских имён полей на SQL колонки
 * - Поиск по названиям справочников (проекты, статусы и т.д.)
 * - Кастомные поля (обращение по UUID)
 */

import {
  QueryNode,
  FilterNode,
  LogicalNode,
  NotNode,
  ComparisonNode,
  FieldNode,
  ValueNode,
  ListNode,
  OrderByNode,
  ComparisonOperator,
  SQLGeneratorContext,
  FieldMapping
} from './ast';

// ============================================
// SQL Generation Result
// ============================================

export interface SQLGenerationResult {
  whereClause: string;
  orderByClause: string;
  parameters: any[];            // Для параметризованных запросов
  usedFields: FieldNode[];      // Какие поля использованы
  hasCustomFields: boolean;     // Есть ли кастомные поля
}

// ============================================
// Default field mappings (атрибуты issues)
// ============================================

export const DEFAULT_ISSUE_FIELDS: FieldMapping[] = [
  // Русские имена с указанием таблицы для поиска по названию
  { name: 'Автор', field: 'author_uuid', type: 'User', source: 'attribute', lookupTable: 'users', lookupField: 'name' },
  { name: 'Название', field: 'title', type: 'String', source: 'attribute' },
  { name: 'Описание', field: 'description', type: 'String', source: 'attribute' },
  { name: 'Тип', field: 'type_uuid', type: 'Type', source: 'attribute', lookupTable: 'issue_types', lookupField: 'name' },
  { name: 'Создана', field: 'created_at', type: 'Timestamp', source: 'attribute' },
  { name: 'Изменена', field: 'updated_at', type: 'Timestamp', source: 'attribute' },
  { name: 'Проект', field: 'project_uuid', type: 'Project', source: 'attribute', lookupTable: 'projects', lookupField: 'name' },
  { name: 'Статус', field: 'status_uuid', type: 'Status', source: 'attribute', lookupTable: 'issue_statuses', lookupField: 'name' },
  { name: 'Спринт', field: 'sprint_uuid', type: 'Sprint', source: 'attribute', lookupTable: 'sprints', lookupField: 'name' },
  { name: 'Тэг', field: 'tags', type: 'Tag', source: 'attribute' },
  { name: 'Тег', field: 'tags', type: 'Tag', source: 'attribute' },
  
  // Английские имена
  { name: 'author', field: 'author_uuid', type: 'User', source: 'attribute', lookupTable: 'users', lookupField: 'name' },
  { name: 'author_uuid', field: 'author_uuid', type: 'User', source: 'attribute' },
  { name: 'author_name', field: 'author_name', type: 'String', source: 'attribute' },
  { name: 'title', field: 'title', type: 'String', source: 'attribute' },
  { name: 'description', field: 'description', type: 'String', source: 'attribute' },
  { name: 'type', field: 'type_uuid', type: 'Type', source: 'attribute', lookupTable: 'issue_types', lookupField: 'name' },
  { name: 'type_uuid', field: 'type_uuid', type: 'Type', source: 'attribute' },
  { name: 'type_name', field: 'type_name', type: 'String', source: 'attribute' },
  { name: 'created_at', field: 'created_at', type: 'Timestamp', source: 'attribute' },
  { name: 'updated_at', field: 'updated_at', type: 'Timestamp', source: 'attribute' },
  { name: 'project', field: 'project_uuid', type: 'Project', source: 'attribute', lookupTable: 'projects', lookupField: 'name' },
  { name: 'project_uuid', field: 'project_uuid', type: 'Project', source: 'attribute' },
  { name: 'project_name', field: 'project_name', type: 'String', source: 'attribute' },
  { name: 'status', field: 'status_uuid', type: 'Status', source: 'attribute', lookupTable: 'issue_statuses', lookupField: 'name' },
  { name: 'status_uuid', field: 'status_uuid', type: 'Status', source: 'attribute' },
  { name: 'status_name', field: 'status_name', type: 'String', source: 'attribute' },
  { name: 'sprint', field: 'sprint_uuid', type: 'Sprint', source: 'attribute', lookupTable: 'sprints', lookupField: 'name' },
  { name: 'sprint_uuid', field: 'sprint_uuid', type: 'Sprint', source: 'attribute' },
  { name: 'sprint_name', field: 'sprint_name', type: 'String', source: 'attribute' },
  { name: 'tags', field: 'tags', type: 'Tag', source: 'attribute' }
];

// ============================================
// SQL Generator Class
// ============================================

export class SQLGenerator {
  private context: SQLGeneratorContext;
  private usedFields: FieldNode[] = [];
  private hasCustomFields = false;

  constructor(context: SQLGeneratorContext) {
    this.context = {
      ...context,
      fieldMappings: [...DEFAULT_ISSUE_FIELDS, ...(context.fieldMappings || [])]
    };
  }

  /**
   * Генерирует SQL из AST
   */
  generate(ast: QueryNode): SQLGenerationResult {
    this.usedFields = [];
    this.hasCustomFields = false;

    let whereClause = '';
    let orderByClause = '';

    if (ast.filter) {
      whereClause = this.generateFilter(ast.filter);
    } else {
      whereClause = 'TRUE';
    }

    if (ast.orderBy.length > 0) {
      orderByClause = 'ORDER BY ' + ast.orderBy.map(o => this.generateOrderByItem(o)).join(', ');
    }

    return {
      whereClause,
      orderByClause,
      parameters: [],
      usedFields: this.usedFields,
      hasCustomFields: this.hasCustomFields
    };
  }

  /**
   * Генерирует WHERE clause из фильтра
   */
  private generateFilter(node: FilterNode): string {
    switch (node.type) {
      case 'logical':
        return this.generateLogical(node as LogicalNode);
      case 'not':
        return this.generateNot(node as NotNode);
      case 'comparison':
        return this.generateComparison(node as ComparisonNode);
      default:
        throw new Error(`Unknown filter type: ${(node as any).type}`);
    }
  }

  /**
   * Генерирует логическое выражение (AND, OR)
   */
  private generateLogical(node: LogicalNode): string {
    const left = this.generateFilter(node.left);
    const right = this.generateFilter(node.right);
    const op = node.operator.toUpperCase();
    return `(${left} ${op} ${right})`;
  }

  /**
   * Генерирует NOT выражение
   */
  private generateNot(node: NotNode): string {
    const inner = this.generateFilter(node.operand);
    return `NOT (${inner})`;
  }

  /**
   * Генерирует сравнение
   */
  private generateComparison(node: ComparisonNode): string {
    const mapping = this.findFieldMapping(node.field);
    const fieldSql = this.generateField(node.field, mapping);
    
    // Специальная обработка NULL
    if (node.value.type === 'value') {
      const valueNode = node.value as ValueNode;
      if (valueNode.valueType === 'null') {
        if (node.operator === 'eq' || node.operator === 'isNull') {
          return `${fieldSql} IS NULL`;
        } else if (node.operator === 'neq' || node.operator === 'isNotNull') {
          return `${fieldSql} IS NOT NULL`;
        }
      }
      
      // Специальная обработка "Решенные" для статуса
      if (valueNode.valueType === 'resolved' || 
          (valueNode.valueType === 'identifier' && 
           String(valueNode.value).toLowerCase().match(/^решен/))) {
        const resolvedSubquery = `(SELECT uuid FROM "${this.context.subdomain}".issue_statuses WHERE is_end = true)`;
        if (node.operator === 'eq') {
          return `${fieldSql} IN ${resolvedSubquery}`;
        } else if (node.operator === 'neq') {
          return `${fieldSql} NOT IN ${resolvedSubquery}`;
        }
      }
    }

    // Генерируем значение с учетом lookup таблицы
    const value = this.generateValue(node.value, mapping);
    const op = this.generateOperator(node.operator);

    // Специальная обработка для тегов
    if (mapping?.field === 'tags') {
      if (node.operator === 'eq') {
        return `${fieldSql} ~ ${value}`;
      } else if (node.operator === 'neq') {
        return `(${fieldSql} IS NULL OR ${fieldSql} !~ ${value})`;
      }
    }

    // Если поле ссылается на справочник и значение - строка (не UUID)
    if (mapping?.lookupTable && node.value.type === 'value') {
      const valueNode = node.value as ValueNode;
      const strValue = String(valueNode.value);
      
      // Если значение не UUID - делаем подзапрос по названию
      if (!this.isUUID(strValue)) {
        const lookupSubquery = `(SELECT uuid FROM "${this.context.subdomain}".${mapping.lookupTable} WHERE ${mapping.lookupField || 'name'} = '${this.escapeString(strValue)}')`;
        
        if (node.operator === 'eq') {
          return `${fieldSql} IN ${lookupSubquery}`;
        } else if (node.operator === 'neq') {
          return `${fieldSql} NOT IN ${lookupSubquery}`;
        }
      }
    }

    // Специальная обработка для дат (приведение к date для равенства)
    if (mapping?.type === 'Timestamp' && node.operator === 'eq') {
      return `${fieldSql}::date ${op} ${value}`;
    }

    return `${fieldSql} ${op} ${value}`;
  }

  /**
   * Генерирует SQL для поля
   */
  private generateField(field: FieldNode, mapping?: FieldMapping): string {
    this.usedFields.push(field);
    
    if (mapping) {
      if (mapping.source === 'custom') {
        this.hasCustomFields = true;
        // Кастомное поле - обращаемся по UUID
        return `${this.context.tableAlias}."${mapping.uuid}"`;
      }
      return `${this.context.tableAlias}.${mapping.field}`;
    }
    
    // Если не нашли маппинг - возможно это кастомное поле по имени
    // Ищем в customFields по имени
    const customField = this.context.fieldMappings.find(
      m => m.source === 'custom' && m.name.toLowerCase() === field.name.toLowerCase()
    );
    
    if (customField && customField.uuid) {
      this.hasCustomFields = true;
      return `${this.context.tableAlias}."${customField.uuid}"`;
    }
    
    // Проверяем, похоже ли на UUID
    if (this.isUUID(field.name)) {
      this.hasCustomFields = true;
      return `${this.context.tableAlias}."${field.name}"`;
    }
    
    return `${this.context.tableAlias}.${field.name}`;
  }

  /**
   * Ищет маппинг поля
   */
  private findFieldMapping(field: FieldNode): FieldMapping | undefined {
    const lowerName = field.name.toLowerCase();
    return this.context.fieldMappings.find(
      m => m.name.toLowerCase() === lowerName || m.field?.toLowerCase() === lowerName
    );
  }

  /**
   * Генерирует SQL оператор
   */
  private generateOperator(op: ComparisonOperator): string {
    switch (op) {
      case 'eq': return '=';
      case 'neq': return '!=';
      case 'lt': return '<';
      case 'lte': return '<=';
      case 'gt': return '>';
      case 'gte': return '>=';
      case 'like': return 'LIKE';
      case 'notLike': return 'NOT LIKE';
      case 'in': return 'IN';
      case 'notIn': return 'NOT IN';
      case 'isNull': return 'IS NULL';
      case 'isNotNull': return 'IS NOT NULL';
      default:
        throw new Error(`Unknown operator: ${op}`);
    }
  }

  /**
   * Генерирует SQL для значения
   */
  private generateValue(node: ValueNode | ListNode, fieldMapping?: FieldMapping): string {
    if (node.type === 'list') {
      const listNode = node as ListNode;
      const items = listNode.items.map(item => this.generateValueNode(item, fieldMapping));
      return `(${items.join(', ')})`;
    }

    return this.generateValueNode(node as ValueNode, fieldMapping);
  }

  /**
   * Генерирует SQL для одного значения
   */
  private generateValueNode(node: ValueNode, fieldMapping?: FieldMapping): string {
    switch (node.valueType) {
      case 'null':
        return 'NULL';
      
      case 'resolved':
        return "'(resolved)'";
      
      case 'string':
        return `'${this.escapeString(String(node.value))}'`;
      
      case 'number':
        return String(node.value);
      
      case 'date':
        return `'${node.value}'::date`;
      
      case 'uuid':
        return `'${node.value}'`;
      
      case 'boolean':
        return node.value ? 'TRUE' : 'FALSE';
      
      case 'identifier':
        const strValue = String(node.value);
        
        // Проверяем на UUID
        if (this.isUUID(strValue)) {
          return `'${strValue}'`;
        }
        
        // Проверяем на "Решенные"
        if (strValue.toLowerCase().match(/^решен/)) {
          return "'(resolved)'";
        }
        
        // Обычная строка
        return `'${this.escapeString(strValue)}'`;
      
      default:
        return `'${this.escapeString(String(node.value))}'`;
    }
  }

  /**
   * Проверяет, является ли строка UUID
   */
  private isUUID(str: string): boolean {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
  }

  /**
   * Экранирует строку для SQL
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "''");
  }

  /**
   * Генерирует элемент ORDER BY
   */
  private generateOrderByItem(node: OrderByNode): string {
    const mapping = this.findFieldMapping(node.field);
    let fieldSql: string;
    
    if (mapping) {
      // Для сортировки используем _name поля вместо _uuid
      let sortField = mapping.field;
      if (sortField.endsWith('_uuid')) {
        const nameField = sortField.replace('_uuid', '_name');
        // Проверяем есть ли такое поле
        const nameMapping = this.context.fieldMappings.find(m => m.field === nameField);
        if (nameMapping) {
          sortField = nameField;
        }
      }
      fieldSql = `${this.context.tableAlias}.${sortField}`;
    } else {
      fieldSql = `${this.context.tableAlias}.${node.field.name}`;
    }
    
    const direction = node.direction.toUpperCase();
    return `${fieldSql} ${direction}`;
  }
}

// ============================================
// Convenience function
// ============================================

export function generateSQL(ast: QueryNode, context: SQLGeneratorContext): SQLGenerationResult {
  const generator = new SQLGenerator(context);
  return generator.generate(ast);
}

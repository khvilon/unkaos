/**
 * Query Validator - валидация запросов
 * 
 * Проверяет:
 * - Синтаксис запроса
 * - Соответствие типов полей и значений
 * - Допустимость операторов для типов полей
 */

import { QueryNode, FilterNode, ComparisonNode, ValueNode, FieldMapping, ComparisonOperator } from './ast';
import { DEFAULT_ISSUE_FIELDS } from './sql-generator';

// ============================================
// Типы результатов валидации
// ============================================

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  value?: string;
  expectedType?: string;
  actualType?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============================================
// Допустимые операторы для типов полей
// ============================================

const OPERATORS_BY_TYPE: Record<string, ComparisonOperator[]> = {
  'String': ['eq', 'neq', 'like', 'notLike', 'isNull', 'isNotNull'],
  'Text': ['eq', 'neq', 'like', 'notLike', 'isNull', 'isNotNull'],
  'Numeric': ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'isNull', 'isNotNull'],
  'Timestamp': ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'isNull', 'isNotNull'],
  'Date': ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'isNull', 'isNotNull'],
  'Time': ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'isNull', 'isNotNull'],
  'Boolean': ['eq', 'neq', 'isNull', 'isNotNull'],
  'User': ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
  'Project': ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
  'Status': ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
  'Type': ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
  'Sprint': ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
  'Tag': ['eq', 'neq', 'like', 'notLike', 'isNull', 'isNotNull'],
  'Select': ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
  'Duration': ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'isNull', 'isNotNull'],
};

// ============================================
// Валидаторы значений по типам
// ============================================

const VALUE_VALIDATORS: Record<string, (value: any) => boolean> = {
  'Timestamp': (value) => {
    if (value === null) return true;
    // Проверяем формат даты
    const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
    if (typeof value === 'string' && dateRegex.test(value)) return true;
    // Проверяем что это валидная дата
    const date = new Date(value);
    return !isNaN(date.getTime());
  },
  'Date': (value) => {
    if (value === null) return true;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof value === 'string' && dateRegex.test(value)) return true;
    const date = new Date(value);
    return !isNaN(date.getTime());
  },
  'Time': (value) => {
    if (value === null) return true;
    const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
    return typeof value === 'string' && timeRegex.test(value);
  },
  'Numeric': (value) => {
    if (value === null) return true;
    return !isNaN(Number(value));
  },
  'Duration': (value) => {
    if (value === null) return true;
    return !isNaN(Number(value));
  },
  'Boolean': (value) => {
    if (value === null) return true;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      return ['true', 'false', '1', '0', 'да', 'нет', 'yes', 'no'].includes(lower);
    }
    return false;
  },
  'String': () => true,
  'Text': () => true,
  'User': () => true,
  'Project': () => true,
  'Status': () => true,
  'Type': () => true,
  'Sprint': () => true,
  'Tag': () => true,
  'Select': () => true,
};

// ============================================
// Класс валидатора
// ============================================

export class QueryValidator {
  private fieldMappings: FieldMapping[];
  
  constructor(customFields?: FieldMapping[]) {
    this.fieldMappings = [...DEFAULT_ISSUE_FIELDS, ...(customFields || [])];
  }
  
  /**
   * Валидирует AST запроса
   */
  validate(ast: QueryNode): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    if (ast.filter) {
      this.validateFilter(ast.filter, errors, warnings);
    }
    
    // Валидация ORDER BY
    for (const orderBy of ast.orderBy) {
      const mapping = this.findFieldMapping(orderBy.field.name);
      if (!mapping) {
        warnings.push({
          code: 'UNKNOWN_FIELD',
          message: `Неизвестное поле для сортировки: "${orderBy.field.name}"`,
          field: orderBy.field.name
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Валидирует фильтр
   */
  private validateFilter(filter: FilterNode, errors: ValidationError[], warnings: ValidationError[]): void {
    switch (filter.type) {
      case 'logical':
        const logical = filter as any;
        this.validateFilter(logical.left, errors, warnings);
        this.validateFilter(logical.right, errors, warnings);
        break;
        
      case 'not':
        const not = filter as any;
        this.validateFilter(not.operand, errors, warnings);
        break;
        
      case 'comparison':
        this.validateComparison(filter as ComparisonNode, errors, warnings);
        break;
    }
  }
  
  /**
   * Валидирует сравнение
   */
  private validateComparison(comparison: ComparisonNode, errors: ValidationError[], warnings: ValidationError[]): void {
    const fieldName = comparison.field.name;
    const mapping = this.findFieldMapping(fieldName);
    
    // Проверка существования поля
    if (!mapping) {
      warnings.push({
        code: 'UNKNOWN_FIELD',
        message: `Неизвестное поле: "${fieldName}"`,
        field: fieldName
      });
      return;
    }
    
    const fieldType = mapping.type;
    
    // Проверка допустимости оператора
    const allowedOperators = OPERATORS_BY_TYPE[fieldType] || OPERATORS_BY_TYPE['String'];
    if (!allowedOperators.includes(comparison.operator)) {
      errors.push({
        code: 'INVALID_OPERATOR',
        message: `Оператор "${this.operatorToString(comparison.operator)}" не поддерживается для поля "${fieldName}" (тип: ${fieldType})`,
        field: fieldName
      });
    }
    
    // Проверка значения
    if (comparison.value.type === 'value') {
      const valueNode = comparison.value as ValueNode;
      this.validateValue(valueNode, fieldType, fieldName, errors, warnings);
    }
  }
  
  /**
   * Валидирует значение
   */
  private validateValue(
    value: ValueNode, 
    fieldType: string, 
    fieldName: string,
    errors: ValidationError[], 
    warnings: ValidationError[]
  ): void {
    // NULL всегда допустим
    if (value.valueType === 'null') return;
    
    // "Решенные" допустимо для Status
    if (value.valueType === 'resolved' && fieldType === 'Status') return;
    
    // Проверка валидатором типа
    const validator = VALUE_VALIDATORS[fieldType];
    if (validator && !validator(value.value)) {
      errors.push({
        code: 'INVALID_VALUE_TYPE',
        message: `Недопустимое значение "${value.value}" для поля "${fieldName}" (ожидается: ${this.getExpectedFormat(fieldType)})`,
        field: fieldName,
        value: String(value.value),
        expectedType: fieldType,
        actualType: value.valueType
      });
    }
  }
  
  /**
   * Находит маппинг поля
   */
  private findFieldMapping(fieldName: string): FieldMapping | undefined {
    const lowerName = fieldName.toLowerCase();
    return this.fieldMappings.find(
      m => m.name.toLowerCase() === lowerName || m.field?.toLowerCase() === lowerName
    );
  }
  
  /**
   * Преобразует оператор в строку
   */
  private operatorToString(op: ComparisonOperator): string {
    const map: Record<ComparisonOperator, string> = {
      'eq': '=',
      'neq': '!=',
      'lt': '<',
      'lte': '<=',
      'gt': '>',
      'gte': '>=',
      'like': 'like',
      'notLike': 'not like',
      'in': 'in',
      'notIn': 'not in',
      'isNull': 'is null',
      'isNotNull': 'is not null'
    };
    return map[op] || op;
  }
  
  /**
   * Возвращает ожидаемый формат для типа
   */
  private getExpectedFormat(fieldType: string): string {
    const formats: Record<string, string> = {
      'Timestamp': 'дата в формате YYYY-MM-DD или YYYY-MM-DDTHH:MM:SS',
      'Date': 'дата в формате YYYY-MM-DD',
      'Time': 'время в формате HH:MM или HH:MM:SS',
      'Numeric': 'число',
      'Duration': 'число (минуты)',
      'Boolean': 'true/false или да/нет'
    };
    return formats[fieldType] || 'текст';
  }
}

// ============================================
// Convenience function
// ============================================

export function validateQuery(ast: QueryNode, customFields?: FieldMapping[]): ValidationResult {
  const validator = new QueryValidator(customFields);
  return validator.validate(ast);
}


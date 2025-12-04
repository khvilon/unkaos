/**
 * Unit tests for SQL Generator
 */

import { generateSQL, SQLGenerationResult } from '../sql-generator';
import { parseQuery } from '../parser';
import { FieldMapping, SQLGeneratorContext, QueryNode } from '../ast';

describe('SQL Generator', () => {
  const defaultFieldMappings: FieldMapping[] = [
    { name: 'Проект', field: 'project_uuid', type: 'Project', source: 'attribute', lookupTable: 'projects', lookupField: 'name' },
    { name: 'Статус', field: 'status_uuid', type: 'Status', source: 'attribute', lookupTable: 'issue_statuses', lookupField: 'name' },
    { name: 'Автор', field: 'author_uuid', type: 'User', source: 'attribute', lookupTable: 'users', lookupField: 'name' },
    { name: 'Создана', field: 'created_at', type: 'Timestamp', source: 'attribute' },
    { name: 'Изменена', field: 'updated_at', type: 'Timestamp', source: 'attribute' },
    { name: 'Название', field: 'title', type: 'Text', source: 'attribute' },
    { name: 'Номер', field: 'num', type: 'Number', source: 'attribute' },
    { name: 'Приоритет', field: 'priority', type: 'Text', source: 'attribute' }
  ];

  const createContext = (schema: string = 'test_schema'): SQLGeneratorContext => ({
    subdomain: schema,
    tableAlias: 'I',
    fieldMappings: defaultFieldMappings
  });

  it('should generate SQL for simple equality', () => {
    const result = parseQuery("Название = 'Test'");
    expect(result.success).toBe(true);
    expect(result.ast).toBeDefined();
    
    const sql = generateSQL(result.ast as QueryNode, createContext());
    expect(sql.whereClause).toContain('title');
    expect(sql.whereClause).toContain('Test');
    expect(sql.whereClause).toContain('=');
  });

  it('should generate SQL for not equal', () => {
    const result = parseQuery("Название != 'Test'");
    expect(result.success).toBe(true);
    
    const sql = generateSQL(result.ast as QueryNode, createContext());
    expect(sql.whereClause).toContain('!=');
  });

  it('should generate SQL for comparison operators', () => {
    const result = parseQuery("Создана > 2024-01-01");
    expect(result.success).toBe(true);
    
    const sql = generateSQL(result.ast as QueryNode, createContext());
    expect(sql.whereClause).toContain('created_at');
    expect(sql.whereClause).toContain('>');
    expect(sql.whereClause).toContain('2024-01-01');
  });

  it('should generate SQL for LIKE operator', () => {
    const result = parseQuery("Название LIKE '%test%'");
    expect(result.success).toBe(true);
    
    const sql = generateSQL(result.ast as QueryNode, createContext());
    expect(sql.whereClause.toUpperCase()).toContain('LIKE');
    expect(sql.whereClause.toUpperCase()).toContain('%TEST%');
  });

  it('should generate SQL for AND expression', () => {
    const result = parseQuery("Название = 'A' AND Приоритет = 'B'");
    expect(result.success).toBe(true);
    
    const sql = generateSQL(result.ast as QueryNode, createContext());
    expect(sql.whereClause).toContain('AND');
    expect(sql.whereClause).toContain('title');
    expect(sql.whereClause).toContain('priority');
  });

  it('should generate SQL for OR expression', () => {
    const result = parseQuery("Название = 'A' OR Название = 'B'");
    expect(result.success).toBe(true);
    
    const sql = generateSQL(result.ast as QueryNode, createContext());
    expect(sql.whereClause).toContain('OR');
  });

  it('should generate SQL with parentheses', () => {
    const result = parseQuery("(Название = 'A' OR Название = 'B') AND Приоритет = 'C'");
    expect(result.success).toBe(true);
    
    const sql = generateSQL(result.ast as QueryNode, createContext());
    expect(sql.whereClause).toContain('(');
    expect(sql.whereClause).toContain(')');
    expect(sql.whereClause).toContain('AND');
    expect(sql.whereClause).toContain('OR');
  });

  it('should generate subquery for lookup fields', () => {
    const result = parseQuery("Проект = 'Test Project'");
    expect(result.success).toBe(true);
    
    const sql = generateSQL(result.ast as QueryNode, createContext());
    expect(sql.whereClause).toContain('SELECT');
    expect(sql.whereClause).toContain('projects');
    expect(sql.whereClause).toContain('Test Project');
  });

  it('should handle NULL values', () => {
    const result = parseQuery("Приоритет = NULL");
    expect(result.success).toBe(true);
    
    const sql = generateSQL(result.ast as QueryNode, createContext());
    expect(sql.whereClause).toContain('IS NULL');
  });

  it('should handle NOT NULL', () => {
    const result = parseQuery("Приоритет != NULL");
    expect(result.success).toBe(true);
    
    const sql = generateSQL(result.ast as QueryNode, createContext());
    expect(sql.whereClause).toContain('IS NOT NULL');
  });

  it('should return TRUE for empty query AST', () => {
    const result = parseQuery("");
    expect(result.success).toBe(true);
    // Empty query returns QueryNode with filter: null
    if (result.ast) {
      const sql = generateSQL(result.ast, createContext());
      expect(sql.whereClause).toBe('TRUE');
    }
  });
});

describe('SQL Injection Prevention in Generator', () => {
  const fieldMappings: FieldMapping[] = [
    { name: 'Field', field: 'field_column', type: 'Text', source: 'attribute' }
  ];
  
  const context: SQLGeneratorContext = {
    subdomain: 'safe_schema',
    tableAlias: 'I',
    fieldMappings
  };

  it('should escape single quotes in string values', () => {
    const result = parseQuery("Field = 'test''value'");
    if (result.success && result.ast) {
      const sql = generateSQL(result.ast, context);
      // Should not have unescaped quotes that could break SQL
      expect(sql.whereClause).not.toContain("'test'value'");
    }
  });
});

describe('Custom Field Handling', () => {
  it('should use UUID as column name for custom fields', () => {
    const customFieldMappings: FieldMapping[] = [
      { 
        name: 'CustomField',
        field: 'b6ddb33f-eea9-40c0-b1c2-d9ab983026a1', 
        type: 'Text',
        source: 'custom',
        uuid: 'b6ddb33f-eea9-40c0-b1c2-d9ab983026a1'
      }
    ];

    const context: SQLGeneratorContext = {
      subdomain: 'schema',
      tableAlias: 'I',
      fieldMappings: customFieldMappings
    };

    const result = parseQuery("CustomField = 'value'");
    if (result.success && result.ast) {
      const sql = generateSQL(result.ast, context);
      expect(sql.whereClause).toContain('b6ddb33f-eea9-40c0-b1c2-d9ab983026a1');
    }
  });
});




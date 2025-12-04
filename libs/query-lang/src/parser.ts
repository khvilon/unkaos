/**
 * Issue Query Language Parser
 * 
 * Использует Chevrotain для построения AST из токенов
 * 
 * Грамматика:
 * 
 * query       = filterExpr? orderByClause?
 * filterExpr  = orExpr
 * orExpr      = andExpr (OR andExpr)*
 * andExpr     = notExpr (AND notExpr)*
 * notExpr     = NOT? primaryExpr
 * primaryExpr = comparison | '(' filterExpr ')'
 * comparison  = field operator value
 * field       = Identifier
 * operator    = '=' | '!=' | '<' | '<=' | '>' | '>=' | LIKE | NOT LIKE | IN | NOT IN | IS | IS NOT
 * value       = StringLiteral | NumberLiteral | DateLiteral | UuidLiteral | NULL | Resolved | Identifier | '(' valueList ')'
 * valueList   = value (',' value)*
 * orderByClause = ORDER BY orderByItem (',' orderByItem)*
 * orderByItem = field (ASC | DESC)?
 */

import { CstParser, IRecognitionException } from 'chevrotain';
import {
  allTokens,
  And,
  Or,
  Not,
  OrderBy,
  Desc,
  Asc,
  Null,
  Resolved,
  NotEquals,
  LessEquals,
  GreaterEquals,
  Equals,
  Less,
  Greater,
  Like,
  NotLike,
  In,
  NotIn,
  Is,
  LParen,
  RParen,
  Comma,
  StringLiteral,
  DoubleQuotedString,
  NumberLiteral,
  DateLiteral,
  UuidLiteral,
  Identifier
} from './tokens';

import {
  QueryNode,
  FilterNode,
  ComparisonNode,
  FieldNode,
  ValueNode,
  ListNode,
  OrderByNode,
  ComparisonOperator,
  SortDirection,
  ParseResult,
  createQueryNode,
  createLogicalNode,
  createNotNode,
  createComparisonNode,
  createFieldNode,
  createValueNode,
  createListNode,
  createOrderByNode
} from './ast';

// ============================================
// CST Parser (Concrete Syntax Tree)
// ============================================

class QueryCstParser extends CstParser {
  constructor() {
    super(allTokens, {
      maxLookahead: 3,
      recoveryEnabled: true
    });
    this.performSelfAnalysis();
  }

  // Главное правило
  public query = this.RULE('query', () => {
    this.OPTION(() => {
      this.SUBRULE(this.filterExpr);
    });
    this.OPTION1(() => {
      this.SUBRULE(this.orderByClause);
    });
  });

  // Фильтрующее выражение (OR имеет наименьший приоритет)
  private filterExpr = this.RULE('filterExpr', () => {
    this.SUBRULE(this.orExpr);
  });

  // OR выражение
  private orExpr = this.RULE('orExpr', () => {
    this.SUBRULE(this.andExpr, { LABEL: 'lhs' });
    this.MANY(() => {
      this.CONSUME(Or);
      this.SUBRULE1(this.andExpr, { LABEL: 'rhs' });
    });
  });

  // AND выражение
  private andExpr = this.RULE('andExpr', () => {
    this.SUBRULE(this.notExpr, { LABEL: 'lhs' });
    this.MANY(() => {
      this.CONSUME(And);
      this.SUBRULE1(this.notExpr, { LABEL: 'rhs' });
    });
  });

  // NOT выражение
  private notExpr = this.RULE('notExpr', () => {
    this.OPTION(() => {
      this.CONSUME(Not);
    });
    this.SUBRULE(this.primaryExpr);
  });

  // Первичное выражение (сравнение или группа в скобках)
  private primaryExpr = this.RULE('primaryExpr', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(LParen);
          this.SUBRULE(this.filterExpr);
          this.CONSUME(RParen);
        }
      },
      { ALT: () => this.SUBRULE(this.comparison) }
    ]);
  });

  // Сравнение: field op value
  private comparison = this.RULE('comparison', () => {
    this.SUBRULE(this.field);
    this.SUBRULE(this.comparisonOperator);
    this.SUBRULE(this.value);
  });

  // Поле
  private field = this.RULE('field', () => {
    this.CONSUME(Identifier);
  });

  // Оператор сравнения
  private comparisonOperator = this.RULE('comparisonOperator', () => {
    this.OR([
      { ALT: () => this.CONSUME(NotEquals) },
      { ALT: () => this.CONSUME(LessEquals) },
      { ALT: () => this.CONSUME(GreaterEquals) },
      { ALT: () => this.CONSUME(Equals) },
      { ALT: () => this.CONSUME(Less) },
      { ALT: () => this.CONSUME(Greater) },
      { ALT: () => this.CONSUME(Like) },
      { ALT: () => this.CONSUME(NotLike) },
      { ALT: () => this.CONSUME(NotIn) },
      { ALT: () => this.CONSUME(In) },
      { 
        ALT: () => {
          this.CONSUME(Is);
          this.OPTION(() => this.CONSUME(Not));
        }
      }
    ]);
  });

  // Значение
  private value = this.RULE('value', () => {
    this.OR([
      { ALT: () => this.CONSUME(Null) },
      { ALT: () => this.CONSUME(Resolved) },
      { ALT: () => this.CONSUME(UuidLiteral) },
      { ALT: () => this.CONSUME(DateLiteral) },
      { ALT: () => this.CONSUME(NumberLiteral) },
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(DoubleQuotedString) },
      { ALT: () => this.CONSUME(Identifier) },
      {
        ALT: () => {
          this.CONSUME(LParen);
          this.SUBRULE(this.valueList);
          this.CONSUME(RParen);
        }
      }
    ]);
  });

  // Список значений (для IN)
  private valueList = this.RULE('valueList', () => {
    this.SUBRULE(this.singleValue, { LABEL: 'items' });
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE1(this.singleValue, { LABEL: 'items' });
    });
  });

  // Одиночное значение (без списка)
  private singleValue = this.RULE('singleValue', () => {
    this.OR([
      { ALT: () => this.CONSUME(Null) },
      { ALT: () => this.CONSUME(Resolved) },
      { ALT: () => this.CONSUME(UuidLiteral) },
      { ALT: () => this.CONSUME(DateLiteral) },
      { ALT: () => this.CONSUME(NumberLiteral) },
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(DoubleQuotedString) },
      { ALT: () => this.CONSUME(Identifier) }
    ]);
  });

  // ORDER BY
  private orderByClause = this.RULE('orderByClause', () => {
    this.CONSUME(OrderBy);
    this.SUBRULE(this.orderByItem, { LABEL: 'items' });
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE1(this.orderByItem, { LABEL: 'items' });
    });
  });

  // Элемент ORDER BY
  private orderByItem = this.RULE('orderByItem', () => {
    this.SUBRULE(this.field);
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(Asc) },
        { ALT: () => this.CONSUME(Desc) }
      ]);
    });
  });
}

// Singleton parser instance
const parserInstance = new QueryCstParser();

// ============================================
// CST Visitor (конвертация CST → AST)
// ============================================

const BaseCstVisitor = parserInstance.getBaseCstVisitorConstructor();

class QueryAstVisitor extends BaseCstVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  query(ctx: any): QueryNode {
    let filter: FilterNode | null = null;
    let orderBy: OrderByNode[] = [];

    if (ctx.filterExpr) {
      filter = this.visit(ctx.filterExpr);
    }

    if (ctx.orderByClause) {
      orderBy = this.visit(ctx.orderByClause);
    }

    return createQueryNode(filter, orderBy);
  }

  filterExpr(ctx: any): FilterNode {
    return this.visit(ctx.orExpr);
  }

  orExpr(ctx: any): FilterNode {
    let result = this.visit(ctx.lhs);

    if (ctx.rhs) {
      for (const rhsOperand of ctx.rhs) {
        const rhs = this.visit(rhsOperand);
        result = createLogicalNode('or', result, rhs);
      }
    }

    return result;
  }

  andExpr(ctx: any): FilterNode {
    let result = this.visit(ctx.lhs);

    if (ctx.rhs) {
      for (const rhsOperand of ctx.rhs) {
        const rhs = this.visit(rhsOperand);
        result = createLogicalNode('and', result, rhs);
      }
    }

    return result;
  }

  notExpr(ctx: any): FilterNode {
    const expr = this.visit(ctx.primaryExpr);
    
    if (ctx.Not) {
      return createNotNode(expr);
    }
    
    return expr;
  }

  primaryExpr(ctx: any): FilterNode {
    if (ctx.filterExpr) {
      return this.visit(ctx.filterExpr);
    }
    return this.visit(ctx.comparison);
  }

  comparison(ctx: any): ComparisonNode {
    const field = this.visit(ctx.field);
    const operator = this.visit(ctx.comparisonOperator);
    const value = this.visit(ctx.value);

    return createComparisonNode(field, operator, value);
  }

  field(ctx: any): FieldNode {
    const name = ctx.Identifier[0].image;
    return createFieldNode('identifier', name, name);
  }

  comparisonOperator(ctx: any): ComparisonOperator {
    if (ctx.Equals) return 'eq';
    if (ctx.NotEquals) return 'neq';
    if (ctx.Less) return 'lt';
    if (ctx.LessEquals) return 'lte';
    if (ctx.Greater) return 'gt';
    if (ctx.GreaterEquals) return 'gte';
    if (ctx.Like) return 'like';
    if (ctx.NotLike) return 'notLike';
    if (ctx.In) return 'in';
    if (ctx.NotIn) return 'notIn';
    if (ctx.Is) {
      if (ctx.Not) return 'isNotNull';
      return 'isNull';
    }
    throw new Error('Unknown operator');
  }

  value(ctx: any): ValueNode | ListNode {
    if (ctx.Null) {
      return createValueNode('null', null, 'NULL');
    }
    
    if (ctx.Resolved) {
      return createValueNode('resolved', '(resolved)', ctx.Resolved[0].image);
    }
    
    if (ctx.UuidLiteral) {
      return createValueNode('uuid', ctx.UuidLiteral[0].image, ctx.UuidLiteral[0].image);
    }
    
    if (ctx.DateLiteral) {
      return createValueNode('date', ctx.DateLiteral[0].image, ctx.DateLiteral[0].image);
    }
    
    if (ctx.NumberLiteral) {
      const raw = ctx.NumberLiteral[0].image;
      const value = parseFloat(raw);
      return createValueNode('number', value, raw);
    }
    
    if (ctx.StringLiteral) {
      const raw = ctx.StringLiteral[0].image;
      // Убираем кавычки и unescape
      const value = raw.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      return createValueNode('string', value, raw);
    }
    
    if (ctx.DoubleQuotedString) {
      const raw = ctx.DoubleQuotedString[0].image;
      const value = raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      return createValueNode('string', value, raw);
    }
    
    if (ctx.Identifier) {
      return createValueNode('identifier', ctx.Identifier[0].image, ctx.Identifier[0].image);
    }
    
    if (ctx.valueList) {
      return this.visit(ctx.valueList);
    }

    throw new Error('Unknown value type');
  }

  valueList(ctx: any): ListNode {
    const items: ValueNode[] = [];
    
    if (ctx.items) {
      for (const item of ctx.items) {
        items.push(this.visit(item) as ValueNode);
      }
    }
    
    return createListNode(items);
  }

  singleValue(ctx: any): ValueNode {
    if (ctx.Null) {
      return createValueNode('null', null, 'NULL');
    }
    
    if (ctx.Resolved) {
      return createValueNode('resolved', '(resolved)', ctx.Resolved[0].image);
    }
    
    if (ctx.UuidLiteral) {
      return createValueNode('uuid', ctx.UuidLiteral[0].image, ctx.UuidLiteral[0].image);
    }
    
    if (ctx.DateLiteral) {
      return createValueNode('date', ctx.DateLiteral[0].image, ctx.DateLiteral[0].image);
    }
    
    if (ctx.NumberLiteral) {
      const raw = ctx.NumberLiteral[0].image;
      return createValueNode('number', parseFloat(raw), raw);
    }
    
    if (ctx.StringLiteral) {
      const raw = ctx.StringLiteral[0].image;
      const value = raw.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      return createValueNode('string', value, raw);
    }
    
    if (ctx.DoubleQuotedString) {
      const raw = ctx.DoubleQuotedString[0].image;
      const value = raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      return createValueNode('string', value, raw);
    }
    
    if (ctx.Identifier) {
      return createValueNode('identifier', ctx.Identifier[0].image, ctx.Identifier[0].image);
    }

    throw new Error('Unknown single value type');
  }

  orderByClause(ctx: any): OrderByNode[] {
    const items: OrderByNode[] = [];
    
    if (ctx.items) {
      for (const item of ctx.items) {
        items.push(this.visit(item));
      }
    }
    
    return items;
  }

  orderByItem(ctx: any): OrderByNode {
    const field = this.visit(ctx.field);
    
    let direction: SortDirection = 'asc';
    if (ctx.Desc) {
      direction = 'desc';
    }
    
    return createOrderByNode(field, direction);
  }
}

// Singleton visitor instance
const visitorInstance = new QueryAstVisitor();

// ============================================
// Public API
// ============================================

export function parseQuery(input: string): ParseResult {
  // Лексический анализ
  const lexResult = require('./tokens').QueryLexer.tokenize(input);
  
  if (lexResult.errors.length > 0) {
    return {
      success: false,
      ast: null,
      errors: lexResult.errors.map((e: any) => ({
        message: e.message,
        offset: e.offset,
        line: e.line,
        column: e.column
      }))
    };
  }

  // Синтаксический анализ
  parserInstance.input = lexResult.tokens;
  const cst = parserInstance.query();

  if (parserInstance.errors.length > 0) {
    return {
      success: false,
      ast: null,
      errors: parserInstance.errors.map((e: IRecognitionException) => ({
        message: e.message,
        offset: e.token?.startOffset ?? 0,
        line: e.token?.startLine,
        column: e.token?.startColumn,
        token: e.token?.image
      }))
    };
  }

  // Конвертация CST → AST
  try {
    const ast = visitorInstance.visit(cst) as QueryNode;
    return {
      success: true,
      ast,
      errors: []
    };
  } catch (e: any) {
    return {
      success: false,
      ast: null,
      errors: [{ message: e.message, offset: 0 }]
    };
  }
}

export { parserInstance, visitorInstance };

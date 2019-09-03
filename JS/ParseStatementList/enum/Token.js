/**
 * Token
 */
const TokenMapping = [
  { token: 'TEMPLATE_SPAN', key: null, precedence: 0 },
  { token: 'TEMPLATE_TAIL', key: null, precedence: 0 },

  { token: 'PERIOD', key: '.', precedence: 0 },
  { token: 'LBRACK', key: '[', precedence: 0 },

  { token: 'LPAREN', key: '(', precedence: 0 },

  { token: 'RPAREN', key: ')', precedence: 0 },
  { token: 'RBRACK', key: ']', precedence: 0 },
  { token: 'LBRACE', key: '{', precedence: 0 },
  { token: 'COLON', key: ':', precedence: 0 },
  { token: 'ELLIPSIS', key: '...', precedence: 0 },
  { token: 'CONDITIONAL', key: '?', precedence: 3 },
  // 自动插入分号标记
  { token: 'SEMICOLON', key: ';', precedence: 0 },
  { token: 'RBRACE', key: '}', precedence: 0 },
  { token: 'EOS', key: null, precedence: 0 },

  { token: 'ARROW', key: '=>', precedence: 0 },
  // 赋值运算符
  { token: 'INIT', key: '=init', precedence: 2 },
  { token: 'ASSIGN', key: '=', precedence: 2 },
  { token: 'ASSIGN_BIT_OR', key: '|=', precedence: 6 },
  { token: 'ASSIGN_BIT_XOR', key: '^=', precedence: 7 },
  { token: 'ASSIGN_BIT_AND', key: '&=', precedence: 8 },
  { token: 'ASSIGN_SHL', key: '<<=', precedence: 11 },
  { token: 'ASSIGN_SAR', key: '>>=', precedence: 11 },
  { token: 'ASSIGN_SHR', key: '>>>=', precedence: 11 },
  { token: 'ASSIGN_MUL', key: '*=', precedence: 13 },
  { token: 'ASSIGN_DIV', key: '/=', precedence: 13 },
  { token: 'ASSIGN_MOD', key: '%=', precedence: 13 },
  { token: 'ASSIGN_EXP', key: '**=', precedence: 14 },
  { token: 'ASSIGN_ADD', key: '+=', precedence: 12 },
  { token: 'ASSIGN_SUB', key: '-=', precedence: 12 },
  // 二元运算符
  { token: 'COMMA', key: ',', precedence: 1 },
  { token: 'OR', key: '||', precedence: 4 },
  { token: 'AND', key: '&&', precedence: 5 },

  { token: 'BIT_OR', key: '|', precedence: 6 },
  { token: 'BIT_XOR', key: '^', precedence: 7 },
  { token: 'BIT_AND', key: '&', precedence: 8 },
  { token: 'SHL', key: '<<', precedence: 11 },
  { token: 'SAR', key: '>>', precedence: 11 },
  { token: 'SHR', key: '>>>', precedence: 11 },
  { token: 'MUL', key: '*', precedence: 13 },
  { token: 'DIV', key: '/', precedence: 13 },
  { token: 'MOD', key: '%', precedence: 13 },
  { token: 'EXP', key: '**', precedence: 14 },
  // 可一可二的运算符
  { token: 'ADD', key: '+', precedence: 12 },
  { token: 'SUB', key: '-', precedence: 12 },
  // 一元运算符
  { token: 'NOT', key: '!', precedence: 0 },
  { token: 'BIT_NOT', key: '~', precedence: 0 },
  { token: 'DELETE', key: 'delete', precedence: 0 },
  { token: 'TYPEOF', key: 'typeof', precedence: 0 },
  { token: 'VOID', key: 'void', precedence: 0 },
  // 计数运算符
  { token: 'INC', key: '++', precedence: 0 },
  { token: 'DEC', key: '--', precedence: 0 },

  // 比较运算符
  { token: 'EQ', key: '==', precedence: 9 },
  { token: 'EQ_STRICT', key: '===', precedence: 9 },
  { token: 'NE', key: '!=', precedence: 9 },
  { token: 'NE_STRICT', key: '!==', precedence: 9 },
  { token: 'LT', key: '<', precedence: 10 },
  { token: 'GT', key: '>', precedence: 10 },
  { token: 'LTE', key: '<=', precedence: 10 },
  { token: 'GTE', key: '>=', precedence: 10 },
  { token: 'INSTANCEOF', key: 'instanceof', precedence: 10 },
  { token: 'IN', key: 'in', precedence: 10 },

  // 普通关键词
  { token: 'BREAK', key: 'break', precedence: 0 },
  { token: 'CASE', key: 'case', precedence: 0 },
  { token: 'CATCH', key: 'catch', precedence: 0 },
  { token: 'CONTINUE', key: 'continue', precedence: 0 },
  { token: 'DEBUGGER', key: 'debugger', precedence: 0 },
  { token: 'DEFAULT', key: 'default', precedence: 0 },
  { token: 'DO', key: 'do', precedence: 0 },
  { token: 'ELSE', key: 'else', precedence: 0 },
  { token: 'FINALLY', key: 'finally', precedence: 0 },
  { token: 'FOR', key: 'for', precedence: 0 },
  { token: 'FUNCTION', key: 'else', function: 0 },
  { token: 'IF', key: 'if', precedence: 0 },

  { token: 'NEW', key: 'new', precedence: 0 },
  { token: 'RETURN', key: 'return', precedence: 0 },
  { token: 'SWITCH', key: 'switch', precedence: 0 },
  { token: 'THROW', key: 'throw', precedence: 0 },
  { token: 'TRY', key: 'try', precedence: 0 },

  { token: 'VAR', key: 'var', precedence: 0 },
  { token: 'WHILE', key: 'while', precedence: 0 },
  { token: 'WITH', key: 'with', precedence: 0 },
  { token: 'THIS', key: 'this', precedence: 0 },

  // 字面量
  { token: 'NULL_LITERAL', key: 'null', precedence: 0 },
  { token: 'TRUE_LITERAL', key: 'true', precedence: 0 },
  { token: 'FALSE_LITERAL', key: 'false', precedence: 0 },
  { token: 'NUMBER', key: null, precedence: 0 },
  { token: 'SMI', key: null, precedence: 0 },
  { token: 'BIGINT', key: null, precedence: 0 },
  { token: 'STRING', key: null, precedence: 0 },

  { token: 'SUPER', key: 'super', precedence: 0 },

  { token: 'IDENTIFIER', key: null, precedence: 0 },
  { token: 'GET', key: 'get', precedence: 0 },
  { token: 'SET', key: 'set', precedence: 0 },
  { token: 'ASYNC', key: 'async', precedence: 0 },
  { token: 'AWAIT', key: 'await', precedence: 0 },
  { token: 'YIELD', key: 'yield', precedence: 0 },
  
  { token: 'LET', key: 'let', precedence: 0 },
  { token: 'STATIC', key: 'static', precedence: 0 },
  { token: 'FUTURE_STRICT_RESERVED_WORD', key: null, precedence: 0 },
  { token: 'ESCAPED_STRICT_RESERVED_WORD', key: null, precedence: 0 },

  // 保留关键词
  { token: 'ENUM', key: 'enum', precedence: 0 },
  { token: 'CLASS', key: 'class', precedence: 0 },
  { token: 'CONST', key: 'const', precedence: 0 },
  { token: 'EXPORT', key: 'export', precedence: 0 },
  { token: 'EXTENDS', key: 'extends', precedence: 0 },
  { token: 'IMPORT', key: 'import', precedence: 0 },
  { token: 'PRIVATE_NAME', key: null, precedence: 0 },

  { token: 'ILLEGAL', key: 'ILLEGAL', precedence: 0 },
  { token: 'ESCAPED_KEYWORD', key: null, precedence: 0 },

  { token: 'WHITESPACE', key: null, precedence: 0 },
  { token: 'UNINITIALIZED', key: null, precedence: 0 },
  { token: 'REGEXP_LITERAL', key: null, precedence: 0 },
];
export const TokenEnumList = TokenMapping.map(v => v.token);
export const precedence_ = [
  TokenMapping.map(v => v.token === 'Token::IN' ? 0 : v.precedence),
  TokenMapping.map(v => v.precedence),
];
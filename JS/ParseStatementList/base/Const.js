export const Latin1_kMaxChar = 255;
// constexpr int kOneByteSize = kCharSize = sizeof(char);
export const kOneByteSize = 1;
export const kMaxAscii = 127;

/**
 * Token结束标记
 */
export const kEndOfInput = -1;

export const kCharacterLookaheadBufferSize = 1;

/**
 * 关键词表 也包括一些保留关键词(还有一些特殊情况下有意义的字符)
 * 其中key代表首字符 值分别为关键词字符以及枚举类型
 * 有时候觉得宏就是个灾难 有时候觉得真香
 */
export const keywords = {
  a: [
    { value: 'async', type: 'Token::ASYNC' },
    { value: 'await', type: 'Token::AWAIT' },
  ],
  b: [
    { value: 'break', type: 'Token::BREAK' },
    { value: 'case', type: 'Token::CASE' },
  ],
  c: [
    { value: 'case', type: 'Token::CASE' },
    { value: 'catch', type: 'Token::CATCH' },
    { value: 'class', type: 'Token::CLASS' },
    { value: 'const', type: 'Token::CONST' },
    { value: 'continue', type: 'Token::CONTINUE' },
  ],
  d: [
    { value: 'debugger', type: 'Token::DEBUGGER' },
    { value: 'default', type: 'Token::DEFAULT' },
    { value: 'delete', type: 'Token::DELETE' },
    { value: 'do', type: 'Token::DO' },
  ],
  e: [
    { value: 'else', type: 'Token::ELSE' },
    { value: 'enum', type: 'Token::ENUM' },
    { value: 'export', type: 'Token::EXPORT' },
    { value: 'extends', type: 'Token::EXTENDS' },
  ],
  f: [
    { value: 'false', type: 'Token::FALSE_LITERAL' },
    { value: 'finally', type: 'Token::FINALLY' },
    { value: 'for', type: 'Token::FOR' },
    { value: 'function', type: 'Token::FUNCTION' },
  ],
  g: [
    { value: 'get', type: 'Token::GET' },
  ],
  i: [
    { value: 'if', type: 'Token::IF' },
    { value: 'implements', type: 'Token::FUTURE_STRICT_RESERVED_WORD' },
    { value: 'import', type: 'Token::IMPORT' },
    { value: 'in', type: 'Token::IN' },
    { value: 'instanceof', type: 'Token::INSTANCEOF' },
    { value: 'interface', type: 'Token::FUTURE_STRICT_RESERVED_WORD' },
  ],
  l: [
    { value: 'let', type: 'Token::LET' },
  ],
  n: [
    { value: 'new', type: 'Token::NEW' },
    { value: 'null', type: 'Token::NULL_LITERAL' },
  ],
  p: [
    { value: 'package', type: 'Token::FUTURE_STRICT_RESERVED_WORD' },
    { value: 'private', type: 'Token::FUTURE_STRICT_RESERVED_WORD' },
    { value: 'protected', type: 'Token::FUTURE_STRICT_RESERVED_WORD' },
    { value: 'public', type: 'Token::FUTURE_STRICT_RESERVED_WORD' },
  ],
  r: [
    { value: 'return', type: 'Token::RETURN' },
  ],
  s: [
    { value: 'set', type: 'Token::SET' },
    { value: 'static', type: 'Token::STATIC' },
    { value: 'super', type: 'Token::SUPER' },
    { value: 'switch', type: 'Token::SWITCH' },
  ],
  t: [
    { value: 'this', type: 'Token::THIS' },
    { value: 'throw', type: 'Token::THROW' },
    { value: 'true', type: 'Token::TRUE_LITERAL' },
    { value: 'try', type: 'Token::TRY' },
    { value: 'typeof', type: 'Token::TYPEOF' },
  ],
  v: [
    { value: 'var', type: 'Token::VAR' },
    { value: 'void', type: 'Token::VOID' },
  ],
  w: [
    { value: 'while', type: 'Token::WHILE' },
    { value: 'with', type: 'Token::WITH' },
  ],
  y: [
    { value: 'yield', type: 'Token::YIELD'},
  ],
};

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

/**
 * 字符类型相关
 */
export const kTerminatesLiteral = 1 << 0;
export const kCannotBeKeyword = 1 << 1;
export const kCannotBeKeywordStart = 1 << 2;
export const kStringTerminator = 1 << 3;
export const kIdentifierNeedsSlowPath = 1 << 4;
export const kMultilineCommentCharacterNeedsSlowPath = 1 << 5;

/**
 * 进制相关
 */
export const IMPLICIT_OCTAL = 0;
export const BINARY = 1;
export const OCTAL = 2;
export const HEX = 3;
export const DECIMAL = 4;
export const DECIMAL_WITH_LEADING_ZERO = 5;

/**
 * Ascii字符标记
 */
export const kIsIdentifierStart = 1 << 0;
export const kIsIdentifierPart = 1 << 1;
export const kIsWhiteSpace = 1 << 2;
export const kIsWhiteSpaceOrLineTerminator = 1 << 3;

/**
 * 声明类型
 */
export const kLet = 0;  // let声明
export const kConst = 1;  // cosnt声明
export const kVar = 2;  // var、function声明
// 编译器内部类型
export const kTemporary = 3;  // 临时变量(用户不可见) 分配在栈上
export const kDynamic = 4;  // 未知的声明
export const kDynamicGlobal = 5;  // 全局变量
export const kDynamicLocal = 6; // 本地变量
export const kLastLexicalVariableMode = kConst;  // ES6新出的两种类型

/**
 * 声明类型2
 */
export const NORMAL_VARIABLE = 0;
export const PARAMETER_VARIABLE = 1;
export const THIS_VARIABLE = 2;
export const SLOPPY_BLOCK_FUNCTION_VARIABLE = 3;
export const SLOPPY_FUNCTION_NAME_VARIABLE = 4;

/**
 * 表达式类型
 */
// 表达式
export const kExpression = 0;

// 右值是表达式
export const kMaybeArrowParameterDeclaration = 1;
export const kMaybeAsyncArrowParameterDeclaration = 2;

/// 普通声明
export const kParameterDeclaration = 3;
export const kVarDeclaration = 4;
export const kLexicalDeclaration = 5;

/**
 * 语句类型
 */
export const kVariableDeclaration = 0;

/**
 * 变量赋值标记
 */
export const kNotAssigned = 0;
export const kMaybeAssigned = 1;

/**
 * 变量初始化类型
 */
export const kNeedsInitialization = 0;
export const kCreatedInitialized = 1;

/**
 * 用于初始化与非法判断
 */
export const kNoSourcePosition = -1;

/**
 * 
 */
export const kExpressionIndex = 0;
export const kPatternIndex = 1;
export const kNumberOfErrors = 2;

/**
 * 函数模块作用域枚举
 */
export const kNormalFunction = 0;
export const kModule = 1;
export const kBaseConstructor = 2;
export const kDefaultBaseConstructor = 3;
export const kDefaultDerivedConstructor = 4;
export const kDerivedConstructor = 5;
export const kGetterFunction = 6;
export const kSetterFunction = 7;
export const kArrowFunction = 8;
export const kAsyncArrowFunction = 9;
export const kAsyncFunction = 10;
export const kAsyncConciseMethod = 11;
export const kAsyncConciseGeneratorMethod = 12;
export const kAsyncGeneratorFunction = 13;
export const kGeneratorFunction = 14;
export const kConciseGeneratorMethod = 15;
export const kConciseMethod = 16;
export const kClassMembersInitializerFunction = 17;
export const kLastFunctionKind = kClassMembersInitializerFunction;

/**
 * 字面量枚举
 */
export const kSmi = 0;
export const kHeapNumber = 1;
export const kBigInt = 2;
export const kString = 3;
export const kSymbol = 4;
export const kBoolean = 5;
export const kUndefined = 6;
export const kNull = 7;
export const kTheHole = 8;

/**
 * AstNode枚举
 * TODO
 */
export const kLiteral = 0;
export const kAssignment = 1;
export const kCompoundAssignment = 2;
export const kExpressionStatement = 3;

/**
 * AstNode类型枚举
 * TODO
 */
export const kVariableProxy = 0;

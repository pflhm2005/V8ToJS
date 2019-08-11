export const Latin1_kMaxChar = 255;
// constexpr int kOneByteSize = kCharSize = sizeof(char);
export const kOneByteSize = 1;
export const kMaxAscii = 127;

export const kCharacterLookaheadBufferSize = 1;

/**
 * Token
 */
export const TokenEnumList = [
  'IDENTIFIER',
  'GET',
  'SET',
  'ASYNC',
  'AWAIT',
  'YIELD',
  'LET',
  'STATIC',
  'FUTURE_STRICT_RESERVED_WORD',
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

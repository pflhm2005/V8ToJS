export const kNoSourcePosition = -1;
export const kMaxAscii = 127;
export const kEndOfInput = -1;
export const kMaxArguments = (1 << 16) - 2;

/**
 * 变量初始化类型
 */
export const kNeedsInitialization = 0;
export const kCreatedInitialized = 1;

/**
 * 变量赋值标记
 */
export const kNotAssigned = 0;
export const kMaybeAssigned = 1;

export const NORMAL_VARIABLE = 0;
export const PARAMETER_VARIABLE = 1;
export const THIS_VARIABLE = 2;
export const SLOPPY_BLOCK_FUNCTION_VARIABLE = 3;
export const SLOPPY_FUNCTION_NAME_VARIABLE = 4;

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
 * 字符类型相关
 */
export const kTerminatesLiteral = 1 << 0;
export const kCannotBeKeyword = 1 << 1;
export const kCannotBeKeywordStart = 1 << 2;
export const kStringTerminator = 1 << 3;
export const kIdentifierNeedsSlowPath = 1 << 4;
export const kMultilineCommentCharacterNeedsSlowPath = 1 << 5;

/**
 * Ascii字符标记
 */
export const kIsIdentifierStart = 1 << 0;
export const kIsIdentifierPart = 1 << 1;
export const kIsWhiteSpace = 1 << 2;
export const kIsWhiteSpaceOrLineTerminator = 1 << 3;

export const kSloppy = 0;
export const kStrict = 1;
export const Latin1_kMaxChar = 255;
// constexpr int kOneByteSize = kCharSize = sizeof(char);
export const kOneByteSize = 1;
export const kMaxAscii = 127;

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
 * 数字相关
 */
export const IMPLICIT_OCTAL = 0;
export const BINARY = 1;
export const OCTAL = 2;
export const HEX = 3;
export const DECIMAL = 4;
export const IMPLICIT_ODECIMAL_WITH_LEADING_ZEROCTAL = 5;
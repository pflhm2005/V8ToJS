#define KEYWORDS(KEYWORD_GROUP, KEYWORD)                    \
  KEYWORD_GROUP('a')                                        \
  KEYWORD("async", Token::ASYNC)                            \
  KEYWORD("await", Token::AWAIT)                            \
  KEYWORD_GROUP('b')                                        \
  KEYWORD("break", Token::BREAK)                            \
  KEYWORD_GROUP('c')                                        \
  KEYWORD("case", Token::CASE)                              \
  KEYWORD("catch", Token::CATCH)                            \
  KEYWORD("class", Token::CLASS)                            \
  KEYWORD("const", Token::CONST)                            \
  KEYWORD("continue", Token::CONTINUE)                      \
  KEYWORD_GROUP('d')                                        \
  KEYWORD("debugger", Token::DEBUGGER)                      \
  KEYWORD("default", Token::DEFAULT)                        \
  KEYWORD("delete", Token::DELETE)                          \
  KEYWORD("do", Token::DO)                                  \
  KEYWORD_GROUP('e')                                        \
  KEYWORD("else", Token::ELSE)                              \
  KEYWORD("enum", Token::ENUM)                              \
  KEYWORD("export", Token::EXPORT)                          \
  KEYWORD("extends", Token::EXTENDS)                        \
  KEYWORD_GROUP('f')                                        \
  KEYWORD("false", Token::FALSE_LITERAL)                    \
  KEYWORD("finally", Token::FINALLY)                        \
  KEYWORD("for", Token::FOR)                                \
  KEYWORD("function", Token::FUNCTION)                      \
  KEYWORD_GROUP('g')                                        \
  KEYWORD("get", Token::GET)                                \
  KEYWORD_GROUP('i')                                        \
  KEYWORD("if", Token::IF)                                  \
  KEYWORD("implements", Token::FUTURE_STRICT_RESERVED_WORD) \
  KEYWORD("import", Token::IMPORT)                          \
  KEYWORD("in", Token::IN)                                  \
  KEYWORD("instanceof", Token::INSTANCEOF)                  \
  KEYWORD("interface", Token::FUTURE_STRICT_RESERVED_WORD)  \
  KEYWORD_GROUP('l')                                        \
  KEYWORD("let", Token::LET)                                \
  KEYWORD_GROUP('n')                                        \
  KEYWORD("new", Token::NEW)                                \
  KEYWORD("null", Token::NULL_LITERAL)                      \
  KEYWORD_GROUP('p')                                        \
  KEYWORD("package", Token::FUTURE_STRICT_RESERVED_WORD)    \
  KEYWORD("private", Token::FUTURE_STRICT_RESERVED_WORD)    \
  KEYWORD("protected", Token::FUTURE_STRICT_RESERVED_WORD)  \
  KEYWORD("public", Token::FUTURE_STRICT_RESERVED_WORD)     \
  KEYWORD_GROUP('r')                                        \
  KEYWORD("return", Token::RETURN)                          \
  KEYWORD_GROUP('s')                                        \
  KEYWORD("set", Token::SET)                                \
  KEYWORD("static", Token::STATIC)                          \
  KEYWORD("super", Token::SUPER)                            \
  KEYWORD("switch", Token::SWITCH)                          \
  KEYWORD_GROUP('t')                                        \
  KEYWORD("this", Token::THIS)                              \
  KEYWORD("throw", Token::THROW)                            \
  KEYWORD("true", Token::TRUE_LITERAL)                      \
  KEYWORD("try", Token::TRY)                                \
  KEYWORD("typeof", Token::TYPEOF)                          \
  KEYWORD_GROUP('v')                                        \
  KEYWORD("var", Token::VAR)                                \
  KEYWORD("void", Token::VOID)                              \
  KEYWORD_GROUP('w')                                        \
  KEYWORD("while", Token::WHILE)                            \
  KEYWORD("with", Token::WITH)                              \
  KEYWORD_GROUP('y')                                        \
  KEYWORD("yield", Token::YIELD)


enum class ScanFlags : uint8_t {
  kTerminatesLiteral = 1 << 0,
  // "Cannot" rather than "can" so that this flag can be ORed together across
  // multiple characters.
  kCannotBeKeyword = 1 << 1,
  kCannotBeKeywordStart = 1 << 2,
  kStringTerminator = 1 << 3,
  kIdentifierNeedsSlowPath = 1 << 4,
  kMultilineCommentCharacterNeedsSlowPath = 1 << 5,
};

/**
 * 字符标记
 * 一共有6种类型 单个字符可能有多种标记
 * 注意 运算没有按照枚举的声明顺序
 */
constexpr uint8_t GetScanFlags(char c) {
  return
    /**
     * 非关键词的标记
     * 总结就是字符是大小写字母、数字、$、_且不在关键词字符中
     */
    (IsAsciiIdentifier(c) && !CanBeKeywordCharacter(c) ? static_cast<uint8_t>(ScanFlags::kCannotBeKeyword) : 0) |
    /**
     * 非关键词开头
     * 上面的group
     */
    (IsKeywordStart(c) ? 0 : static_cast<uint8_t>(ScanFlags::kCannotBeKeywordStart)) |
    /**
     * 非标识符就是字面量结束标记
     */
    (!IsAsciiIdentifier(c) ? static_cast<uint8_t>(ScanFlags::kTerminatesLiteral) : 0) |
    /**
     * 字符串的结束标记
     */
    ((c == '\'' || c == '"' || c == '\n' || c == '\r' || c == '\\') ? static_cast<uint8_t>(ScanFlags::kStringTerminator) : 0) |
    /**
     * 转义符号
     */
    (c == '\\' ? static_cast<uint8_t>(ScanFlags::kIdentifierNeedsSlowPath) : 0) |
    /**
     * 回车、换行、*号会在多行注释中出现
     */
    (c == '\n' || c == '\r' || c == '*' ? static_cast<uint8_t>(ScanFlags::kMultilineCommentCharacterNeedsSlowPath) : 0);
}

/**
 * 简述就是大小写字母、数字、$、_
 */
inline constexpr bool IsAsciiIdentifier(uc32 c) {
  return IsAlphaNumeric(c) || c == '$' || c == '_';
}
inline constexpr bool IsAlphaNumeric(uc32 c) {
  return IsInRange(AsciiAlphaToLower(c), 'a', 'z') || IsDecimalDigit(c);
}
// If c is in 'A'-'Z' or 'a'-'z', return its lower-case.
// Else, return something outside of 'A'-'Z' and 'a'-'z'.
// Note: it ignores LOCALE.
inline constexpr int AsciiAlphaToLower(uc32 c) { return c | 0x20; }
inline constexpr bool IsDecimalDigit(uc32 c) {
  // ECMA-262, 3rd, 7.8.3 (p 16)
  return IsInRange(c, '0', '9');
}

/**
 * 又几把是宏 写的什么鬼
 * 就是将所有的关键字连起来 组成一个巨大的字符串
 * 然后判断字符是否在这个大字符串中 神经病啊
 */
inline constexpr bool CanBeKeywordCharacter(char c) {
  return IsInString(
#define KEYWORD_GROUP_CASE(ch)  // Nothing
#define KEYWORD(keyword, token) keyword
      KEYWORDS(KEYWORD_GROUP_CASE, KEYWORD)
#undef KEYWORD
#undef KEYWORD_GROUP_CASE
          ,
      c);
}
template <int N>
constexpr bool IsInString(const char (&s)[N], char c, size_t i = 0) {
  return i >= N ? false : s[i] == c ? true : IsInString(s, c, i + 1);
}

/**
 * 几把宏
 * 判断是不是关键词的开头
 */
constexpr bool IsKeywordStart(char c) {
#define KEYWORD_GROUP_CHECK(ch) c == ch ||
#define KEYWORD_CHECK(keyword, token)
  return KEYWORDS(KEYWORD_GROUP_CHECK, KEYWORD_CHECK) /* || */ false;
#undef KEYWORD_GROUP_CHECK
#undef KEYWORD_CHECK
}
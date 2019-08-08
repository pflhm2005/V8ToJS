/**
 * 会先激活Token的字符对象
 */
V8_INLINE Token::Value Scanner::ScanIdentifierOrKeyword() {
  next().literal_chars.Start();
  return ScanIdentifierOrKeywordInner();
}

/**
 * 去掉一些ASSERT和DCHECK宏
 */
V8_INLINE Token::Value Scanner::ScanIdentifierOrKeywordInner() {
  bool escaped = false;
  bool can_be_keyword = true;

  if (V8_LIKELY(static_cast<uint32_t>(c0_) <= kMaxAscii)) {
    if (V8_LIKELY(c0_ != '\\')) {
      uint8_t scan_flags = character_scan_flags[c0_];
      scan_flags >>= 1;
      // Make sure the shifting above doesn't set IdentifierNeedsSlowPath.
      // Otherwise we'll fall into the slow path after scanning the identifier.
      AddLiteralChar(static_cast<char>(c0_));
      AdvanceUntil([this, &scan_flags](uc32 c0) {
        if (V8_UNLIKELY(static_cast<uint32_t>(c0) > kMaxAscii)) {
          // A non-ascii character means we need to drop through to the slow
          // path.
          // TODO(leszeks): This would be most efficient as a goto to the slow
          // path, check codegen and maybe use a bool instead.
          scan_flags |=
              static_cast<uint8_t>(ScanFlags::kIdentifierNeedsSlowPath);
          return true;
        }
        uint8_t char_flags = character_scan_flags[c0];
        scan_flags |= char_flags;
        if (TerminatesLiteral(char_flags)) {
          return true;
        } else {
          AddLiteralChar(static_cast<char>(c0));
          return false;
        }
      });
      /**
       * 相信这个LIKELY
       */
      if (V8_LIKELY(!IdentifierNeedsSlowPath(scan_flags))) {
        if (!CanBeKeyword(scan_flags)) return Token::IDENTIFIER;
        // Could be a keyword or identifier.
        Vector<const uint8_t> chars = next().literal_chars.one_byte_literal();
        return KeywordOrIdentifierToken(chars.begin(), chars.length());
      }

      can_be_keyword = CanBeKeyword(scan_flags);
    } else {
      // Special case for escapes at the start of an identifier.
      escaped = true;
      uc32 c = ScanIdentifierUnicodeEscape();
      DCHECK(!IsIdentifierStart(-1));
      if (c == '\\' || !IsIdentifierStart(c)) {
        return Token::ILLEGAL;
      }
      AddLiteralChar(c);
      can_be_keyword = CharCanBeKeyword(c);
    }
  }

  return ScanIdentifierOrKeywordInnerSlow(escaped, can_be_keyword);
}

/**
 * 大部分情况下关键词走这个分支
 */
V8_INLINE Token::Value KeywordOrIdentifierToken(const uint8_t* input,
                                                int input_length) {
  return PerfectKeywordHash::GetToken(reinterpret_cast<const char*>(input), input_length);
}

enum {
  TOTAL_KEYWORDS = 49,
  MIN_WORD_LENGTH = 2,
  MAX_WORD_LENGTH = 10,
  MIN_HASH_VALUE = 2,
  MAX_HASH_VALUE = 55
};
static const unsigned char kPerfectKeywordLengthTable[64] = {
    0, 0, 2, 3, 4, 2, 6, 7,  8, 9, 10, 2, 3, 3, 5, 3, 7, 8, 4, 5, 4, 7,
    5, 5, 5, 6, 4, 5, 6, 6,  4, 5, 7,  8, 9, 3, 4, 3, 4, 5, 5, 5, 6, 6,
    7, 5, 4, 6, 0, 0, 3, 10, 0, 0, 0,  6, 0, 0, 0, 0, 0, 0, 0, 0};

struct PerfectKeywordHashTableEntry {
  const char* name;
  Token::Value value;
};
static const struct PerfectKeywordHashTableEntry kPerfectKeywordHashTable[64] =
    {{"", Token::IDENTIFIER},
     {"", Token::IDENTIFIER},
     {"in", Token::IN},
     {"new", Token::NEW},
     {"enum", Token::ENUM},
     {"do", Token::DO},
     {"delete", Token::DELETE},
     {"default", Token::DEFAULT},
     {"debugger", Token::DEBUGGER},
     {"interface", Token::FUTURE_STRICT_RESERVED_WORD},
     {"instanceof", Token::INSTANCEOF},
     {"if", Token::IF},
     {"get", Token::GET},
     {"set", Token::SET},
     {"const", Token::CONST},
     {"for", Token::FOR},
     {"finally", Token::FINALLY},
     {"continue", Token::CONTINUE},
     {"case", Token::CASE},
     {"catch", Token::CATCH},
     {"null", Token::NULL_LITERAL},
     {"package", Token::FUTURE_STRICT_RESERVED_WORD},
     {"false", Token::FALSE_LITERAL},
     {"async", Token::ASYNC},
     {"break", Token::BREAK},
     {"return", Token::RETURN},
     {"this", Token::THIS},
     {"throw", Token::THROW},
     {"public", Token::FUTURE_STRICT_RESERVED_WORD},
     {"static", Token::STATIC},
     {"with", Token::WITH},
     {"super", Token::SUPER},
     {"private", Token::FUTURE_STRICT_RESERVED_WORD},
     {"function", Token::FUNCTION},
     {"protected", Token::FUTURE_STRICT_RESERVED_WORD},
     {"try", Token::TRY},
     {"true", Token::TRUE_LITERAL},
     {"let", Token::LET},
     {"else", Token::ELSE},
     {"await", Token::AWAIT},
     {"while", Token::WHILE},
     {"yield", Token::YIELD},
     {"switch", Token::SWITCH},
     {"export", Token::EXPORT},
     {"extends", Token::EXTENDS},
     {"class", Token::CLASS},
     {"void", Token::VOID},
     {"import", Token::IMPORT},
     {"", Token::IDENTIFIER},
     {"", Token::IDENTIFIER},
     {"var", Token::VAR},
     {"implements", Token::FUTURE_STRICT_RESERVED_WORD},
     {"", Token::IDENTIFIER},
     {"", Token::IDENTIFIER},
     {"", Token::IDENTIFIER},
     {"typeof", Token::TYPEOF},
     {"", Token::IDENTIFIER},
     {"", Token::IDENTIFIER},
     {"", Token::IDENTIFIER},
     {"", Token::IDENTIFIER},
     {"", Token::IDENTIFIER},
     {"", Token::IDENTIFIER},
     {"", Token::IDENTIFIER},
     {"", Token::IDENTIFIER}};

/**
 * asso_values保存了a-z的hash映射
 * 所有关键词字符都有对应的hash值 而非关键词字符都是56 比如j、k、z等等
 * 通过运算返回一个整形
 */
inline unsigned int PerfectKeywordHash::Hash(const char* str, int len) {
  static const unsigned char asso_values[128] = {
      56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56,
      56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56,
      56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56,
      56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56,
      56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56,
      56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56,
      56, 8,  0,  6,  0,  0,  9,  9,  9,  0,  56, 56, 34, 41, 0,  3,
      6,  56, 19, 10, 13, 16, 39, 26, 37, 36, 56, 56, 56, 56, 56, 56};
  return len + asso_values[static_cast<unsigned char>(str[1])] +
         asso_values[static_cast<unsigned char>(str[0])];
}
inline Token::Value PerfectKeywordHash::GetToken(const char* str, int len) {
  if (IsInRange(len, MIN_WORD_LENGTH, MAX_WORD_LENGTH)) {
    /**
     * 0x3f => 111111 => 63
     * key值小于64
     * 这个运算不知道有什么用 最后都是返回key
     */
    unsigned int key = Hash(str, len) & 0x3f;

    if (len == kPerfectKeywordLengthTable[key]) {
      const char* s = kPerfectKeywordHashTable[key].name;
      /**
       * 做字符串严格的对比
       */
      while (*s != 0) {
        if (*s++ != *str++) return Token::IDENTIFIER;
      }
      return kPerfectKeywordHashTable[key].value;
    }
  }
  return Token::IDENTIFIER;
}
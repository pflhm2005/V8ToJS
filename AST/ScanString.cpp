Token::Value Scanner::ScanString() {
  uc32 quote = c0_;
  /**
   * 初始化
   */
  next().literal_chars.Start();
  while (true) {
    /**
     * 条件步进解析
     */
    AdvanceUntil([this](uc32 c0) {
      if (V8_UNLIKELY(static_cast<uint32_t>(c0) > kMaxAscii)) {
        if (V8_UNLIKELY(unibrow::IsStringLiteralLineTerminator(c0))) {
          return true;
        }
        AddLiteralChar(c0);
        return false;
      }
      uint8_t char_flags = character_scan_flags[c0];
      if (MayTerminateString(char_flags)) return true;
      AddLiteralChar(c0);
      return false;
    });
    /**
     * 遇到‘\’直接步进
     * 后面如果直接是字符串结尾标识符 判定为非法
     */
    while (c0_ == '\\') {
      Advance();
      if (V8_UNLIKELY(c0_ == kEndOfInput || !ScanEscape<false>())) {
        return Token::ILLEGAL;
      }
    }
    /**
     * 又遇到了同一个字符串标识符
     * 说明字符串解析完成
     */
    if (c0_ == quote) {
      Advance();
      return Token::STRING;
    }

    if (V8_UNLIKELY(c0_ == kEndOfInput ||
                    unibrow::IsStringLiteralLineTerminator(c0_))) {
      return Token::ILLEGAL;
    }
    // 向Vector里面塞一个字符
    AddLiteralChar(c0_);
  }
}

/**
 * 参数是一个函数
 */
AdvanceUntil([this](uc32 c0) {
  // Unicode大于127的特殊字符
  if (V8_UNLIKELY(static_cast<uint32_t>(c0) > kMaxAscii)) {
    /**
     * 检测是否是换行符
     * \r\n以及\n
     */
    if (V8_UNLIKELY(unibrow::IsStringLiteralLineTerminator(c0))) {
      return true;
    }
    AddLiteralChar(c0);
    return false;
  }
  /**
   * 检查是否是字符串结束符
   */
  uint8_t char_flags = character_scan_flags[c0];
  if (MayTerminateString(char_flags)) return true;
  AddLiteralChar(c0);
  return false;
});

/**
 * 这个方法会对c0_进行赋值
 */
void AdvanceUntil(FunctionType check) {
  c0_ = source_->AdvanceUntil(check);
}

template <typename FunctionType>
V8_INLINE uc32 AdvanceUntil(FunctionType check) {
  while (true) {
    /**
     * 从游标位置到结尾搜索符合条件的字符
     */
    auto next_cursor_pos =
        std::find_if(buffer_cursor_, buffer_end_, [&check](uint16_t raw_c0_) {
          uc32 c0_ = static_cast<uc32>(raw_c0_);
          return check(c0_);
        });
    /**
     * 1、碰到第二个参数 说明没有符合条件的字符 直接返回结束符
     * 2、有符合条件的字符 把游标属性指向该字符的后一位 返回该字符
     */
    if (next_cursor_pos == buffer_end_) {
      buffer_cursor_ = buffer_end_;
      if (!ReadBlockChecked()) {
        buffer_cursor_++;
        return kEndOfInput;
      }
    } else {
      buffer_cursor_ = next_cursor_pos + 1;
      return static_cast<uc32>(*next_cursor_pos);
    }
  }
}

inline bool MayTerminateString(uint8_t scan_flags) {
  return (scan_flags & static_cast<uint8_t>(ScanFlags::kStringTerminator));
}

/**
 * 字符扫描标记
 */
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
 * 映射表
 * 对字符的可能性进行分类
 */
static constexpr const uint8_t character_scan_flags[128] = {
#define CALL_GET_SCAN_FLAGS(N) GetScanFlags(N),
    INT_0_TO_127_LIST(CALL_GET_SCAN_FLAGS)
#undef CALL_GET_SCAN_FLAGS
};

constexpr uint8_t GetScanFlags(char c) {
  return
    /** 1 */ | /** 2 */ | /** 3 */ |
    // Possible string termination characters.
    ((c == '\'' || c == '"' || c == '\n' || c == '\r' || c == '\\')
          ? static_cast<uint8_t>(ScanFlags::kStringTerminator)
          : 0) | /** 5 */ | /** 6 */
}
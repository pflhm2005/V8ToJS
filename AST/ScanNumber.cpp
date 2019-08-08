enum NumberKind {
  IMPLICIT_OCTAL,
  BINARY,
  OCTAL,
  HEX,
  DECIMAL,
  DECIMAL_WITH_LEADING_ZERO
};

/**
 * seen_period区分是否以点号开头
 */
Token::Value Scanner::ScanNumber(bool seen_period) {
  NumberKind kind = DECIMAL;

  next().literal_chars.Start();
  bool at_start = !seen_period;
  int start_pos = source_pos();  // For reporting octal positions.
  /**
   * 点号开头的数字可以直接判定为十进制浮点数
   * 处理方式十分简单
   */
  if (seen_period) {
    AddLiteralChar('.');
    // ._1是不合法的数字
    if (allow_harmony_numeric_separator() && c0_ == '_') {
      return Token::ILLEGAL;
    }
    if (!ScanDecimalDigits()) return Token::ILLEGAL;
  } else {
    /**
     * 0开头有八种可能
     * 1.数字0 2.0exxx 3.0Exxx 4.二进制
     * 5.八进制 6.十六进制 7.0.xxx 8.普通的0开头十进制数字
     */
    if (c0_ == '0') {
      AddLiteralCharAdvance();

      if (AsciiAlphaToLower(c0_) == 'x') {
        AddLiteralCharAdvance();
        kind = HEX;
        if (!ScanHexDigits()) return Token::ILLEGAL;
      } else if (AsciiAlphaToLower(c0_) == 'o') {
        AddLiteralCharAdvance();
        kind = OCTAL;
        if (!ScanOctalDigits()) return Token::ILLEGAL;
      } else if (AsciiAlphaToLower(c0_) == 'b') {
        AddLiteralCharAdvance();
        kind = BINARY;
        if (!ScanBinaryDigits()) return Token::ILLEGAL;
      } else if (IsOctalDigit(c0_)) {
        kind = IMPLICIT_OCTAL;
        if (!ScanImplicitOctalDigits(start_pos, &kind)) {
          return Token::ILLEGAL;
        }
        if (kind == DECIMAL_WITH_LEADING_ZERO) {
          at_start = false;
        }
      } else if (IsNonOctalDecimalDigit(c0_)) {
        kind = DECIMAL_WITH_LEADING_ZERO;
      } else if (allow_harmony_numeric_separator() && c0_ == '_') {
        ReportScannerError(Location(source_pos(), source_pos() + 1),
                           MessageTemplate::kZeroDigitNumericSeparator);
        return Token::ILLEGAL;
      }
    }

    // 处理十进制
    if (IsDecimalNumberKind(kind)) {
      // as_start为false代表首数字无意义 见解析隐式八进制
      if (at_start) {
        uint64_t value = 0;
        // 计算整数部分
        if (!ScanDecimalAsSmi(&value)) return Token::ILLEGAL;

        if (next().literal_chars.one_byte_literal().length() <= 10 &&
            value <= Smi::kMaxValue && c0_ != '.' && !IsIdentifierStart(c0_)) {
          next().smi_value_ = static_cast<uint32_t>(value);
          // 0987
          if (kind == DECIMAL_WITH_LEADING_ZERO) {
            octal_pos_ = Location(start_pos, source_pos());
            octal_message_ = MessageTemplate::kStrictDecimalWithLeadingZero;
          }
          return Token::SMI;
        }
      }

      if (!ScanDecimalDigits()) return Token::ILLEGAL;
      // 处理小数
      if (c0_ == '.') {
        seen_period = true;
        AddLiteralCharAdvance();
        if (allow_harmony_numeric_separator() && c0_ == '_') {
          return Token::ILLEGAL;
        }
        if (!ScanDecimalDigits()) return Token::ILLEGAL;
      }
    }
  }
  /**
   * 区分大整数
   */
  bool is_bigint = false;
  if (c0_ == 'n' && !seen_period && IsValidBigIntKind(kind)) {
    // 快速判定bigint长度是否越界
    static const int kMaxBigIntCharacters = BigInt::kMaxLengthBits / 4;
    // 十进制没有标识符
    int length = source_pos() - start_pos - (kind != DECIMAL ? 2 : 0);
    if (length > kMaxBigIntCharacters) {
      ReportScannerError(Location(start_pos, source_pos()), MessageTemplate::kBigIntTooBig);
      return Token::ILLEGAL;
    }

    is_bigint = true;
    Advance();
  }
  /**
   * 处理指数
   * 只有十进制才支持这种形式
   */
  else if (AsciiAlphaToLower(c0_) == 'e') {
    if (!IsDecimalNumberKind(kind)) return Token::ILLEGAL;
    AddLiteralCharAdvance();
    if (!ScanSignedInteger()) return Token::ILLEGAL;
  }

  // The source character immediately following a numeric literal must
  // not be an identifier start or a decimal digit; see ECMA-262
  // section 7.8.3, page 17 (note that we read only one decimal digit
  // if the value is 0).
  if (IsDecimalDigit(c0_) || IsIdentifierStart(c0_)) {
    return Token::ILLEGAL;
  }

  if (kind == DECIMAL_WITH_LEADING_ZERO) {
    octal_pos_ = Location(start_pos, source_pos());
    octal_message_ = MessageTemplate::kStrictDecimalWithLeadingZero;
  }

  return is_bigint ? Token::BIGINT : Token::NUMBER;
}

}
/**
 * 第二个参数代表是否需要检查第一个数字
 * 如果从小数过来 因为预检过 这里就没必要
 * 这里的逻辑主要是下划线不能出现在数字开头与结尾 且不能连续出现2个
 */
bool Scanner::ScanDigitsWithNumericSeparators(bool (*predicate)(uc32 ch),
                                              bool is_check_first_digit) {
  if (is_check_first_digit && !predicate(c0_)) return false;

  bool separator_seen = false;
  while (predicate(c0_) || c0_ == '_') {
    if (c0_ == '_') {
      Advance();
      if (c0_ == '_') {
        ReportScannerError(Location(source_pos(), source_pos() + 1),
                           MessageTemplate::kContinuousNumericSeparator);
        return false;
      }
      separator_seen = true;
      continue;
    }
    separator_seen = false;
    AddLiteralCharAdvance();
  }

  if (separator_seen) {
    ReportScannerError(Location(source_pos(), source_pos() + 1),
                       MessageTemplate::kTrailingNumericSeparator);
    return false;
  }

  return true;
}

/**
 * 处理十进制数字
 */
inline constexpr bool IsDecimalDigit(uc32 c) {
  return IsInRange(c, '0', '9');
}
bool Scanner::ScanDecimalDigits() {
  if (allow_harmony_numeric_separator()) {
    return ScanDigitsWithNumericSeparators(&IsDecimalDigit, false);
  }
  // 这里直接用字符的数字判定工具方法
  while (IsDecimalDigit(c0_)) {
    AddLiteralCharAdvance();
  }
  return true;

/**
 * 处理十六进制数字
 */
inline constexpr bool IsHexDigit(uc32 c) {
  // ECMA-262, 3rd, 7.6 (p 15)
  return IsDecimalDigit(c) || IsInRange(AsciiAlphaToLower(c), 'a', 'f');
}
bool Scanner::ScanHexDigits() {
  if (allow_harmony_numeric_separator()) {
    return ScanDigitsWithNumericSeparators(&IsHexDigit, true);
  }

  // 保证至少有一个有效数字
  if (!IsHexDigit(c0_)) {
    return false;
  }
  // 同上
  while (IsHexDigit(c0_)) {
    AddLiteralCharAdvance();
  }
  return true;
}

/**
 * 处理八进制
 */
inline constexpr bool IsOctalDigit(uc32 c) {
  return IsInRange(c, '0', '7');
}
bool Scanner::ScanOctalDigits() {
  // ...
}

/**
 * 处理二进制
 */
inline constexpr bool IsBinaryDigit(uc32 c) {
  return c == '0' || c == '1';
}
bool Scanner::ScanBinaryDigits() {
  // ...
}

/**
 * 处理隐式八进制
 */
inline constexpr bool IsNonOctalDecimalDigit(uc32 c) {
  return IsInRange(c, '8', '9');
}
bool Scanner::ScanImplicitOctalDigits(int start_pos,
                                      Scanner::NumberKind* kind) {
  *kind = IMPLICIT_OCTAL;

  while (true) {
    // (possible) octal number
    if (IsNonOctalDecimalDigit(c0_)) {
      *kind = DECIMAL_WITH_LEADING_ZERO;
      return true;
    }
    if (!IsOctalDigit(c0_)) {
      // Octal literal finished.
      octal_pos_ = Location(start_pos, source_pos());
      octal_message_ = MessageTemplate::kStrictOctalLiteral;
      return true;
    }
    AddLiteralCharAdvance();
  }
}

/**
 * 正常十进制小整数
 */
bool Scanner::ScanDecimalAsSmi(uint64_t* value) {
  if (allow_harmony_numeric_separator()) {
    return ScanDecimalAsSmiWithNumericSeparators(value);
  }

  while (IsDecimalDigit(c0_)) {
    *value = 10 * *value + (c0_ - '0');
    uc32 first_char = c0_;
    Advance();
    AddLiteralChar(first_char);
  }
  return true;
}
bool Scanner::ScanDecimalAsSmiWithNumericSeparators(uint64_t* value) {
  bool separator_seen = false;
  while (IsDecimalDigit(c0_) || c0_ == '_') {
    if (c0_ == '_') {
      Advance();
      if (c0_ == '_') {
        ReportScannerError(Location(source_pos(), source_pos() + 1),
                           MessageTemplate::kContinuousNumericSeparator);
        return false;
      }
      separator_seen = true;
      continue;
    }
    separator_seen = false;
    *value = 10 * *value + (c0_ - '0');
    uc32 first_char = c0_;
    Advance();
    AddLiteralChar(first_char);
  }

  if (separator_seen) {
    ReportScannerError(Location(source_pos(), source_pos() + 1),
                       MessageTemplate::kTrailingNumericSeparator);
    return false;
  }

  return true;
}

/**
 * 处理bigint
 */
// 类型为BINARY OCTAL HEX DECIMAL
inline bool IsValidBigIntKind(NumberKind kind) {
  return IsInRange(kind, BINARY, DECIMAL);
}

/**
 * 处理指数
 */
bool Scanner::ScanSignedInteger() {
  if (c0_ == '+' || c0_ == '-') AddLiteralCharAdvance();
  // we must have at least one decimal digit after 'e'/'E'
  if (!IsDecimalDigit(c0_)) return false;
  return ScanDecimalDigits();
}
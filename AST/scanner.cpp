/**
 * 流程
 * 从compile第四步CompileToplevel开始
 */
MaybeHandle<SharedFunctionInfo> CompileToplevel(ParseInfo* parse_info, Isolate* isolate, IsCompiledScope* is_compiled_scope) {
  // ...
  if (parse_info->literal() == nullptr && !parsing::ParseProgram(parse_info, isolate)) {
    return MaybeHandle<SharedFunctionInfo>();
  }
  // ...
}

bool ParseProgram(ParseInfo* info, Isolate* isolate) {
  // ...
  FunctionLiteral* result = nullptr;
  result = parser.ParseProgram(isolate, info);
  // ...
}

FunctionLiteral* Parser::ParseProgram(Isolate* isolate, ParseInfo* info) {
  // ...
  scanner_.Initialize();
  // ...
}

/**
 * 类介绍
 * 跟Utf16CharacterStream一个文件
 */
class V8_EXPORT_PRIVATE Scanner {
  private:
    // 当前字符的Unicode编码 -1表示结尾
    uc32 c0_;
    TokenDesc token_storage_[3];
    TokenDesc* current_;    // desc for current token (as returned by Next())
    TokenDesc* next_;       // desc for next token (one token look-ahead)
    TokenDesc* next_next_;  // desc for the token after next (after PeakAhead())
    // 从Handle<String>转换后的类型 负责执行解析的实际类
    Utf16CharacterStream* const source_;
}

/**
 * 属性具体内容
 */
// The current and look-ahead token.
typedef int32_t uc32;
struct TokenDesc {
  Location location = {0, 0};
  LiteralBuffer literal_chars;
  LiteralBuffer raw_literal_chars;
  Token::Value token = Token::UNINITIALIZED;
  MessageTemplate invalid_template_escape_message = MessageTemplate::kNone;
  Location invalid_template_escape_location;
  uint32_t smi_value_ = 0;
  bool after_line_terminator = false;
}

struct Location {
  Location(int b, int e) : beg_pos(b), end_pos(e) { }
  Location() : beg_pos(0), end_pos(0) { }

  int length() const { return end_pos - beg_pos; }
  bool IsValid() const { return IsInRange(beg_pos, 0, end_pos); }

  static Location invalid() { return Location(-1, 0); }

  int beg_pos;
  int end_pos;
};
// LiteralBuffer -  Collector of chars of literals.
class LiteralBuffer final {}
// 包含大量值的枚举
enum class MessageTemplate {
  kNone,
  // ...
  kLastMessage
};

/**
 * 这里并不是全面转换
 * 初始化parser时初始化了scanner的两个属性
 * Parser::Parser(ParseInfo* info) scanner_(info->character_stream(), info->is_module())
 */
void Scanner::Initialize() {
  Init();
  next().after_line_terminator = true;
  Scan();
}

/**
 * Init
 */
void Init() {
  Advance();

  current_ = &token_storage_[0];
  next_ = &token_storage_[1];
  next_next_ = &token_storage_[2];

  found_html_comment_ = false;
  scanner_error_ = MessageTemplate::kNone;
}

/**
 * 综下所述
 * 最后这个方法把源码字符串的第一个字符的ASCII编码给了c0_变量
 */
void Advance() {
  c0_ = source_->Advance();
}

/**
 * 从这里开始方法域跳到了Utf16CharacterStream、BufferedCharacterStreams
 * 即Utf16CharacterStream::Advance、Utf16CharacterStream::Peek、Utf16CharacterStream::ReadBlockChecked
 */
inline uc32 Advance() {
  uc32 result = Peek();
  buffer_cursor_++;
  return result;
}

/**
 * 返回游标所在位置的值
 * 1、已初始化
 * 2、未初始化
 * 3、已到结尾
 */
inline uc32 Peek() {
  if (V8_LIKELY(buffer_cursor_ < buffer_end_)) {
    return static_cast<uc32>(*buffer_cursor_);
  } else if (ReadBlockChecked()) {
    return static_cast<uc32>(*buffer_cursor_);
  } else {
    return kEndOfInput;
  }
}

/**
 * 这里是做一个初始化与合法性检测
 * 实际上只有ReadBlock做事
 */
bool ReadBlockChecked() { 
  size_t position = pos();
  USE(position);
  bool success = !has_parser_error() && ReadBlock();

  // Post-conditions: 1, We should always be at the right position.
  //                  2, Cursor should be inside the buffer.
  //                  3, We should have more characters available iff success.
  DCHECK_EQ(pos(), position);
  DCHECK_LE(buffer_cursor_, buffer_end_);
  DCHECK_LE(buffer_start_, buffer_cursor_);
  DCHECK_EQ(success, buffer_cursor_ < buffer_end_);
  return success;
}

/**
 * buffer_pos_代表当前进度位置 类型为整形
 * cursor、start作为指针都指向buffer_数组
 * 数组在内存中地址连续 且unsigned short类型占1
 * 所以可以直接通过计算得到当前位置
 */
inline size_t pos() const {
  return buffer_pos_ + (buffer_cursor_ - buffer_start_);
}

/**
 * 1、buffer_是一个unsigned short数组 存储编码处理后的单个字符
 * 2、指针start、end分别初始化为数组的头尾
 * 3、cursor是游标 初始指向start
 * 例如"(function)"在buffer_表示为[40, 102, ...]
 */
bool ReadBlock() final {
  size_t position = pos();
  buffer_pos_ = position;
  buffer_start_ = &buffer_[0];
  buffer_cursor_ = buffer_start_;

  DisallowHeapAllocation no_gc;
  Range<uint8_t> range = byte_stream_.GetDataAt(position, runtime_call_stats(), &no_gc);
  if (range.length() == 0) {
    buffer_end_ = buffer_start_;
    return false;
  }

  size_t length = Min(kBufferSize, range.length());
  i::CopyCharsUnsigned(buffer_, range.start, length);
  buffer_end_ = &buffer_[length];
  return true;
}

/**
 * Scan
 * 仅仅只涉及next_指针
 */
void Scanner::Scan() { Scan(next_); }
void Scanner::Scan(TokenDesc* next_desc) {
  next_desc->token = ScanSingleToken();
  /**
   * 设置当前词法的结束位置
   */
  next_desc->location.end_pos = source_pos();
}

/**
 * 这个ScanSingleToken方法可TM太长了
 */
V8_INLINE Token::Value Scanner::ScanSingleToken() {
  Token::Value token;
  do {
    /**
     * 设置当前词法的起始位置
     */
    next().location.beg_pos = source_pos();
    /**
     * Ascii码是从0 ~ 127
     * 简单的判断一下合法性
     */
    if (V8_LIKELY(static_cast<unsigned>(c0_) <= kMaxAscii)) {
      /**
       * 这是一个mapping数组
       * 对所有的Unicode => Ascii做了映射
       */
      token = one_char_tokens[c0_];
      /**
       * 包含非常多的case...先不展开了
       */
      switch (token) {
        case Token::LPAREN:
        case Token::RPAREN:
        // ...
          // One character tokens.
          return Select(token);
        case Token::STRING:
          return ScanString();
        case Token::NUMBER:
          return ScanNumber(false);
        case Token::IDENTIFIER:
          return ScanIdentifierOrKeyword();
        // ...
        default:
          UNREACHABLE();
      }
    }
    /**
     * 处理结束符、空格、异常符号等特殊情况
     */
    // ...
  } while (token == Token::WHITESPACE);

  return token;
}

/**
 * 上一篇解析了第一个字符 所以pos移动到了1
 * 然而记录location需要从头开始 所以这里做了一个偏移
 */
static const int kCharacterLookaheadBufferSize = 1;
int source_pos() {
  return static_cast<int>(source_->pos()) - kCharacterLookaheadBufferSize;
}

/**
 * 前进一步
 * 将当前解析的next_赋值到current_上面
 * next_next() => next_next_
 * if分支的previous等同于next_
 * else分支暂时没看懂
 */
Token::Value Scanner::Next() {
  TokenDesc* previous = current_;
  current_ = next_;
  if (V8_LIKELY(next_next().token == Token::UNINITIALIZED)) {
    next_ = previous;
    previous->after_line_terminator = false;
    Scan(previous);
  } else {
    next_ = next_next_;
    next_next_ = previous;
    previous->token = Token::UNINITIALIZED;
    DCHECK_NE(Token::UNINITIALIZED, current().token);
  }
  return current().token;
}

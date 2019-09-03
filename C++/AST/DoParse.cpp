FunctionLiteral* Parser::ParseProgram(Isolate* isolate, ParseInfo* info) {
  // ...
  /**
   * 前面完成了这一步
   */
  scanner_.Initialize();
  if (FLAG_harmony_hashbang) {
    scanner_.SkipHashBang();
  }
  // 接下来进这个方法
  FunctionLiteral* result = DoParseProgram(isolate, info);
  // ...
  return result;
}

FunctionLiteral* Parser::DoParseProgram(Isolate* isolate, ParseInfo* info) {
  // ...
  FunctionLiteral* result = nullptr;
  {
    // ...
    ScopedPtrList<Statement> body(pointer_buffer());
    int beg_pos = scanner()->location().beg_pos;
    if (parsing_module_) {
      // ...
    } else if (info->is_wrapped_as_function()) {
      ParseWrapped(isolate, info, &body, scope, zone());
    } else {
      // Don't count the mode in the use counters--give the program a chance
      // to enable script-wide strict mode below.
      this->scope()->SetLanguageMode(info->language_mode());
      ParseStatementList(&body, Token::EOS);
    }
    // ...
  }
  // ...
  return result;
}

void ParserBase<Impl>::ParseStatementList(StatementListT* body, Token::Value end_token) {
  // ...

  /**
   * 当之前初始化的第一个Token是字符串时
   * 判断可能是设置模式
   */
  while (peek() == Token::STRING) {
    bool use_strict = false;
    bool use_asm = false;

    Scanner::Location token_loc = scanner()->peek_location();
    /**
     * 做字符串严格判定
     * 声明类似于"use  strict"、"use \nstrict"、"use \x73trict"都是不合法的
     */
    if (scanner()->NextLiteralExactlyEquals("use strict")) {
      use_strict = true;
    } else if (scanner()->NextLiteralExactlyEquals("use asm")) {
      use_asm = true;
    }
    
    // 这里也提前进行解析
    StatementT stat = ParseStatementListItem();
    // ...

    body->Add(stat);

    if (use_strict) {
      // 进入严格模式
    } else if (use_asm) {
      // 进入asm模式
    } else {
      // 非配置字符串 进入普通模式
      RaiseLanguageMode(LanguageMode::kSloppy);
    }
  }

  TargetScopeT target_scope(this);
  /**
   * 其他情况全面解析AST
   */
  while (peek() != end_token) {
    StatementT stat = ParseStatementListItem();
    if (impl()->IsNull(stat)) return;
    if (stat->IsEmptyStatement()) continue;
    body->Add(stat);
  }
}

/**
 * 构造函数参数是一个针 指向一个内容为任意指针的vector
 * std::vector<void*>* pointer_buffer() { return &pointer_buffer_; }
 * std::vector<void*> pointer_buffer_;
 * ScopedPtrList<Statement>的简写类型为StatementListT 定义如下
 * using StatementListT = typename Types::StatementList;
 * using Types = ParserTypes<Impl>;
 * struct ParserTypes<Parser> { using StatementList = ScopedPtrList<v8::internal::Statement>; }
 */
ScopedPtrList<Statement> body(pointer_buffer());

template <typename T>
class ScopedPtrList final {
  public:
    void Add(T* value) {
      buffer_.push_back(value);
      ++end_;
    }
  private:
    std::vector<void*>& buffer_;
    size_t start_;
    size_t end_;
}

class Statement : public AstNode {
 protected:
  Statement(int position, NodeType type) : AstNode(position, type) {}

  static const uint8_t kNextBitFieldIndex = AstNode::kNextBitFieldIndex;
};
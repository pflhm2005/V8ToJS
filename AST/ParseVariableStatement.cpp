template <typename Impl>
bool ParserBase<Impl>::IsNextLetKeyword() {
  DCHECK_EQ(Token::LET, peek());
  Token::Value next_next = PeekAhead();
  switch (next_next) {
    case Token::LBRACE:
    case Token::LBRACK:
    case Token::IDENTIFIER:
    case Token::STATIC:
    case Token::LET:  // `let let;` is disallowed by static semantics, but the
                      // token must be first interpreted as a keyword in order
                      // for those semantics to apply. This ensures that ASI is
                      // not honored when a LineTerminator separates the
                      // tokens.
    case Token::YIELD:
    case Token::AWAIT:
    case Token::GET:
    case Token::SET:
    case Token::ASYNC:
      return true;
    case Token::FUTURE_STRICT_RESERVED_WORD:
      return is_sloppy(language_mode());
    default:
      return false;
  }
}

 V8_INLINE Token::Value PeekAhead() { return scanner()->PeekAhead(); }

 Token::Value Scanner::PeekAhead() {
  DCHECK(next().token != Token::DIV);
  DCHECK(next().token != Token::ASSIGN_DIV);

  if (next_next().token != Token::UNINITIALIZED) {
    return next_next().token;
  }
  TokenDesc* temp = next_;
  next_ = next_next_;
  next().after_line_terminator = false;
  Scan();
  next_next_ = next_;
  next_ = temp;
  return next_next().token;
}

struct DeclarationParsingResult {
  struct Declaration {
    Declaration(ExpressionT pattern, ExpressionT initializer)
        : pattern(pattern), initializer(initializer) {
    }

    ExpressionT pattern;
    ExpressionT initializer;
    int value_beg_pos = kNoSourcePosition;
  };

  DeclarationParsingResult()
      : first_initializer_loc(Scanner::Location::invalid()),
        bindings_loc(Scanner::Location::invalid()) {}

  DeclarationDescriptor descriptor;
  std::vector<Declaration> declarations;
  Scanner::Location first_initializer_loc;
  Scanner::Location bindings_loc;
};

struct DeclarationDescriptor {
  VariableMode mode;
  VariableKind kind;
  int declaration_pos;
  int initialization_pos;
};

// 变量的类型
// The order of this enum has to be kept in sync with the predicates below.
enum class VariableMode : uint8_t {
  // User declared variables:
  kLet,  // declared via 'let' declarations (first lexical)
  kConst,  // declared via 'const' declarations (last lexical)
  kVar,  // declared via 'var', and 'function' declarations
  // Variables introduced by the compiler:
  kTemporary,  // temporary variables (not user-visible), stack-allocated
               // unless the scope as a whole has forced context allocation
  kDynamic,  // always require dynamic lookup (we don't know
             // the declaration)
  kDynamicGlobal,  // requires dynamic lookup, but we know that the
                   // variable is global unless it has been shadowed
                   // by an eval-introduced variable
  kDynamicLocal,  // requires dynamic lookup, but we know that the
                  // variable is local and where it is unless it
                  // has been shadowed by an eval-introduced
                  // variable
  kLastLexicalVariableMode = kConst,
};
enum VariableKind : uint8_t {
  NORMAL_VARIABLE,
  PARAMETER_VARIABLE,
  THIS_VARIABLE,
  SLOPPY_BLOCK_FUNCTION_VARIABLE,
  SLOPPY_FUNCTION_NAME_VARIABLE
};

/**
 * Impl就是Parser
 */
template <typename Impl>
typename ParserBase<Impl>::StatementT ParserBase<Impl>::ParseVariableStatement(
    VariableDeclarationContext var_context,
    ZonePtrList<const AstRawString>* names) {
  // VariableStatement ::
  //   VariableDeclarations ';'

  // The scope of a var declared variable anywhere inside a function
  // is the entire function (ECMA-262, 3rd, 10.1.3, and 12.2). Thus we can
  // transform a source-level var declaration into a (Function) Scope
  // declaration, and rewrite the source-level initialization into an assignment
  // statement. We use a block to collect multiple assignments.
  //
  // We mark the block as initializer block because we don't want the
  // rewriter to add a '.result' assignment to such a block (to get compliant
  // behavior for code such as print(eval('var x = 7')), and for cosmetic
  // reasons when pretty-printing. Also, unless an assignment (initialization)
  // is inside an initializer block, it is ignored.

  DeclarationParsingResult parsing_result;
  ParseVariableDeclarations(var_context, &parsing_result, names);
  ExpectSemicolon();
  return impl()->BuildInitializationBlock(&parsing_result);
}

void ExpectSemicolon() {
  // Check for automatic semicolon insertion according to
  // the rules given in ECMA-262, section 7.9, page 21.
  Token::Value tok = peek();
  if (V8_LIKELY(tok == Token::SEMICOLON)) {
    Next();
    return;
  }
  if (V8_LIKELY(scanner()->HasLineTerminatorBeforeNext() ||
                Token::IsAutoSemicolon(tok))) {
    return;
  }

  if (scanner()->current_token() == Token::AWAIT && !is_async_function()) {
    ReportMessageAt(scanner()->location(),
                    MessageTemplate::kAwaitNotInAsyncFunction, kSyntaxError);
    return;
  }

  ReportUnexpectedToken(Next());
}

template <typename Impl>
void ParserBase<Impl>::ParseVariableDeclarations(
    VariableDeclarationContext var_context,
    DeclarationParsingResult* parsing_result,
    ZonePtrList<const AstRawString>* names) {
  // VariableDeclarations ::
  //   ('var' | 'const' | 'let') (Identifier ('=' AssignmentExpression)?)+[',']
  //
  // ES6:
  // FIXME(marja, nikolaos): Add an up-to-date comment about ES6 variable
  // declaration syntax.

  DCHECK_NOT_NULL(parsing_result);
  parsing_result->descriptor.kind = NORMAL_VARIABLE;
  parsing_result->descriptor.declaration_pos = peek_position();
  parsing_result->descriptor.initialization_pos = peek_position();

  switch (peek()) {
    case Token::VAR:
      parsing_result->descriptor.mode = VariableMode::kVar;
      Consume(Token::VAR);
      break;
    case Token::CONST:
      Consume(Token::CONST);
      parsing_result->descriptor.mode = VariableMode::kConst;
      break;
    case Token::LET:
      Consume(Token::LET);
      parsing_result->descriptor.mode = VariableMode::kLet;
      break;
    default:
      UNREACHABLE();  // by current callers
      break;
  }

  // 这个对象贼鸡巴重要啊
  VariableDeclarationParsingScope declaration(impl(), parsing_result->descriptor.mode, names);
  // 是否生成暂时性死区
  Scope* target_scope = IsLexicalVariableMode(parsing_result->descriptor.mode)
                            ? scope()
                            : scope()->GetDeclarationScope();
  /**
   * declarations()返回ThreadedList<Declaration> decls_
   * end()返回tail_
   * 即容器的尾部迭代器
   */ 
  auto declaration_it = target_scope->declarations()->end();

  int bindings_start = peek_position();
  do {
    // Parse binding pattern.
    FuncNameInferrerState fni_state(&fni_);

    int decl_pos = peek_position();

    // using IdentifierT = typename Types::Identifier;
    // using Identifier = const AstRawString*;
    IdentifierT name;
    // using ExpressionT = typename Types::Expression;
    // using Expression = v8::internal::Expression*;
    ExpressionT pattern;

    // 检查下一个Token是否是一个标识符
    if (V8_LIKELY(Token::IsAnyIdentifier(peek()))) {
      // 解析当前变量名
      name = ParseAndClassifyIdentifier(Next());
      // Unexpected eval or arguments in strict mode
      // if (V8_UNLIKELY(is_strict(language_mode()) &&
      //                 impl()->IsEvalOrArguments(name))) {
      //   impl()->ReportMessageAt(scanner()->location(),
      //                           MessageTemplate::kStrictEvalArguments);
      //   return;
      // }
      // 检查赋值运算符
      if (peek() == Token::ASSIGN ||
          (var_context == kForStatement && PeekInOrOf()) ||
          parsing_result->descriptor.mode == VariableMode::kLet) {
        // Assignments need the variable expression for the assignment LHS, and
        // for of/in will need it later, so create the expression now.
        pattern = impl()->ExpressionFromIdentifier(name, decl_pos);
      }
      // 仅仅声明变量 不做初始化 
      else {
        impl()->DeclareIdentifier(name, decl_pos);
        pattern = impl()->NullExpression();
      }
    } else {
      name = impl()->NullIdentifier();
      pattern = ParseBindingPattern();
    }

    Scanner::Location variable_loc = scanner()->location();

    ExpressionT value = impl()->NullExpression();
    int value_beg_pos = kNoSourcePosition;
    if (Check(Token::ASSIGN)) {
      {
        value_beg_pos = peek_position();
        AcceptINScope scope(this, var_context != kForStatement);
        value = ParseAssignmentExpression();
      }
      variable_loc.end_pos = end_position();

      if (!parsing_result->first_initializer_loc.IsValid()) {
        parsing_result->first_initializer_loc = variable_loc;
      }

      // Don't infer if it is "a = function(){...}();"-like expression.
      if (impl()->IsIdentifier(pattern)) {
        if (!value->IsCall() && !value->IsCallNew()) {
          fni_.Infer();
        } else {
          fni_.RemoveLastFunction();
        }
      }

      impl()->SetFunctionNameFromIdentifierRef(value, pattern);
    } else {
      if (var_context != kForStatement || !PeekInOrOf()) {
        // ES6 'const' and binding patterns require initializers.
        if (parsing_result->descriptor.mode == VariableMode::kConst ||
            impl()->IsNull(name)) {
          impl()->ReportMessageAt(
              Scanner::Location(decl_pos, end_position()),
              MessageTemplate::kDeclarationMissingInitializer,
              impl()->IsNull(name) ? "destructuring" : "const");
          return;
        }
        // 'let x' initializes 'x' to undefined.
        if (parsing_result->descriptor.mode == VariableMode::kLet) {
          value = factory()->NewUndefinedLiteral(position());
        }
      }
    }

    int initializer_position = end_position();
    // 声明处理完后scope中新的尾部
    auto declaration_end = target_scope->declarations()->end();
    for (; declaration_it != declaration_end; ++declaration_it) {
      declaration_it->var()->set_initializer_position(initializer_position);
    }

    typename DeclarationParsingResult::Declaration decl(pattern, value);
    decl.value_beg_pos = value_beg_pos;

    parsing_result->declarations.push_back(decl);
  } while (Check(Token::COMMA));

  parsing_result->bindings_loc =
      Scanner::Location(bindings_start, end_position());
}

V8_INLINE void Consume(Token::Value token) {
  Token::Value next = scanner()->Next();
}  
V8_INLINE bool Check(Token::Value token) {
  Token::Value next = scanner()->peek();
  if (next == token) {
    Consume(next);
    return true;
  }
  return false;
}

// Boilerplate for most derived classes.
#define DEFINE_AST_NODE_LEAF_BOILERPLATE(T)                        \
  static const Kind kKind = Kind::k##T;                            \
  static T* cast(AstNode* node) {                                  \
    if (node->kind != kKind) return nullptr;                       \
    return static_cast<T*>(node);                                  \
  }                                                                \
  static T* DynamicCast(AstNode* node) {                           \
    if (!node) return nullptr;                                     \
    if (!AstNodeClassCheck::IsInstanceOf<T>(node)) return nullptr; \
    return static_cast<T*>(node);                                  \
  }
// A Identifier is a string with a SourcePosition attached.
struct Identifier : AstNode {
  DEFINE_AST_NODE_LEAF_BOILERPLATE(Identifier)
  Identifier(SourcePosition pos, std::string identifier)
      : AstNode(kKind, pos), value(std::move(identifier)) {}
  std::string value;
};

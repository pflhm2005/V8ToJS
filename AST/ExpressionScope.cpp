// let or const
inline bool IsLexicalVariableMode(VariableMode mode) {
  return mode <= VariableMode::kLastLexicalVariableMode;
}

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

// ExpressionScope is used in a stack fashion, and is used to specialize
// expression parsing for the task at hand. It allows the parser to reuse the
// same code to parse destructuring declarations, assignment patterns,
// expressions, and (async) arrow function heads.
//
// One of the specific subclasses needs to be instantiated to tell the parser
// the meaning of the expression it will parse next. The parser then calls
// Record* on the expression_scope() to indicate errors. The expression_scope
// will either discard those errors, immediately report those errors, or
// classify the errors for later validation.
// TODO(verwaest): Record is a slightly odd name since it will directly throw
// for unambiguous scopes.
template <typename Types>
class ExpressionScope {
  public:
    ExpressionScope(ParserT* parser, ScopeType type) 
    : parser_(parser),
      parent_(parser->expression_scope_),
      type_(type),
      has_possible_parameter_in_scope_chain_(
          CanBeParameterDeclaration() ||
          (parent_ && parent_->has_possible_parameter_in_scope_chain_)) {
      parser->expression_scope_ = this;
    }
    /*
     * 类型判定
    */
    bool CanBeParameterDeclaration() const {
      return IsInRange(type_, kMaybeArrowParameterDeclaration, kParameterDeclaration);
    }
    bool CanBeExpression() const {
      return IsInRange(type_, kExpression, kMaybeAsyncArrowParameterDeclaration);
    }
    bool CanBeDeclaration() const {
      return IsInRange(type_, kMaybeArrowParameterDeclaration, kLexicalDeclaration);
    }

    // 向下强转类型
    ExpressionParsingScope<Types>* AsExpressionParsingScope() {
      return static_cast<ExpressionParsingScope<Types>*>(this);
    }
    // name是变量名
    VariableProxy* NewVariable(const AstRawString* name, int pos = kNoSourcePosition) {
      VariableProxy* result = parser_->NewRawVariable(name, pos);
      // 声明的右值是诸如1+1、() => {}、async function的表达式
      if (CanBeExpression()) {
        AsExpressionParsingScope()->TrackVariable(result);
      }
      // 普通的声明
      else {
        Variable* var = Declare(name, pos);
        if (IsVarDeclaration() && !parser()->scope()->is_declaration_scope()) {
          // Make sure we'll properly resolve the variable since we might be in a
          // with or catch scope. In those cases the proxy isn't guaranteed to
          // refer to the declared variable, so consider it unresolved.
          parser()->scope()->AddUnresolved(result);
        } else {
          result->BindTo(var);
        }
      }
      return result;
    }
    Variable* Declare(const AstRawString* name, int pos = kNoSourcePosition) {
      if (type_ == kParameterDeclaration) {
        return AsParameterDeclarationParsingScope()->Declare(name, pos);
      }
      return AsVariableDeclarationParsingScope()->Declare(name, pos);
    }
    // 类型强转
    ParameterDeclarationParsingScope<Types>*
    AsParameterDeclarationParsingScope() {
      return static_cast<ParameterDeclarationParsingScope<Types>*>(this);
    }
    VariableDeclarationParsingScope<Types>* AsVariableDeclarationParsingScope() {
      DCHECK(IsVariableDeclaration());
      return static_cast<VariableDeclarationParsingScope<Types>*>(this);
    }
  protected:
    enum ScopeType : uint8_t {
      // Expression or assignment target.
      kExpression,

      // Declaration or expression or assignment target.
      kMaybeArrowParameterDeclaration,
      kMaybeAsyncArrowParameterDeclaration,

      // Declarations.
      kParameterDeclaration,
      kVarDeclaration,
      kLexicalDeclaration,
    };
    Parser* parser() const { return parser_; }
    ExpressionScope* parent() const { return parent_; }
  private:
    ParserT* parser_;
    ExpressionScope<Types>* parent_;
    ScopeType type_;
    bool has_possible_parameter_in_scope_chain_;
}

// Parsing expressions is always ambiguous between at least left-hand-side and
// right-hand-side of assignments. This class is used to keep track of errors
// relevant for either side until it is clear what was being parsed.
// The class also keeps track of all variable proxies that are created while the
// scope was active. If the scope is an expression, the variable proxies will be
// added to the unresolved list. Otherwise they are declarations and aren't
// added. The list is also used to mark the variables as assigned in case we are
// parsing an assignment expression.
template <typename Types>
class ExpressionParsingScope : public ExpressionScope<Types> {
  public:
    void TrackVariable(VariableProxy* variable) {
      if (!this->CanBeDeclaration()) {
        this->parser()->scope()->AddUnresolved(variable);
      }
      variable_list_.Add(variable);
    }
  private:
    ScopedPtrList<VariableProxy> variable_list_;
    MessageTemplate messages_[kNumberOfErrors];
    Scanner::Location locations_[kNumberOfErrors];
    bool has_async_arrow_in_scope_chain_;
};

// Used to unambiguously parse var, let, const declarations.
template <typename Types>
class VariableDeclarationParsingScope : public ExpressionScope<Types> {
  public:
    VariableDeclarationParsingScope(
      ParserT* parser, 
      VariableMode mode, 
      ZonePtrList<const AstRawString>* names)
      : ExpressionScope(parser, IsLexicalVariableMode(mode) ? 
      ExpressionScope::kLexicalDeclaration : ExpressionScope::kVarDeclaration),
        mode_(mode),
        names_(names) {}
    /*
     * 唯一的方法 
    */
    Variable* Declare(const AstRawString* name, int pos) {
      VariableKind kind = NORMAL_VARIABLE;
      // 标记是否是第一次声明这个变量
      bool was_added;
      Variable* var = this->parser()->DeclareVariable(
          name, kind, mode_, Variable::DefaultInitializationFlag(mode_),
          this->parser()->scope(), &was_added, pos);
      if (was_added &&
          this->parser()->scope()->num_var() > kMaxNumFunctionLocals) {
        this->parser()->ReportMessage(MessageTemplate::kTooManyVariables);
      }
      if (names_) names_->Add(name, this->parser()->zone());
      if (this->IsLexicalDeclaration()) {
        if (this->parser()->IsLet(name)) {
          this->parser()->ReportMessageAt(
              Scanner::Location(pos, pos + name->length()),
              MessageTemplate::kLetInLexicalBinding);
        }
      } else {
        if (this->parser()->loop_nesting_depth() > 0) {
          // Due to hoisting, the value of a 'var'-declared variable may actually
          // change even if the code contains only the "initial" assignment,
          // namely when that assignment occurs inside a loop.  For example:
          //
          //   let i = 10;
          //   do { var x = i } while (i--):
          //
          // Note that non-lexical variables include temporaries, which may also
          // get assigned inside a loop due to the various rewritings that the
          // parser performs.
          //
          // Pessimistically mark all vars in loops as assigned. This
          // overapproximates the actual assigned vars due to unassigned var
          // without initializer, but that's unlikely anyway.
          //
          // This also handles marking of loop variables in for-in and for-of
          // loops, as determined by loop-nesting-depth.
          DCHECK_NOT_NULL(var);
          var->set_maybe_assigned();
        }
      }
      return var;
    }
  private:
    // Limit the allowed number of local variables in a function. The hard limit
    // in Ignition is 2^31-1 due to the size of register operands. We limit it to
    // a more reasonable lower up-limit.
    static const int kMaxNumFunctionLocals = (1 << 23) - 1;

    VariableMode mode_;
    ZonePtrList<const AstRawString>* names_;
};

template <typename Types>
class ParameterDeclarationParsingScope : public ExpressionScope<Types> {
  public:
    Variable* Declare(const AstRawString* name, int pos) {
      VariableKind kind = PARAMETER_VARIABLE;
      VariableMode mode = VariableMode::kVar;
      bool was_added;
      Variable* var = this->parser()->DeclareVariable(
          name, kind, mode, Variable::DefaultInitializationFlag(mode),
          this->parser()->scope(), &was_added, pos);
      if (!has_duplicate() && !was_added) {
        duplicate_loc_ = Scanner::Location(pos, pos + name->length());
      }
      return var;
    }
};
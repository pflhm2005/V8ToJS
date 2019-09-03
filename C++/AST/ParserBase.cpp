class Scope;
class FunctionState;
class AstValueFactory;
class AstNodeFactory;
class RuntimeCallStats;
class Variable;
namespace internal{
  class Logger;
}
namespace v8{
  class Extension;
}

template <typename Impl>
class ParserBase {
  public:
    Scope* scope() const { return scope_; }
    AstNodeFactory* factory() { return &ast_node_factory_; }
    AstValueFactory* ast_value_factory() const { return ast_value_factory_; }
    ExpressionScope* expression_scope() const { return expression_scope_; }
    bool IsLet(const AstRawString* identifier) const {
      return identifier == ast_value_factory()->let_string();
    }

    VariableProxy* NewRawVariable(const AstRawString* name, int pos) {
      // AstNodeFactory
      return factory()->ast_node_factory()->NewVariableProxy(name, NORMAL_VARIABLE, pos);
    }
    AstRawString* ParseAndClassifyIdentifier(Token::Value next) {
      if (V8_LIKELY(IsInRange(next, Token::IDENTIFIER, Token::ASYNC))) {
        IdentifierT name = impl()->GetIdentifier();
        if (V8_UNLIKELY(impl()->IsArguments(name) &&
                        scope()->ShouldBanArguments())) {
          ReportMessage(MessageTemplate::kArgumentsDisallowedInInitializer);
          return impl()->EmptyIdentifierString();
        }
        return name;
      }

      if (!Token::IsValidIdentifier(next, language_mode(), is_generator(),
                                    parsing_module_ || is_async_function())) {
        ReportUnexpectedToken(next);
        return impl()->EmptyIdentifierString();
      }

      if (next == Token::AWAIT) {
        expression_scope()->RecordAsyncArrowParametersError(
            scanner()->location(), MessageTemplate::kAwaitBindingIdentifier);
        return impl()->GetIdentifier();
      }

      DCHECK(Token::IsStrictReservedWord(next));
      expression_scope()->RecordStrictModeParameterError(
          scanner()->location(), MessageTemplate::kUnexpectedStrictReserved);
      return impl()->GetIdentifier();
    }
    AstRawString* GetIdentifier() const { return GetSymbol(); }
    AstRawString* GetSymbol() const {
      const AstRawString* result = scanner()->CurrentSymbol(ast_value_factory());
      DCHECK_NOT_NULL(result);
      return result;
    }
    Vector<const uint8_t> literal_one_byte_string() const {
      DCHECK(current().CanAccessLiteral() || Token::IsKeyword(current().token));
      return current().literal_chars.one_byte_literal();
    }
  protected:
    Scope* scope_;                   // Scope stack.
    Scope* original_scope_;  // The top scope for the current parsing item.
    FunctionState* function_state_;  // Function state stack.
    v8::Extension* extension_;
    FuncNameInferrer fni_;
    AstValueFactory* ast_value_factory_;  // Not owned.
    AstNodeFactory ast_node_factory_;
    RuntimeCallStats* runtime_call_stats_;
    internal::Logger* logger_;
    bool parsing_on_main_thread_;
    const bool parsing_module_;
    uintptr_t stack_limit_;
};

CurrentSymbol(AstValueFactory* ast_value_factory) const {
  if (is_literal_one_byte()) {
    return ast_value_factory->GetOneByteString(literal_one_byte_string());
  }
  return ast_value_factory->GetTwoByteString(literal_two_byte_string());
}

constexpr int kNoSourcePosition = -1;

class Parser : public ParserBase<Parser> {
  public:
    VariableProxy* ExpressionFromIdentifier(
        const AstRawString* name, int start_position,
        InferName infer = InferName::kYes) {
      if (infer == InferName::kYes) {
        fni_.PushVariableName(name);
      }
      return expression_scope()->NewVariable(name, start_position);
    }
    // explicit Parser(ParseInfo* info)
    // : ParserBase<Parser>(info->zone(), &scanner_, info->stack_limit(),
    //                     info->extension(), info->GetOrCreateAstValueFactory(),
    //                     info->pending_error_handler(),
    //                     info->runtime_call_stats(), info->logger(),
    //                     info->script().is_null() ? -1 : info->script()->id(),
    //                     info->is_module(), true),
    //   info_(info),
    //   scanner_(info->character_stream(), info->is_module()),
    //   preparser_zone_(info->zone()->allocator(), ZONE_NAME),
    //   reusable_preparser_(nullptr),
    //   mode_(PARSE_EAGERLY),  // Lazy mode must be set explicitly.
    //   source_range_map_(info->source_range_map()),
    //   target_stack_(nullptr),
    //   total_preparse_skipped_(0),
    //   consumed_preparse_data_(info->consumed_preparse_data()),
    //   preparse_data_buffer_(),
    //   parameters_end_pos_(info->parameters_end_pos()) {
    //   // ...
    // }
    Variable* Parser::DeclareVariable(const AstRawString* name, VariableKind kind,
                                      VariableMode mode, InitializationFlag init,
                                      Scope* scope, bool* was_added, int begin,
                                      int end = kNoSourcePosition) {
      Declaration* declaration;
      // var声明
      if (mode == VariableMode::kVar && !scope->is_declaration_scope()) {
        declaration = factory()->NewNestedVariableDeclaration(scope, begin);
      } else {
        declaration = factory()->NewVariableDeclaration(begin);
      }
      Declare(declaration, name, kind, mode, init, scope, was_added, begin, end);
      return declaration->var();
    }
    void Declare(Declaration* declaration, const AstRawString* name,
                     VariableKind variable_kind, VariableMode mode,
                     InitializationFlag init, Scope* scope, bool* was_added,
                     int var_begin_pos, int var_end_pos) {
      bool local_ok = true;
      bool sloppy_mode_block_scope_function_redefinition = false;
      scope->DeclareVariable(
          declaration, name, var_begin_pos, mode, variable_kind, init, was_added,
          &sloppy_mode_block_scope_function_redefinition, &local_ok);
      if (!local_ok) {
        // If we only have the start position of a proxy, we can't highlight the
        // whole variable name.  Pretend its length is 1 so that we highlight at
        // least the first character.
        Scanner::Location loc(var_begin_pos, var_end_pos != kNoSourcePosition
                                                ? var_end_pos
                                                : var_begin_pos + 1);
        if (variable_kind == PARAMETER_VARIABLE) {
          ReportMessageAt(loc, MessageTemplate::kParamDupe);
        } else {
          ReportMessageAt(loc, MessageTemplate::kVarRedeclaration,
                          declaration->var()->raw_name());
        }
      } else if (sloppy_mode_block_scope_function_redefinition) {
        ++use_counts_[v8::Isolate::kSloppyModeBlockScopedFunctionRedefinition];
      }
    }
};
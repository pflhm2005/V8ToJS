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
// PointerWithPayload combines a PointerType* an a small PayloadType into
// one. The bits of the storage type get packed into the lower bits of the
// pointer that are free due to alignment. The user needs to specify how many
// bits are needed to store the PayloadType, allowing Types that by default are
// larger to be stored.
//
// Example:
//   PointerWithPayload<int *, bool, 1> data_and_flag;
//
//   Here we store a bool that needs 1 bit of storage state into the lower bits
//   of int *, which points to some int data;

template <typename PointerType, typename PayloadType, int NumPayloadBits>
class PointerWithPayload {
  // 内存对齐 不知道是啥
  static constexpr int kAvailBits = alignof(PointerType) >= 8 ? 3 : alignof(PointerType) >= 4 ? 2 : 1;
  static_assert(
      kAvailBits >= NumPayloadBits,
      "Ptr does not have sufficient alignment for the selected amount of "
      "storage bits.");

  static constexpr uintptr_t kPayloadMask = (uintptr_t{1} << kAvailBits) - 1;
  static constexpr uintptr_t kPointerMask = ~kPayloadMask;

 public:
  PointerWithPayload() {}

  explicit PointerWithPayload(PointerType* pointer)
      : pointer_(reinterpret_cast<uintptr_t>(pointer)) {}

  explicit PointerWithPayload(PayloadType payload)
      : pointer_(static_cast<uintptr_t>(payload)) {
  }

  PointerWithPayload(PointerType* pointer, PayloadType payload) {
    update(pointer, payload);
  }

  V8_INLINE PointerType* GetPointer() const {
    return reinterpret_cast<PointerType*>(pointer_ & kPointerMask);
  }

  V8_INLINE PointerType* operator->() const { return GetPointer(); }

  V8_INLINE void update(PointerType* new_pointer, PayloadType new_payload) {
    pointer_ = reinterpret_cast<uintptr_t>(new_pointer) |
               static_cast<uintptr_t>(new_payload);
  }

  V8_INLINE PayloadType GetPayload() const {
    return static_cast<PayloadType>(pointer_ & kPayloadMask);
  }

 private:
  uintptr_t pointer_ = 0;
};

class FuncNameInferrer {
  public:
    explicit FuncNameInferrer(AstValueFactory* ast_value_factory);
    // Returns whether we have entered name collection state.
    bool IsOpen() const { return scope_depth_ > 0; }
    void FuncNameInferrer::PushVariableName(const AstRawString* name) {
      if (IsOpen() && name != ast_value_factory_->dot_result_string()) {
        names_stack_.push_back(Name(name, kVariableName));
      }
    }
  private:
    enum NameType : uint8_t {
      kEnclosingConstructorName,
      kLiteralName,
      kVariableName
    };
    struct Name {
      // Needed for names_stack_.resize()
      Name() { UNREACHABLE(); }
      Name(const AstRawString* name, NameType type)
          : name_and_type_(name, type) {}

      PointerWithPayload<const AstRawString, NameType, 2> name_and_type_;
      inline const AstRawString* name() const {
        return name_and_type_.GetPointer();
      }
      inline NameType type() const { return name_and_type_.GetPayload(); }
    };

    AstValueFactory* ast_value_factory_;
    std::vector<Name> names_stack_;
    std::vector<FunctionLiteral*> funcs_to_infer_;
    size_t scope_depth_ = 0;
};

enum class InferName { kYes, kNo };

template <typename Impl>
class ParserBase {
  public:
    Scope* scope() const { return scope_; }
    AstNodeFactory* factory() { return &ast_node_factory_; }
    VariableProxy* ExpressionFromIdentifier(const AstRawString* name, int start_position, InferName infer = InferName::kYes) {
      if (infer == InferName::kYes) {
        fni_.PushVariableName(name);
      }
      // 实际上返回的就是下面这个
      return expression_scope()->NewVariable(name, start_position);
    }
    VariableProxy* NewRawVariable(const AstRawString* name, int pos) {
      // AstNodeFactory
      return factory()->ast_node_factory()->NewVariableProxy(name, NORMAL_VARIABLE, pos);
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

constexpr int kNoSourcePosition = -1;

class Parser : public ParserBase<Parser> {
  public:
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
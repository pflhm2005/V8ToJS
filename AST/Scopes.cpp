class ZoneObject {};
class ZoneHashMap {};


// A hash map to support fast variable declaration and lookup.
class VariableMap : public ZoneHashMap {
 public:
  explicit VariableMap(Zone* zone);

  Variable* Declare(Zone* zone, Scope* scope, const AstRawString* name,
                    VariableMode mode, VariableKind kind,
                    InitializationFlag initialization_flag,
                    MaybeAssignedFlag maybe_assigned_flag, bool* was_added) {
    // AstRawStrings are unambiguous, i.e., the same string is always represented
    // by the same AstRawString*.
    // FIXME(marja): fix the type of Lookup.
    Entry* p = ZoneHashMap::LookupOrInsert(const_cast<AstRawString*>(name), name->Hash(), ZoneAllocationPolicy(zone));
    *was_added = p->value == nullptr;
    if (*was_added) {
      // The variable has not been declared yet -> insert it.
      Variable* variable = new (zone) Variable(scope, name, mode, kind, initialization_flag, maybe_assigned_flag);
      p->value = variable;
    }
    return reinterpret_cast<Variable*>(p->value);
  }

  Variable* Lookup(const AstRawString* name) {
    Entry* p = ZoneHashMap::Lookup(const_cast<AstRawString*>(name), name->Hash());
    if (p != nullptr) {
      return reinterpret_cast<Variable*>(p->value);
    }
    return nullptr;
  }
  void Remove(Variable* var);
  void Add(Zone* zone, Variable* var);
};

class Scope : public ZoneObject {
  public:
    Scope(Zone* zone, Scope* outer_scope, ScopeType scope_type);
    bool is_declaration_scope() const { return is_declaration_scope_; }
    // The scope immediately surrounding this scope, or nullptr.
    Scope* outer_scope() const { return outer_scope_; }
    // Declarations list.
    base::ThreadedList<Declaration>* declarations() { return &decls_; }
    DeclarationScope* GetDeclarationScope() {
      Scope* scope = this;
      while (!scope->is_declaration_scope()) {
        scope = scope->outer_scope();
      }
      return scope->AsDeclarationScope();
    }
    DeclarationScope* AsDeclarationScope() {
      return static_cast<DeclarationScope*>(this);
    }

    // Lookup a variable in this scope. Returns the variable or nullptr if not
    // found.
    Variable* LookupLocal(const AstRawString* name) {
      return variables_.Lookup(name);
    }
    Variable* DeclareVariable(
      Declaration* declaration, const AstRawString* name, int pos,
      VariableMode mode, VariableKind kind, InitializationFlag init,
      bool* was_added, bool* sloppy_mode_block_scope_function_redefinition,
      bool* ok) {
        // 理论上不会进这里...
      if (mode == VariableMode::kVar && !is_declaration_scope()) {
        return GetDeclarationScope()->DeclareVariable(
            declaration, name, pos, mode, kind, init, was_added,
            sloppy_mode_block_scope_function_redefinition, ok);
      }
      // 这里仅仅是做搜索
      Variable* var = LookupLocal(name);
      *was_added = var == nullptr;
      // 成功插入该变量
      if (V8_LIKELY(*was_added)) {
        // 声明全局变量
        if (V8_UNLIKELY(is_eval_scope() && is_sloppy(language_mode()) &&
                        mode == VariableMode::kVar)) {
          // In a var binding in a sloppy direct eval, pollute the enclosing scope
          // with this new binding by doing the following:
          // The proxy is bound to a lookup variable to force a dynamic declaration
          // using the DeclareEvalVar or DeclareEvalFunction runtime functions.
          var = NonLocal(name, VariableMode::kDynamic);
          // Mark the var as used in case anyone outside the eval wants to use it.
          var->set_is_used();
        } 
        // 本地变量
        else {
          // Declare the name.
          var = DeclareLocal(name, mode, kind, was_added, init);
        }
      } else {
        var->set_maybe_assigned();
        if (V8_UNLIKELY(IsLexicalVariableMode(mode) ||
                        IsLexicalVariableMode(var->mode()))) {
          // The name was declared in this scope before; check for conflicting
          // re-declarations. We have a conflict if either of the declarations is
          // not a var (in script scope, we also have to ignore legacy const for
          // compatibility). There is similar code in runtime.cc in the Declare
          // functions. The function CheckConflictingVarDeclarations checks for
          // var and let bindings from different scopes whereas this is a check
          // for conflicting declarations within the same scope. This check also
          // covers the special case
          //
          // function () { let x; { var x; } }
          //
          // because the var declaration is hoisted to the function scope where
          // 'x' is already bound.
          //
          // In harmony we treat re-declarations as early errors. See ES5 16 for a
          // definition of early errors.
          //
          // Allow duplicate function decls for web compat, see bug 4693.
          *ok = var->is_sloppy_block_function() &&
                kind == SLOPPY_BLOCK_FUNCTION_VARIABLE;
          *sloppy_mode_block_scope_function_redefinition = *ok;
        }
      }

      // We add a declaration node for every declaration. The compiler
      // will only generate code if necessary. In particular, declarations
      // for inner local variables that do not represent functions won't
      // result in any generated code.
      //
      // This will lead to multiple declaration nodes for the
      // same variable if it is declared several times. This is not a
      // semantic issue, but it may be a performance issue since it may
      // lead to repeated DeclareEvalVar or DeclareEvalFunction calls.
      decls_.Add(declaration);
      declaration->set_var(var);
      return var;
    }
    Variable* DeclareLocal(const AstRawString* name, VariableMode mode,
                              VariableKind kind, bool* was_added,
                              InitializationFlag init_flag) {
      // 这个方法仅处理var、let、const
      Variable* var = Declare(zone(), name, mode, kind, init_flag, kNotAssigned, was_added);

      // Pessimistically assume that top-level variables will be assigned and used.
      //
      // Top-level variables in a script can be accessed by other scripts or even
      // become global properties. While this does not apply to top-level variables
      // in a module (assuming they are not exported), we must still mark these as
      // assigned because they might be accessed by a lazily parsed top-level
      // function, which, for efficiency, we preparse without variable tracking.
      if (is_script_scope() || is_module_scope()) {
        if (mode != VariableMode::kConst) var->set_maybe_assigned();
        var->set_is_used();
      }

      return var;
    }

    void Scope::AddUnresolved(VariableProxy* proxy) {
      unresolved_list_.Add(proxy);
    }
  private:
    Variable* Declare(Zone* zone, const AstRawString* name, VariableMode mode,
                    VariableKind kind, InitializationFlag initialization_flag,
                    MaybeAssignedFlag maybe_assigned_flag, bool* was_added) {
      // 这里才是插入值
      Variable* result = variables_.Declare(zone, this, name, mode, kind, initialization_flag,
                            maybe_assigned_flag, was_added);
      if (*was_added) locals_.Add(result);
      return result;
    }

    Zone* zone_;

    // Scope tree.
    Scope* outer_scope_;  // the immediately enclosing outer scope, or nullptr
    Scope* inner_scope_;  // an inner scope of this scope
    Scope* sibling_;  // a sibling inner scope of the outer scope of this scope.

    // The variables declared in this scope:
    //
    // All user-declared variables (incl. parameters).  For script scopes
    // variables may be implicitly 'declared' by being used (possibly in
    // an inner scope) with no intervening with statements or eval calls.
    VariableMap variables_;
    // In case of non-scopeinfo-backed scopes, this contains the variables of the
    // map above in order of addition.
    base::ThreadedList<Variable> locals_;
    // Unresolved variables referred to from this scope. The proxies themselves
    // form a linked list of all unresolved proxies.
    UnresolvedList unresolved_list_;
    // Declarations.
    base::ThreadedList<Declaration> decls_;

    // Serialized scope info support.
    Handle<ScopeInfo> scope_info_;
    // Source positions.
    int start_position_;
    int end_position_;

    // Computed via AllocateVariables.
    int num_stack_slots_;
    int num_heap_slots_;

    // The scope type.
    const ScopeType scope_type_;

    // Scope-specific information computed during parsing.
    //
    // The language mode of this scope.
    STATIC_ASSERT(LanguageModeSize == 2);
    bool is_strict_ : 1;
    // This scope or a nested catch scope or with scope contain an 'eval' call. At
    // the 'eval' call site this scope is the declaration scope.
    bool scope_calls_eval_ : 1;
    // This scope's declarations might not be executed in order (e.g., switch).
    bool scope_nonlinear_ : 1;
    bool is_hidden_ : 1;
    // Temporary workaround that allows masking of 'this' in debug-evalute scopes.
    bool is_debug_evaluate_scope_ : 1;

    // True if one of the inner scopes or the scope itself calls eval.
    bool inner_scope_calls_eval_ : 1;
    bool force_context_allocation_ : 1;
    bool force_context_allocation_for_parameters_ : 1;

    // True if it holds 'var' declarations.
    bool is_declaration_scope_ : 1;

    bool must_use_preparsed_scope_data_ : 1;
}
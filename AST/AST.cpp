class AstNodeFactory final {
  public:
    AstNodeFactory(AstValueFactory* ast_value_factory, Zone* zone)
      : zone_(zone),
        ast_value_factory_(ast_value_factory),
        empty_statement_(new (zone) class EmptyStatement()),
        this_expression_(new (zone) class ThisExpression()),
        failure_expression_(new (zone) class FailureExpression()) {}
    Zone* zone() const { return zone_; }
    VariableProxy* NewVariableProxy(const AstRawString* name,
                                    VariableKind variable_kind,
                                    int start_position = kNoSourcePosition) {
      return new (zone_) VariableProxy(name, variable_kind, start_position);
    }
    VariableDeclaration* NewVariableDeclaration(int pos) {
      return new (zone_) VariableDeclaration(pos);
    }
  private:
    // This zone may be deallocated upon returning from parsing a function body
    // which we can guarantee is not going to be compiled or have its AST
    // inspected.
    // See ParseFunctionLiteral in parser.cc for preconditions.
    Zone* zone_;
    AstValueFactory* ast_value_factory_;
    class EmptyStatement* empty_statement_;
    class ThisExpression* this_expression_;
    class FailureExpression* failure_expression_;
};

// ZoneObject is an abstraction that helps define classes of objects
// allocated in the Zone. Use it as a base class; see ast.h.
class ZoneObject {};

// The AST refers to variables via VariableProxies - placeholders for the actual
// variables. Variables themselves are never directly referred to from the AST,
// they are maintained by scopes, and referred to from VariableProxies and Slots
// after binding and variable allocation.
class Variable final : public ZoneObject {};

class AstNode: public ZoneObject {
  protected:
    uint32_t bit_field_;
    static const uint8_t kNextBitFieldIndex = NodeTypeField::kNext;

    AstNode(int position, NodeType type) : position_(position), bit_field_(NodeTypeField::encode(type)) {}
  private:
    // Hidden to prevent accidental usage. It would have to load the
    // current zone from the TLS.
    void* operator new(size_t size);

    int position_;
    class NodeTypeField : public BitField<NodeType, 0, 6> {};
}

class Expression : public AstNode {
  public:
    enum Context {
      // Not assigned a context yet, or else will not be visited during
      // code generation.
      kUninitialized,
      // Evaluated for its side effects.
      kEffect,
      // Evaluated for its value (and side effects).
      kValue,
      // Evaluated for control flow (and side effects).
      kTest
    };
  protected:
    Expression(int pos, NodeType type) : AstNode(pos, type) {}
};

class Declaration : public AstNode {
  public:
    typedef base::ThreadedList<Declaration> List;

    Variable* var() const { return var_; }
    void set_var(Variable* var) { var_ = var; }

  protected:
    Declaration(int pos, NodeType type) : AstNode(pos, type), next_(nullptr) {}

  private:
    Variable* var_;
    // Declarations list threaded through the declarations.
    Declaration** next() { return &next_; }
    Declaration* next_;
    friend List;
    friend base::ThreadedListTraits<Declaration>;
};

class VariableDeclaration : public Declaration {
 public:
  inline NestedVariableDeclaration* AsNested();

 private:
  friend class AstNodeFactory;

  class IsNestedField
      : public BitField<bool, Declaration::kNextBitFieldIndex, 1> {};

 protected:
  explicit VariableDeclaration(int pos, bool is_nested = false)
      : Declaration(pos, kVariableDeclaration) {
    bit_field_ = IsNestedField::update(bit_field_, is_nested);
  }

  static const uint8_t kNextBitFieldIndex = IsNestedField::kNext;
};

// The AST refers to variables via VariableProxies - placeholders for the actual
// variables. Variables themselves are never directly referred to from the AST,
// they are maintained by scopes, and referred to from VariableProxies and Slots
// after binding and variable allocation.
class Variable final : public ZoneObject {
  public:
    Variable(Scope* scope, const AstRawString* name, VariableMode mode,
            VariableKind kind, InitializationFlag initialization_flag,
            MaybeAssignedFlag maybe_assigned_flag = kNotAssigned)
        : scope_(scope),
          name_(name),
          local_if_not_shadowed_(nullptr),
          next_(nullptr),
          index_(-1),
          initializer_position_(kNoSourcePosition),
          bit_field_(MaybeAssignedFlagField::encode(maybe_assigned_flag) |
                    InitializationFlagField::encode(initialization_flag) |
                    VariableModeField::encode(mode) |
                    IsUsedField::encode(false) |
                    ForceContextAllocationField::encode(false) |
                    ForceHoleInitializationField::encode(false) |
                    LocationField::encode(VariableLocation::UNALLOCATED) |
                    VariableKindField::encode(kind)) {
      // Var declared variables never need initialization.
      DCHECK(!(mode == VariableMode::kVar &&
              initialization_flag == kNeedsInitialization));
    }
    bool is_assigned() const { return IsAssignedField::decode(bit_field_); }
    void set_is_assigned() {
      bit_field_ = IsAssignedField::update(bit_field_, true);
      if (is_resolved()) {
        var()->set_maybe_assigned();
      }
    }

    bool is_resolved() const { return IsResolvedField::decode(bit_field_); }
    void set_is_resolved() {
      bit_field_ = IsResolvedField::update(bit_field_, true);
    }
    bool is_used() { return IsUsedField::decode(bit_field_); }
    void set_is_used() { bit_field_ = IsUsedField::update(bit_field_, true); }
    MaybeAssignedFlag maybe_assigned() const {
      return MaybeAssignedFlagField::decode(bit_field_);
    }
    void set_maybe_assigned() {
      bit_field_ = MaybeAssignedFlagField::update(bit_field_, kMaybeAssigned);
    }
    void set_initializer_position(int pos) { initializer_position_ = pos; }
  private:
    Scope* scope_;
    const AstRawString* name_;
    // If this field is set, this variable references the stored locally bound
    // variable, but it might be shadowed by variable bindings introduced by
    // sloppy 'eval' calls between the reference scope (inclusive) and the
    // binding scope (exclusive).
    Variable* local_if_not_shadowed_;
    Variable* next_;
    int index_;
    int initializer_position_;
    uint16_t bit_field_;
}

enum InitializationFlag : uint8_t { kNeedsInitialization, kCreatedInitialized };

class VariableProxy final : public Expression {
  public:
    static InitializationFlag DefaultInitializationFlag(VariableMode mode) {
      return mode == VariableMode::kVar ? kCreatedInitialized : kNeedsInitialization;
    }
    Variable* var() const {
      return var_;
    }
    void set_var(Variable* v) {
      var_ = v;
    }
    void set_is_resolved() {
      bit_field_ = IsResolvedField::update(bit_field_, true);
    }
    bool is_assigned() const { return IsAssignedField::decode(bit_field_); }
    BindTo(Variable* var) {
      DCHECK_EQ(raw_name(), var->raw_name());
      set_var(var);
      set_is_resolved();
      var->set_is_used();
      if (is_assigned()) var->set_maybe_assigned();
    }
  private:
    VariableProxy(const AstRawString* name, VariableKind variable_kind, int start_position)
      : Expression(start_position, kVariableProxy),
        raw_name_(name),
        next_unresolved_(nullptr) {
      bit_field_ |= IsAssignedField::encode(false) |
                    IsResolvedField::encode(false) |
                    IsRemovedFromUnresolvedField::encode(false) |
                    HoleCheckModeField::encode(HoleCheckMode::kElided);
    }
    VariableProxy** next() { return &next_unresolved_; }
    VariableProxy* next_unresolved_;
    union {
      const AstRawString* raw_name_;  // if !is_resolved_
      Variable* var_;                 // if is_resolved_
    };
};
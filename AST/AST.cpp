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

class VariableProxy final : public Expression {
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
};
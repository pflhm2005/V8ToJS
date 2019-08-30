import { 
  kVar,
  kVariableDeclaration,
  kNoSourcePosition,
} from "../base/Const";

const update = () => {};
const decode = () => {};

export class AstNodeFactory {
  NewVariableProxy(name, variable_kind, start_position = kNoSourcePosition) {
    return new VariableProxy(name, variable_kind, start_position);
  }
  NewVariableDeclaration(pos) {
    return new VariableDeclaration(pos);
  }
}

class AstNode {
  constructor(position, type) {
    this.position_ = position;
    this.bit_field_ = this.encode(type);
  }
  encode() {}
}

class Declaration extends AstNode {
  constructor(pos, type) {
    super(pos, type);
    this.next_ = null;
    this.var_ = null;
  }
  var() { return this.var_; }
  set_var(v) { this.var_ = v; }

  // Declarations list threaded through the declarations.
  // Declaration** next() { return &next_; }
  // Declaration* next_;
}

class VariableDeclaration extends Declaration {
  constructor(pos, is_nested = false) {
    super(pos, kVariableDeclaration);
    this.bit_field_ = update(this.bit_field_, is_nested);
  }
}

export class Expression extends AstNode {
  constructor(pos = 0, type = 0) {
    super(pos, type);
  }
}

// The AST refers to variables via VariableProxies - placeholders for the actual
// variables. Variables themselves are never directly referred to from the AST,
// they are maintained by scopes, and referred to from VariableProxies and Slots
// after binding and variable allocation.
const kNotAssigned = 0;
const kMaybeAssigned = 1;

const kNeedsInitialization = 0;
const kCreatedInitialized = 1;
class ZoneObject {}
export class Variable extends ZoneObject {
  constructor(scope, name, mode, kind, initialization_flag, maybe_assigned_flag = kNotAssigned) {
    super();
    this.scope_ = scope;
    this.name_ = name;
    this.local_if_not_shadowed_ = false;
    this.next_ = null;
    this.index_ = -1;
    this.initializer_position_ = kNoSourcePosition;
    this.bit_field_ = 0; // TODO
  }
  set_is_used() { this.bit_field_ = update(this.bit_field_, true); }
  set_maybe_assigned() { this.bit_field_ = update(this.bit_field_, kMaybeAssigned); }

  static DefaultInitializationFlag(mode) { return mode === kVar ? kCreatedInitialized : kNeedsInitialization; }
};

export class VariableProxy extends Expression {
  constructor(name, variable_kind, start_position) {
    super(start_position, variable_kind);
    this.raw_name_ = name;
    this.next_unresolved_ = null;

    this.var_ = null;

    this.bit_field_ |= 0;
  }
  set_var(v) { this.var_ = v; }
  set_is_resolved() { this.bit_field_ = update(this.bit_field_, true); }
  is_assigned() { return decode(this.bit_field_); }

  BindTo(variable) {
    this.set_var(variable);
    this.set_is_resolved();
    variable.set_is_used();
    if (this.is_assigned()) variable.set_maybe_assigned();
  }
}


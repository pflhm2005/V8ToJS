class ZoneObject {};

class Scope extends ZoneObject {
  constructor() {
    super();
    this.outer_scope_ = new Scope();
    this.inner_scope_ = new Scope();
    this.is_declaration_scope_ = 1;
  }
  is_declaration_scope() { return this.is_declaration_scope_; }
  outer_scope() { return this.outer_scope_; }
  GetDeclarationScope() {
    let scope = this;
    while (!scope.is_declaration_scope()) {
      scope = scope.outer_scope();
    }
    return scope.AsDeclarationScope();
  }
  AsDeclarationScope() {
    return new DeclarationScope();
  }

  DeclareVariable(DeclareVariable, name, pos, mode, kind, init, was_added, sloppy_mode_block_scope_function_redefinition, ok) {
    
  }
}

class DeclarationScope extends Scope {
  constructor() {
    
  }
}


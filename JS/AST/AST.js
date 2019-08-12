class AstNode {

}

class Expression extends AstNode {

}

export class Declaration extends AstNode {
  
}

export class VariableProxy extends Expression {
  constructor(name, variable_kind, start_position) {
    super(start_position, variable_kind);
    this.raw_name_ = name;
    this.next_unresolved_ = null;
    this.bit_field_ |= 0;
  }
}


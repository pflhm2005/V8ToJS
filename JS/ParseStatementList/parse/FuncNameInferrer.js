const kEnclosingConstructorName = 0;
const kLiteralName = 1;
const kVariableName = 2;

class PointerWithPayload{
  constructor() {
  }
  GetPointer() {}
  GetPayload() {}
}

class Name {
  constructor(name, type) {
    this.name_and_type_ = new PointerWithPayload(name, type, 2);
  }
  name() { return this.name_and_type_.GetPointer(); }
  type() { return this.name_and_type_.GetPayload(); }
}

export class FuncNameInferrer {
  constructor(ast_value_factory) {
    this.ast_value_factory_ = ast_value_factory;
    this.scope_depth_ = 0;
    this.names_stack_ = []; //  vector<Name>
  }
  IsOpen() { return this.scope_depth_ > 0; }
  PushVariableName(name) {
    // dot_result_string是形如obj.key的声明 不属于新的变量声明
    if(this.IsOpen() && name !== this.ast_value_factory_.dot_result_string()) {
      this.names_stack_.push(new Name(name, kVariableName));
    }
  }
}

export class State {
  constructor(fni) {
    this.fni_  = fni;
    this.top_ = fni.name_stack_.length;
    ++this.fni_.scope_depth_;
  }
}
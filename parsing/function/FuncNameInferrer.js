import { IsUppercase } from "../../util";

const kEnclosingConstructorName = 0;
const kLiteralName = 1;
const kVariableName = 2;

// class PointerWithPayload{
//   constructor() {
//   }
//   GetPointer() {}
//   GetPayload() {}
// }

class Name {
  constructor(name, type) {
    this.name_ = name;
    this.type_ = type;
    // this.name_and_type_ = new PointerWithPayload(name, type, 2);
  }
  name() { return this.name_; }
  type() { return this.type_; }
}

/**
 * 函数名推断 将一个匿名函数赋值给变量或属性时会用到
 */
export class FuncNameInferrer {
  constructor(ast_value_factory) {
    this.ast_value_factory_ = ast_value_factory;
    this.scope_depth_ = 0;
    this.names_stack_ = []; //  vector<Name>
    this.funcs_to_infer_ = [];
  }
  // Returns whether we have entered name collection state.
  IsOpen() { return this.scope_depth_ > 0; }
  // TODO
  PushVariableName(name) {
    // dot_result_string是形如obj.key的声明 不属于新的变量声明
    if (this.IsOpen() && name !== this.ast_value_factory_.dot_result_string()) {
      this.names_stack_.push(new Name(name, kVariableName));
    }
  }
  PushLiteralName(name) {
    if (this.IsOpen() && name !== this.ast_value_factory_.prototype_string()) {
      this.names_stack_.push(new Name(name, kLiteralName));
    }
  }
  PushEnclosingName(name) {
    if (!name.IsEmpty() && IsUppercase(name.FirstCharacter())) {
      this.names_stack_.push(new Name(name, kEnclosingConstructorName));
    }
  }
  AddFunction(func_to_infer) {
    if (this.IsOpen()) {
      this.funcs_to_infer_.push(func_to_infer);
    }
  }
  RemoveLastFunction() {
    if (this.IsOpen() && !this.funcs_to_infer_.length) this.funcs_to_infer_.pop();
  }
  Infer() {
    if (!this.funcs_to_infer_.length) this.InferFunctionsNames();
  }
  InferFunctionsNames() {
    let func_name = this.MakeNameFromStack();
    for(let func of this.funcs_to_infer_) {
      func.set_raw_inferred_name(func_name);
    }
    this.funcs_to_infer_ = [];
  }
  MakeNameFromStack() {
    if (this.names_stack_.length === 0) return this.ast_value_factory_.empty_cons_string();
    let result = this.ast_value_factory_.NewConsString();
    for(let i = 0; i < this.names_stack_.length - 1; i++) {
      let it = this.names_stack_[i];
      let current = this.names_stack_[i+1];
      if (current.type() === kVariableName && it.type() === kVariableName) continue;
      if (!result.IsEmpty()) result.AddString(this.ast_value_factory_.dot_string());
      result.AddString(current.name());
    }
    return result;
  }
  RemoveAsyncKeywordFromEnd() {
    if(this.IsOpen()) {
      this.names_stack_.pop();
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
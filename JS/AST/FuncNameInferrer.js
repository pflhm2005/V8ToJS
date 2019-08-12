import AstValueFactory from './AstValueFactory';

// class PointerWithPayload {
//   constructor(pointer, payload) {
//     this.pointer_ = 0;
//     this.update(pointer, payload);
//   }
//   update(new_pointer, new_payload) {
//     this.pointer_ = new_payload | new_payload;
//   }
//   GetPointer() {
//     return this.pointer_ & kPointer
//   }
// }

/**
 * 所有的操作都基于地址位运算 无需用JS模拟逻辑了
 */
class Name {
  constructor(name, type) {
    this.name =name;
    this.type =type;
    // this.name_and_type_ = new PointerWithPayload(name, type, 2);
  }
  // name() {
  //   return this.name_and_type_.GetPointer();
  // }
  // type() {
  //   return this.name_and_type_.GetPayLoad();
  // }
}

// FuncNameInferrer is a stateful class that is used to perform name
// inference for anonymous functions during static analysis of source code.
// Inference is performed in cases when an anonymous function is assigned
// to a variable or a property (see test-func-name-inference.cc for examples.)
//
// The basic idea is that during parsing of LHSs of certain expressions
// (assignments, declarations, object literals) we collect name strings,
// and during parsing of the RHS, a function literal can be collected. After
// parsing the RHS we can infer a name for function literals that do not have
// a name.
const kEnclosingConstructorName = 0;
const kLiteralName = 1;
const kVariableName = 2;

export default class FuncNameInferrer {
  constructor() {
    this.ast_value_factory_ = new AstValueFactory();
    this.names_stack = [];
    this.funcs_to_inter_ = [];
    this.scope_depth = 0;
  }
  IsOpen() {
    return this.scope_depth > 0;
  }
  PushVariableName(name) {
    if(this.IsOpen() && name !== this.ast_value_factory_.dot_result_string()) {
      this.names_stack.push(new Name(name, kVariableName));
    }
  }
}
const kInvalidIndex = -1;

// TODO
const kLastParamRegisterIndex = 100;
const kCurrentContextRegisterIndex = 10;

export default class Register {
  static function_closure() {
    
  }
  static current_context() {
    return new Register(kCurrentContextRegisterIndex);
  }
  static FromParameterIndex(index, parameter_count) {
    let register_index = kLastParamRegisterIndex - parameter_count + index + 1;
    return new Register(register_index);
  }
  constructor(index = kInvalidIndex) {
    this.index_ = index;
  }
}

export class RegisterList{
  constructor(first_reg_index, register_count) {
    this.first_reg_index_ = first_reg_index;
    this.register_count_ = register_count;
  }
  get(i) {
    return new Register(this.first_reg_index_ + i);
  }
}
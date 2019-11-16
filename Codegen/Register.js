const kInvalidIndex = -1;

export default class Register {
  static function_closure() {
    
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
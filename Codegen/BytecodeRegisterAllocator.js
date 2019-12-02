import Register, { RegisterList } from "./Register";

export default class BytecodeRegisterAllocator{
  constructor(start_index) {
    this.next_register_index_ = start_index;
    this.max_register_count_ = start_index;
    this.observer_ = null;
  }
  NewRegister() {
    let reg = new Register(this.next_register_index_++);
    this.max_register_count_ = Math.max(this.next_register_index_, this.max_register_count_);
    if (this.observer_) {
      this.observer_.RegisterAllocateEvent(reg);
    }
    return reg;
  }
  NewRegisterList(count) {
    let reg_list = new RegisterList(this.next_register_index_, count);
    this.next_register_index_ += count;
    this.max_register_count_ = Math.max(this.next_register_index_, this.max_register_count_);
    if (this.observer_) {
      this.observer_.RegisterListAllocateEvent(reg_list);
    }
    return reg_list;
  }
  ReleaseRegisters(register_index) {
    let count = this.next_register_index_ - register_index;
    this.next_register_index_ = register_index;
    if (this.observer_) {
      this.observer_.RegisterListFreeEvent(new RegisterList(register_index, count));
    }
  }
}
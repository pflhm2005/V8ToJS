import { RegisterList } from "./Register";

export default class BytecodeRegisterAllocator{
  constructor(start_index) {
    this.next_register_index_ = start_index;
    this.max_register_count_ = start_index;
    this.observer_ = null;
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
}
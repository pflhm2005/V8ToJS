import {
  Bytecodes_IsJump,
  Bytecodes_IsSwitch,
} from "../util/Bytecode";
import { Bytecode_kDebugger, Bytecode_kSuspendGenerator, Bytecode_kResumeGenerator } from "../enum";
import Register from "./Register";
import RegisterInfo from "./RegistInfo";

const kNone = 0;
const kRead = 1 << 0;
const kWrite = 1 << 1;
const kReadWrite = kRead || kWrite;

class BytecodeOperands {
  static ReadsAccumulator(accumulator_use) {
    return (accumulator_use & kRead) === kRead;
  }
  static WritesAccumulator(accumulator_use) {
    return (accumulator_use & kWrite) === kWrite;
  }
}

export default class BytecodeRegisterOptimizer {
  constructor(register_allocator, fixed_registers_count, parameter_count, bytecode_writer) {
    this.accumulator_ = Register.virtual_accumulator();
    this.temporary_base_ = fixed_registers_count;
    this.max_register_index_ = fixed_registers_count - 1;
    this.register_info_table_ = [];
    this.registers_needing_flushed_ = [];
    this.equivalence_id_ = 0;
    this.bytecode_writer_ = bytecode_writer;
    this.flush_required_ = false;
    register_allocator.observer_ = this;

    this.register_info_table_offset_ = -Register.FromParameterIndex(0, parameter_count).index_;

    let l = this.register_info_table_offset_ + this.temporary_base_.index_;
    for (let i = 0; i < l; i++) {
      this.register_info_table_[i] = new RegisterInfo(
        this.RegisterFromRegisterInfoTableIndex(i), this.NextEquivalenceId(), true, true);
    }
    this.accumulator_info_ = this.GetRegisterInfo(this.accumulator_);
  }
  RegisterFromRegisterInfoTableIndex(index) {
    return new Register(index - this.register_info_table_offset_);
  }
  NextEquivalenceId() {
    this.equivalence_id_++;
    return this.equivalence_id_;
  }
  GetRegisterInfo(reg) {
    let index = this.GetRegisterInfoTableIndex(reg);
    return this.register_info_table_[index];
  }
  GetRegisterInfoTableIndex(reg) {
    return reg.index_ + this.register_info_table_offset_;
  }

  PrepareForBytecode(bytecode, accumulator_use) {
    if (Bytecodes_IsJump() || Bytecodes_IsSwitch() ||
      bytecode === Bytecode_kDebugger ||
      bytecode === Bytecode_kSuspendGenerator ||
      bytecode === Bytecode_kResumeGenerator) {
      this.Flush();
    }

    if (BytecodeOperands.ReadsAccumulator(accumulator_use)) {
      this.Materialize(this.accumulator_info_);
    }

    if (BytecodeOperands.WritesAccumulator(accumulator_use)) {
      this.PrepareOutputRegister(this.accumulator_);
    }
  }
  Flush() {

  }
  Materialize() {

  }
  PrepareOutputRegister(reg) {
    let reg_info = this.GetRegisterInfo(reg);
    if (reg_info.materialized_) {
      this.CreateMaterializedEquivalent(reg_info);
    }
    reg_info.MoveToNewEquivalenceSet(this.NextEquivalenceId(), true);
    this.max_register_index_ = Math.max(this.max_register_index_, reg_info.register_,index_);
  }
  CreateMaterializedEquivalent(info) {
    let unmaterialized = info.GetEquivalentToMaterialize();
    if (unmaterialized) {
      this.OutputRegisterTransfer(info, unmaterialized);
    }
  }
  OutputRegisterTransfer(input_info, output_info) {
    let input = input_info.register_;
    let output = output_info.register_;
    if (input === this.accumulator_) {
      this.bytecode_writer_.EmitStar(output);
    } else if (output === this.accumulator_) {
      this.bytecode_writer_.EmitLdar(input);
    } else {
      this.bytecode_writer_.EmitMov(input, output);
    }
    if (output !== this.accumulator_) {
      this.max_register_index_ = Math.max(this.max_register_index_, output.index_);
    }
    output_info.materialized_ = true;
  }
  
  RegisterAllocateEvent(reg) {
    
  }
  RegisterListAllocateEvent(reg_list) {

  }
}
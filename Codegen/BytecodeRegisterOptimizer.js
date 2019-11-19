import { 
  Bytecodes_IsJump, 
  Bytecodes_IsSwitch,
} from "../util/Bytecode";
import { Bytecode_kDebugger, Bytecode_kSuspendGenerator, Bytecode_kResumeGenerator } from "../enum";
import Register from "./Register";

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
  PrepareForBytecode() {
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
}
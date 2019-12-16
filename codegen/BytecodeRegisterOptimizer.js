import {
  Bytecodes_IsJump,
  Bytecodes_IsSwitch,
} from "../util/Bytecode";
import { 
  Bytecode_kDebugger, 
  Bytecode_kSuspendGenerator,
  Bytecode_kResumeGenerator, 
  AccumulatorUse_kRead,
  AccumulatorUse_kWrite,
} from "../enum";
import Register, { RegisterList } from "./Register";
import RegisterInfo from "./RegistInfo";

class BytecodeOperands {
  static ReadsAccumulator(accumulator_use) {
    return (accumulator_use & AccumulatorUse_kRead) === AccumulatorUse_kRead;
  }
  static WritesAccumulator(accumulator_use) {
    return (accumulator_use & AccumulatorUse_kWrite) === AccumulatorUse_kWrite;
  }
}

export default class BytecodeRegisterOptimizer {
  constructor(register_allocator, fixed_registers_count, parameter_count, builder) {
    this.accumulator_ = Register.virtual_accumulator();
    this.temporary_base_ = new Register(fixed_registers_count);
    this.max_register_index_ = fixed_registers_count - 1;
    this.register_info_table_ = [];
    this.registers_needing_flushed_ = [];
    this.equivalence_id_ = 0;
    this.builder_ = builder;
    this.flush_required_ = false;
    register_allocator.observer_ = this;

    this.register_info_table_offset_ = -Register.FromParameterIndex(0, parameter_count).index_;

    let l = this.register_info_table_offset_ + this.temporary_base_.index_;
    for (let i = 0; i < l; i++) {
      this.register_info_table_.push(new RegisterInfo(
        this.RegisterFromRegisterInfoTableIndex(i), this.NextEquivalenceId(), true, true));
    }
    this.accumulator_info_ = this.GetRegisterInfo(this.accumulator_);
  }
  /**
   * 基本上是工具方法
   */
  DoLdar(input) {
    let input_info = this.GetRegisterInfo(input);
    this.RegisterTransfer(input_info, this.accumulator_info_);
  }
  DoStar(output) {
    let output_info = this.GetRegisterInfo(output);
    this.RegisterTransfer(this.accumulator_info_, output_info);
  }
  RegisterTransfer(input_info, output_info) {
    let output_is_observable = this.RegisterIsObservable(output_info.register_);
    let in_same_equivalence_set = output_info.IsInSameEquivalenceSet(input_info);
    if (in_same_equivalence_set && (!output_is_observable || output_info.materialized_)) {
      return;
    }

    if (output_info.materialized_) {
      this.CreateMaterializedEquivalent(output_info);
    }

    if (!in_same_equivalence_set) {
      this.AddToEquivalenceSet(input_info, output_info);
    }

    if (output_is_observable) {
      output_info.materialized_ = false;
      let materialized_info = input_info.GetMaterializedEquivalent();
      this.OutputRegisterTransfer(materialized_info, output_info);
    }

    let input_is_observable = this.RegisterIsObservable(input_info.register_);
    if (input_is_observable) {
      input_info.MarkTemporariesAsUnmaterialized(this.temporary_base_);
    }
  }
  AddToEquivalenceSet(set_member, non_set_member) {
    this.PushToRegistersNeedingFlush(non_set_member);
    non_set_member.AddToEquivalenceSetOf(set_member);
    this.flush_required_ = true;
  }
  PushToRegistersNeedingFlush(reg) {
    if (!reg.needs_flush_) {
      reg.needs_flush_ = true;
      this.registers_needing_flushed_.push(reg);
    }
  }
  /**
   * Register类的比较都做了重载
   */
  RegisterIsTemporary(reg) {
    return reg.index_ >= this.temporary_base_.index_
  }
  RegisterIsObservable(reg) {
    return reg.index_ !== this.accumulator_.index_ && !this.RegisterIsTemporary(reg);
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
  GetMaterializedEquivalentNotAccumulator(info) {
    if (info.materialized_) {
      return info;
    }
    let result = info.GetMaterializedEquivalentOtherThan(this.accumulator_);
    if (result === null) {
      this.Materialize(info);
      result = info;
    }
    return result;
  }
  Materialize(info) {
    if (!info.materialized_) {
      let materialized = info.GetMaterializedEquivalent();
      this.OutputRegisterTransfer(materialized, info);
    }
  }

  /**
   * 以下方法辅助机器码生成
   */
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
    if (!this.flush_required_) return;
    for (let reg_info of this.registers_needing_flushed_) {
      if (!reg_info.needs_flush_) continue;
      reg_info.needs_flush_ = false;

      let materialized = reg_info.materialized_ ? reg_info : reg_info.GetMaterializedEquivalent();
      if (materialized !== null) {
        let equivalent = null;
        while ((equivalent = materialized.GetEquivalent()) !== materialized) {
          if (equivalent.allocated_ && !equivalent.materialized_) {
            this.OutputRegisterTransfer(materialized, equivalent);
          }
          equivalent.MoveToNewEquivalenceSet(this.NextEquivalenceId(), true);
          equivalent.needs_flush_ = false;
        }
      } else {
        reg_info.MoveToNewEquivalenceSet(this.NextEquivalenceId(), false);
      }
    }
    this.registers_needing_flushed_.length = 0;
    this.flush_required_ = false;
  }
  Materialize(info) {
    if (!info.materialized_) {
      let materialized = info.GetMaterializedEquivalent();
      this.OutputRegisterTransfer(materialized, info);
    }
  }
  PrepareOutputRegister(reg) {
    let reg_info = this.GetRegisterInfo(reg);
    if (reg_info.materialized_) {
      this.CreateMaterializedEquivalent(reg_info);
    }
    reg_info.MoveToNewEquivalenceSet(this.NextEquivalenceId(), true);
    this.max_register_index_ = Math.max(this.max_register_index_, reg_info.register_.index_);
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
    if (input.index_ === this.accumulator_.index_) {
      this.builder_.OutputStarRaw(output);
    } else if (output.index_ === this.accumulator_.index_) {
      this.builder_.OutputLdarRaw(input);
    } else {
      this.builder_.OutputMovRaw(input, output);
    }
    if (output !== this.accumulator_) {
      this.max_register_index_ = Math.max(this.max_register_index_, output.index_);
    }
    output_info.materialized_ = true;
  }

  /**
   * 以下方法辅助OperandHelper
   * @returns {Register}
   */
  GetInputRegister(reg) {
    let reg_info = this.GetRegisterInfo(reg);
    if (reg_info.materialized_) {
      return reg;
    } else {
      let equivalent_info = this.GetMaterializedEquivalentNotAccumulator(reg_info);
      return equivalent_info.register_;
    }
  }
  GetInputRegisterList(reg_list) {
    if (reg_list.register_count_ === 1) {
      let reg = this.GetInputRegister(reg_list.first_register());
      return new RegisterList(reg);
    } else {
      let start_index = reg_list.first_register().index_;
      for (let i = 0; i < reg_list,register_count_; ++i) {
        let current = new Register(start_index + i);
        let input_info = this.GetRegisterInfo(current);
        this.Materialize(input_info);
      }
      return reg_list;
    }
  }
  PrepareOutputRegister(reg) {
    let reg_info = this.GetRegisterInfo(reg);
    if (reg_info.materialized_) {
      this.CreateMaterializedEquivalent(reg_info);
    }
    reg_info.MoveToNewEquivalenceSet(this.NextEquivalenceId(), true);
    this.max_register_index_ = Math.max(this.max_register_index_, reg_info.register_.index_);
  }
  PrepareOutputRegisterList(reg_list) {
    let start_index = reg_list.first_register().index_;
    for (let i = 0; i < reg_list.register_count_; ++i) {
      let current = new Register(start_index + i);
      this.PrepareOutputRegister(current);
    }
  }

  /**
   * 生成寄存器或寄存器组时会触发下列事件
   */
  RegisterAllocateEvent(reg) {
    this.AllocateRegister(this.GetOrCreateRegisterInfo(reg));
  }
  GetOrCreateRegisterInfo(reg) {
    let index = this.GetRegisterInfoTableIndex(reg);
    return index < this.register_info_table_.length ? this.register_info_table_[index] : this.NewRegisterInfo(reg);
  }
  NewRegisterInfo(reg) {
    let index = this.GetRegisterInfoTableIndex(reg);
    this.GrowRegisterMap(reg);
    return this.register_info_table_[index];
  }
  RegisterListAllocateEvent(reg_list) {
    if (reg_list.register_count_ !== 0) {
      let first_index = reg_list.first_register().index_;
      this.GrowRegisterMap(new Register(first_index + reg_list.register_count_ - 1));
      for (let i = 0; i < reg_list.register_count_; i++) {
        this.AllocateRegister(this.GetRegisterInfo(new Register(first_index + i)));
      }
    }
  }
  GrowRegisterMap(reg) {
    let index = this.GetRegisterInfoTableIndex(reg);
    if (index >= this.register_info_table_.length) {
      let new_size = index + 1;
      let old_size = this.register_info_table_.length;
      for (let i = old_size; i < new_size; ++i) {
        this.register_info_table_.push(new RegisterInfo(
          this.RegisterFromRegisterInfoTableIndex(i), this.NextEquivalenceId(), true, false));
      }
    }
  }
  AllocateRegister(info) {
    info.allocated_ = true;
    if (!info.materialized_) {
      info.MoveToNewEquivalenceSet(this.NextEquivalenceId(), true);
    }
  }
  RegisterListFreeEvent(reg_list) {
    let first_index = reg_list.first_register().index_;
    for (let i = 0; i < reg_list.register_count_; i++) {
      this.GetRegisterInfo(new Register(first_index + i)).allocated_ = false;
    }
  }
}
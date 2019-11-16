import BytecodeArrayWriter from "./BytecodeArrayWriter";
import { kNoSourcePosition } from "../enum";
import { FLAG_ignition_reo } from "../Compile/Flag";
import BytecodeRegisterAllocator from "./BytecodeRegisterAllocator";
import BytecodeRegisterOptimizer from "./BytecodeRegisterOptimizer";

export default class BytecodeArrayBuilder {
  constructor(parameter_count, locals_count, feedback_vector_spec, source_position_mode) {
    this.feedback_vector_spec_ = feedback_vector_spec;
    this.bytecode_generated_= false;
    this.constant_array_builder_ = new ConstantArrayBuilder();
    this.handler_table_builder_ = new HandlerTableBuilder();
    this.parameter_count_ = parameter_count;
    this.local_register_count_ = locals_count;
    this.register_allocator_ = new BytecodeRegisterAllocator(this.local_register_count_);
    this.bytecode_array_writer_ = new BytecodeArrayWriter();
    this.register_optimizer_ = null;

    this.latest_source_info_ = new BytecodeSourceInfo();
    this.next_register_index_ = this.local_register_count_;

    if (FLAG_ignition_reo) {
      this.register_optimizer_ = new BytecodeRegisterOptimizer(
        this.register_allocator_, this.local_register_count_, parameter_count,
        new RegisterTransferWriter(this));
    }
  }
  SetStatementPosition(stmt) {
    if (stmt.position_ === kNoSourcePosition) return;
    this.latest_source_info_.MakeStatementPosition(stmt.position_);
  }
  StackCheck() {
    
  }
  Receiver() {

  }
  LoadUndefined() {
    
  }
  LoadAccumulatorWithRegister() {
    
  }
  RemainderOfBlockIsDead() {
    return this.bytecode_array_writer_.exit_seen_in_block_;
  }
  AllocateDeferredConstantPoolEntry() {
    return this.constant_array_builder_.InsertDeferred();
  }
}

const kUninitializedPosition = -1;
const kNone = 0;
const kExpression = 0;
const kStatement = 0;

class BytecodeSourceInfo {
  constructor() {
    this.position_type_ = kNone;
    this.source_position_ = kUninitializedPosition;
  }
  MakeStatementPosition(source_position) {
    this.position_type_ = kStatement;
    this.source_position_ = source_position;
  }
}

class ConstantArrayBuilder {
  // TODO
  InsertDeferred() {
    return -1;
  }
}

class HandlerTableBuilder {}

class RegisterTransferWriter {}
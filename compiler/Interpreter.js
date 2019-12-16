import BytecodeGenerator, { FeedbackVectorSpec } from "../codegen/BytecodeGenerator";
import { RecordingMode_RECORD_SOURCE_POSITIONS, RecordingMode_OMIT_LAZY_SOURCE_POSITIONS, CompilationJob_FAILED, CompilationJob_SUCCEEDED } from "../enum";

const kReadyToPrepare = 0;
const kReadyToExecute = 0;
const kReadyToFinalize = 0;
const kSucceeded = 0;
const kFailed = 0;

const kIsEval = 1 << 0;
const kCollectTypeProfile = 1 << 1;
const kMightAlwaysOpt = 1 << 2;
const kCollectSourcePositions = 1 << 3;

export default class Interpreter {
  /**
   * 
   * @param {ParseInfo*} parse_info 解析描述类
   * @param {FunctionLiteral*} literal 抽象语法树
   * @param {AccountingAllocator*} allocator 内存管理应用
   * @param {std::vector<FunctionLiteral*>*} eager_inner_literals 剩余待解析内容
   */
  static NewCompilationJob(parse_info, literal, allocator, eager_inner_literals) {
    return new InterpreterCompilationJob(parse_info, literal, allocator, eager_inner_literals);
  }
}

class CompilationJob {
  constructor(initial_state) {
    this.state_ = initial_state;
  }
  UpdateState(status, next_state) {
    if (status === CompilationJob_SUCCEEDED) {
      this.state_ = next_state;
    }
    else {
      this.state_ = kFailed;
    }
    return status;
  }
}

class UnoptimizedCompilationJob extends CompilationJob {
  // 原本还有第三个参数compilation_info 但是没法实现
  constructor(stack_limit_, parse_info) {
    super(kReadyToExecute);
    this.stack_limit_ = stack_limit_;
    this.parse_info_ = parse_info;
    this.state_ = null;
  }
  ExecuteJob() {
    return this.UpdateState(this.ExecuteJobImpl(), kReadyToFinalize);
  }
  FinalizeJob(shared_info, isolate) {
    return this.UpdateState(this.FinalizeJobImpl(shared_info, isolate), kSucceeded);
  }
}

class InterpreterCompilationJob extends UnoptimizedCompilationJob {
  constructor(parse_info, literal, allocator, eager_inner_literals) {
    super(parse_info.stack_limit_, parse_info);
    this.zone_ = null;
    this.compilation_info_ = new UnoptimizedCompilationInfo(this.zone_, parse_info, literal);
    this.generator_ = new BytecodeGenerator(this.compilation_info_, parse_info.ast_string_constants_, eager_inner_literals);
  }
  ExecuteJobImpl() {
    // 可以激活FLAG_print_ast标记来打印抽象语法树
    // MaybePrintAst(parse_info(), compilation_info());
    this.generator_.GenerateBytecode(this.stack_limit_);
    if (this.generator_.stack_overflow_) return CompilationJob_FAILED;
    console.info('待编译JS代码为:\n', this.parse_info_.character_stream_.source_string);
    console.info('输出的bytecode为:\n', this.generator_.builder_.bytecode_array_writer_.bytecodes_);
    return CompilationJob_SUCCEEDED;
  }
  FinalizeJobImpl(shared_info, isolate) {
    let bytecodes = this.compilation_info_.bytecode_array_;
    if (bytecodes === null) {
      bytecodes = this.generator_.FinalizeBytecode(isolate, this.parse_info_.script_);
      if (this.generator_.HasStackOverflow()) return CompilationJob_FAILED;
      this.compilation_info_.bytecode_array_ = bytecodes;
    }

    if (this.compilation_info_.SourcePositionRecordingMode() === RecordingMode_RECORD_SOURCE_POSITIONS) {
      let source_position_table = this.generator_.FinalizeSourcePositionTable(isolate);
      bytecodes.set_source_position_table(source_position_table);
    }

    // if (ShouldPrintBytecode(shared_info)) {}
    return CompilationJob_SUCCEEDED;
  }
}

class UnoptimizedCompilationInfo {
  constructor(zone, parse_info, literal) {
    this.flags_ = 0;
    this.zone_ = zone;
    // this.feedback_vector_spec_ = new FeedbackVectorSpec(zone);
    this.feedback_vector_spec_ = new FeedbackVectorSpec();
    this.literal_ = literal;
    this.source_range_map_ = parse_info.source_range_map_;
    if (parse_info.is_eval()) this.SetFlag(kIsEval);
    if (parse_info.collect_type_profile()) this.SetFlag(kCollectTypeProfile);
    if (parse_info.might_always_opt()) this.SetFlag(kMightAlwaysOpt);
    if (parse_info.collect_source_positions()) this.SetFlag(kCollectSourcePositions);

    this.bytecode_array_ = null;
  }
  GetFlag(f) { return (this.flags_ & f) !== 0; }
  SetFlag(f, v = false) {
    if (v) this.flags_ |= f;
    else this.flags_ &= ~f;
  }
  collect_source_positions() { return this.GetFlag(kCollectSourcePositions); }
  has_source_range_map() { return this.source_range_map_ !== null; }
  is_eval() { return this.GetFlag(kIsEval); }
  scope() { return this.literal_.scope_; }
  num_parameters_including_this() { return this.scope().num_parameters_ + 1; }
  SourcePositionRecordingMode() {
    if (this.collect_source_positions()) return RecordingMode_RECORD_SOURCE_POSITIONS;
    return this.literal_.AllowsLazyCompilation() ? RecordingMode_RECORD_SOURCE_POSITIONS : RecordingMode_OMIT_LAZY_SOURCE_POSITIONS;
  }
  collect_type_profile() {
    return this.GetFlag(kCollectTypeProfile);
  }
}
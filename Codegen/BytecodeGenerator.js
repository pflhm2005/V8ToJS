import { 
  kElided, 
  kRestParameter, 
  kTraceEnter,
  kBody, 
  LOCAL, 
  _kBlock, 
  _kVariableDeclaration, 
  _kExpressionStatement,
  _kAssignment, 
  UNALLOCATED,
  NOT_INSIDE_TYPEOF,
  INSIDE_TYPEOF,
} from "../enum";
import Register from "./Register";
import { IsResumableFunction, IsBaseConstructor, DeclareGlobalsEvalFlag } from "../util";
import { FLAG_trace } from "../Compiler/Flag";
import BytecodeArrayBuilder from "./BytecodeArrayBuilder";
import GlobalDeclarationsBuilder from "./GlobalDeclarationsBuilder";
import FeedbackSlot from "../util/FeedbackSlot";

// This kind means that the slot points to the middle of other slot
// which occupies more than one feedback vector element.
// There must be no such slots in the system.
const kInvalid = 0;

// Sloppy kinds come first; for easy language mode testing.
const kStoreGlobalSloppy = 1;
const kStoreNamedSloppy = 2;
const kStoreKeyedSloppy = 3;
const kLastSloppyKind = kStoreKeyedSloppy;

// Strict and language mode unaware kinds.
const  kCall = 4;
const  kLoadProperty = 5;
const kLoadGlobalNotInsideTypeof = 6;
const kLoadGlobalInsideTypeof = 7;
const kLoadKeyed = 8;
const kHasKeyed = 9;
const kStoreGlobalStrict = 10;
const kStoreNamedStrict = 11;
const kStoreOwnNamed = 12;
const kStoreKeyedStrict = 13;
const kStoreInArrayLiteral = 14;
const kBinaryOp = 15;
const kCompareOp = 16;
const kStoreDataPropertyInLiteral = 17;
const kTypeProfile = 18;
const kLiteral = 19;
const kForIn = 20;
const kInstanceOf = 21;
const kCloneObject = 23;

const kKindsNumber = 24  // Last value indicating number of kinds.

const UNCAUGHT = 0;     // The handler will (likely) rethrow the exception.
const CAUGHT = 1;       // The exception will be caught by the handler.
const PROMISE = 2;      // The exception will be caught and cause a promise rejection.
const DESUGARING = 3;   // The exception will be caught, but both the exception and
                        // the catching are part of a desugaring and should therefore
                        // not be visible to the user (we won't notify the debugger of
                        // such exceptions).
const ASYNC_AWAIT = 4;  // The exception will be caught and cause a promise rejection
                        // in the desugaring of an async function, so special
                        // async/await handling in the debugger can take place.

export default class BytecodeGenerator {
  constructor(info, ast_string_constants, eager_inner_literals) {
    this.zone_ = null;
    this.builder_ = new BytecodeArrayBuilder(
      info.num_parameters_including_this(), info.scope().num_stack_slots_, 
      info.feedback_vector_spec_, info.SourcePositionRecordingMode());
    this.info_ = info;
    this.ast_string_constants_ = ast_string_constants;
    this.closure_scope_ = info.scope();
    this.current_scope_ = info.scope();
    this.eager_inner_literals_ = eager_inner_literals;
    
    this.feedback_slot_cache_ = new FeedbackSlotCache();
    this.globals_builder_ = new GlobalDeclarationsBuilder();
    this.block_coverage_builder_ = null;
    this.global_declarations_ = [];
    this.function_literals_ = [];
    this.native_function_literals_ = [];
    this.object_literals_ = [];
    this.array_literals_ = [];
    this.class_literals_ = [];
    this.template_objects_ = [];

    this.execution_control_ = null;
    this.execution_context_ = null;
    this.execution_result_ = null;

    this.incoming_new_target_or_generator_ = new Register();
    this.optional_chaining_null_labels_ = null;
    this.dummy_feedback_slot_ = new SharedFeedbackSlot(this.info_.feedback_vector_spec_, kCompareOp);
    this.generator_jump_table_ = null;
    this.suspend_count_ = 0;
    this.loop_depth_ = 0;
    this.catch_prediction_ = UNCAUGHT;
    this.stack_limit_ = 0;
    this.stack_overflow_ = false;
    if (info.has_source_range_map()) this.block_coverage_builder_ = new BlockCoverageBuilder(null, new BytecodeArrayBuilder(), info.source_range_map_);
  }
  GenerateBytecode(stack_limit) {
    this.InitializeAstVisitor(stack_limit);

    let incoming_context = new ContextScope(this, this.closure_scope_);
    let control = new ControlScopeForTopLevel(this);
    // RegisterAllocationScope register_scope(this);
    // let outer_next_register_index_ = this.register_allocator().next_register_index_;

    this.AllocateTopLevelRegisters();
    // 状态函数
    if (this.info_.literal_.CanSuspend()) {
      this.BuildGeneratorPrologue();
    }

    if (this.closure_scope_.NeedsContext()) {
      this.BuildNewLocalActivationContext();
      let local_function_context = new ContextScope(this, this.closure_scope_);
      this.BuildLocalActivationContextInitialization();
      this.GenerateBytecodeBody();
    } else {
      this.GenerateBytecodeBody();
    }
    this.register_allocator().ReleaseRegisters(outer_next_register_index_);
  }
  GenerateBytecodeBody() {
    // 构建argument对象
    this.VisitArgumentsObject(this.closure_scope_.arguments_);
    // 构建rest参数
    this.VisitRestArgumentsArray(this.closure_scope_.rest_parameter());

    // 构建函数名与this变量
    this.VisitThisFunctionVariable(this.closure_scope_.function_);
    this.VisitThisFunctionVariable(this.closure_scope_.this_function_var());

    // 构建new.target变量
    this.VisitNewTargetVariable(this.closure_scope_.new_target_);

    // 构建状态函数变量
    let literal = this.info_.literal_;
    if (IsResumableFunction(literal.kind())) {
      this.BuildGeneratorObjectVariableInitialization();
    }

    if (FLAG_trace) {
      this.builder_.CallRuntime(kTraceEnter);
    }

    // TODO
    if (this.info_.collect_type_profile()) {}
    
    // 记录函数作用域数量
    this.BuildIncrementBlockCoverageCounterIfEnabled(literal, kBody);

    // 构建函数内部变量声明
    this.VisitDeclarations(this.closure_scope_.decls_);

    // 构建import语法
    this.VisitModuleNamespaceImports();

    // 
    this.builder_.StackCheck(literal.start_position());

    // 构建基类构造函数
    if (IsBaseConstructor(this.function_kind())) {
      if (literal.requires_brand_initialization()) {
        this.BuildPrivateBrandInitialization(this.builder_.Receiver());
      }
      if (literal.requires_instance_members_initializer()) {
        this.BuildInstanceMemberInitialization(Register.function_closure(), this.builder_.Receiver());
      }
    }

    // 构建函数体
    this.VisitStatements(literal.body_);

    if (!this.builder_.RemainderOfBlockIsDead()) {
      this.builder_.LoadUndefined();
      this.BuildReturn();
    }
  }
  BuildPrivateBrandInitialization() {}
  BuildInstanceMemberInitialization() {}

  /**
   * 处理语法树解析
   */
  Visit(node) {
    // if (CheckStackOverflow()) return;
    this.VisitNoStackOverflowCheck(node);
  }
  VisitNoStackOverflowCheck(node) {
    let node_type = node.node_type();
    switch(node_type) {
      case _kVariableDeclaration:
        return this.VisitVariableDeclaration(node);
      case _kExpressionStatement:
        return this.VisitExpressionStatement(node);
      case _kBlock:
        return this.VisitBlock(node);
      case _kAssignment:
        return this.VisitAssignment(node);
    }
  }

  VisitArgumentsObject(variable) {
    if (variable === null) return;
    this.builder_.CreateArguments(this.closure_scope_.GetArgumentsType());
    this.BuildVariableAssignment(variable, 'Token::ASSIGN', kElided);
  }
  VisitRestArgumentsArray(rest) {
    if (rest == null) return;
    this.builder_.CreateArguments(kRestParameter);
    this.BuildVariableAssignment(rest, 'Token::ASSIGN', kElided);
  }
  VisitThisFunctionVariable(variable) {
    if (variable == null) return;
    this.builder_.LoadAccumulatorWithRegister();
    this.BuildVariableAssignment(variable, 'Token::INIT', kElided);
  }
  VisitNewTargetVariable(variable) {
    if (variable == null) return;
    if (IsResumableFunction(this.info_.literal_.kind())) return;
    if (variable.location() === LOCAL) return;
    
    this.builder_.LoadAccumulatorWithRegister(this.incoming_new_target_or_generator_);
    this.BuildVariableAssignment(variable, 'Token::INIT', kElided);
  }
  BuildGeneratorObjectVariableInitialization() {

  }
  BuildIncrementBlockCoverageCounterIfEnabled(node, kind) {
    if (this.block_coverage_builder_ === null) return;
    this.block_coverage_builder_.IncrementBlockCounter(node, kind);
  }
  VisitDeclarations(declarations) {
    // RegisterAllocationScope register_scope(this);
    for (let decl of declarations) {
      // RegisterAllocationScope register_scope(this);
      this.Visit(decl);
    }
    if (this.globals_builder_.empty()) return;
    this.globals_builder_.set_constant_pool_entry(this.builder_.AllocateDeferredConstantPoolEntry());
    let encoded_flags = DeclareGlobalsEvalFlag.encode(this.info_.is_eval());

    let args = this.register_allocator().NewRegisterList(3);
    this.builder_
    .LoadConstantPoolEntry(this.globals_builder_.constant_pool_entry_)
    .StoreAccumulatorInRegister(args.get(0))
    .LoadLiteral(Smi.FromInt(encoded_flags))
    .StoreAccumulatorInRegister(args.get(1))
    .MoveRegister(Register.function_closure(), args.get(2))
    .CallRuntime(kDeclareGlobals, args);

    //
    this.global_declarations_.push(this.globals_builder_);
    this.globals_builder_ = new GlobalDeclarationsBuilder();
  }
  register_allocator() {
    return this.builder_.register_allocator_;
  }
  
  VisitModuleNamespaceImports() {
    if (!this.closure_scope_.is_module_scope()) return;
  }

  VisitStatements(statements) {
    for (let i = 0; i < statements.length; i++) {
      let stmt = statements[i];
      this.Visit(stmt);
      if (this.builder_.RemainderOfBlockIsDead()) break;
    }
  }
  BuildReturn() {

  }

  VisitVariableDeclaration(decl) {
    let variable = decl.var_;
    if (!variable.is_used()) return;
    switch (variable.location()) {
      case UNALLOCATED: {
        let slot = this.GetCachedLoadGlobalICSlot(NOT_INSIDE_TYPEOF, variable);
        this.globals_builder_.AddUndefinedDeclaration(variable.name_, slot);
        break;
      }
    }
  }
  GetCachedLoadGlobalICSlot(typeof_mode, variable) {
    let slot_kind = typeof_mode === INSIDE_TYPEOF ? kLoadGlobalInsideTypeof : kLoadGlobalNotInsideTypeof;
    let slot = new FeedbackSlot(this.feedback_slot_cache_.Get(slot_kind, variable));
    if (!slot.IsInvalid()) {
      return slot;
    }
    slot = this.feedback_spec().AddLoadGlobalICSlot(typeof_mode);
    this.feedback_slot_cache_.Put(slot_kind, variable, this.feedback_index(slot));
    return slot;
  }
  feedback_index(slot) {
    return slot.id_;
  }

  VisitExpressionStatement(stmt) {
    this.builder_.SetStatementPosition(stmt);
    this.VisitForEffect(stmt.expression_);
  }
  VisitForEffect(expr) {
    // EffectResultScope effect_scope(this);
    this.Visit(expr);
  }

  VisitBlock(stmt) {
    // CurrentScope current_scope(this, stmt->scope());
    if (stmt.scope_ !== null && stmt.scope_.NeedsContext()) {
      this.BuildNewLocalBlockContext(stmt.scope_);
      // let scope = new ContextScope(this. stmt.scope_);
      this.VisitBlockDeclarationsAndStatements(stmt);
    } else {
      this.VisitBlockDeclarationsAndStatements(stmt);
    }
  }
  VisitBlockDeclarationsAndStatements(stmt) {
    // let block_builder = new BlockBuilder(this.builder_, this.block_coverage_builder_, stmt);
    // let execution_control = new ControlScopeForBreakable(this, stmt, block_builder);
    if (stmt.scope_ !== null) {
      this.VisitDeclarations(stmt.scope_.decls_);
    } else {
      this.VisitStatements(stmt.statement_);
    }
  }

  VisitAssignment(expr) {
    let lhs_data = this.PrepareAssignmentLhs(expr.target_);
    this.VisitForAccumulatorValue(expr.value_);
    this.builder_.SetExpressionPosition(expr);
    this.BuildAssignment(lhs_data, expr.op(), expr.lookup_hoisting_mode());
  }

  function_kind() {
    return this.info_.literal_.kind();
  }
  feedback_spec() {
    return this.info_.feedback_vector_spec_;
  }
  InitializeAstVisitor(stack_limit) {
    this.stack_limit = stack_limit;
    this.stack_overflow_ = false;
  }
  AllocateTopLevelRegisters() {}
  BuildGeneratorPrologue() {

  }
  BuildLocalActivationContextInitialization() {

  }
  
  BuildVariableAssignment(variable, op, hole_check_mode) {
    let mode = variable.mode();
    let assignment_register_scope = new RegisterAllocationScope(this);
    // BytecodeLabel end_label;
    switch(variable.location()) {
      
    }
  }
}
class FeedbackSlotCache {
  constructor() {
    this.map_ = [];
  }
  Put(slot_kind, node, slot_index, index = 0) {
    let key = {
      slot_kind,
      node,
      index,
    };
    let entry = {
      slot_index,
      key,
    }
    this.map_.push(entry);
  }
  Get(slot_kind, node, index = 0) {
    let iter = this.map_.find(v => {
      v.node === node &&
      v.index === index &&
      v.slot_kind === slot_kind
    });
    if (iter !== undefined) {
      return iter.slot_index;
    }
    return -1;
  }
}

export class FeedbackVectorSpec {
  constructor() {
    this.slot_kinds_ = [];
    this.num_closure_feedback_cells_ = 0;
  }
  AddLoadGlobalICSlot(typeof_mode) {
    return this.AddSlot(typeof_mode === INSIDE_TYPEOF
      ? kLoadGlobalInsideTypeof : kLoadGlobalNotInsideTypeof);
  }
  AddSlot(kind) {
    let slot = this.slots();
    let entries_per_slot = FeedbackMetadata.GetSlotSize(kind);
    this.append(kind);
    for(let i = 1; i < entries_per_slot; i++) {
      this.append(kInvalid);
    }
    return new FeedbackSlot(slot);
  }
  append(kind) {
    this.slot_kinds_.push(kind);
  }
  slots() {
    return this.slot_kinds_.length;
  }
}

class FeedbackMetadata {
  static GetSlotSize(kind) {
    switch(kind) {
      case kForIn:
      case kInstanceOf:
      case kCompareOp:
      case kBinaryOp:
      case kLiteral:
      case kTypeProfile:
        return 1;
      
      case kCall:
      case kCloneObject:
      case kLoadProperty:
      case kLoadGlobalInsideTypeof:
      case kLoadGlobalNotInsideTypeof:
      case kLoadKeyed:
      case kHasKeyed:
      case kStoreNamedSloppy:
      case kStoreNamedStrict:
      case kStoreOwnNamed:
      case kStoreGlobalSloppy:
      case kStoreGlobalStrict:
      case kStoreKeyedSloppy:
      case kStoreKeyedStrict:
      case kStoreInArrayLiteral:
      case kStoreDataPropertyInLiteral:
        return 2;

      case kInvalid:
      case kKindsNumber:
        throw new Error('UNREACHABLE');
    }
    return 1;
  }
}

class SharedFeedbackSlot {}
class BlockCoverageBuilder {}

class ContextScope {}
class ControlScopeForTopLevel {}
import {
  HoleCheckMode_kElided,
  kRestParameter,
  kTraceEnter,
  kBody,
  VariableLocation_LOCAL,
  _kBlock,
  _kVariableDeclaration,
  _kExpressionStatement,
  _kAssignment,
  VariableLocation_UNALLOCATED,
  NOT_INSIDE_TYPEOF,
  INSIDE_TYPEOF,
  kNewScriptContext,
  kPushModuleContext,
  MIN_CONTEXT_SLOTS,
  EVAL_SCOPE,
  FUNCTION_SCOPE,
  VariableLocation_CONTEXT,
  AccumulatorPreservingMode_kNone,
  AssignType_NON_PROPERTY,
  _kLiteral,
  Literal_kSmi,
  Literal_kHeapNumber,
  Literal_kUndefined,
  Literal_kBoolean,
  Literal_kNull,
  Literal_kTheHole,
  Literal_kString,
  Literal_kSymbol,
  Literal_kBigInt,
  VariableLocation_PARAMETER,
  HoleCheckMode_kRequired,
  VariableMode_kConst,
  TokenEnumList,
  ContextSlotMutability_kMutableSlot,
} from "../enum";
import Register from "./Register";
import { IsResumableFunction, IsBaseConstructor, DeclareGlobalsEvalFlag } from "../util";
import { FLAG_trace } from "../Compiler/Flag";
import BytecodeArrayBuilder from "./BytecodeArrayBuilder";
import GlobalDeclarationsBuilder from "./GlobalDeclarationsBuilder";
import FeedbackSlot from "../util/FeedbackSlot";
import ValueResultScope from "./ValueResultScope";
import ContextScope from "./ContextScope";
import { Property } from "../ast/Ast";
import { AssignmentLhsData } from "./AssignmentLhsData";

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
const kCall = 4;
const kLoadProperty = 5;
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
// Last value indicating number of kinds.
const kKindsNumber = 24
// The handler will (likely) rethrow the exception.
const UNCAUGHT = 0;
// The exception will be caught by the handler.
const CAUGHT = 1;
// The exception will be caught and cause a promise rejection.
const PROMISE = 2;
/**
 * The exception will be caught, but both the exception and
 * the catching are part of a desugaring and should therefore
 * not be visible to the user (we won't notify the debugger of
 * such exceptions).
 */
const DESUGARING = 3;
/**
 * The exception will be caught and cause a promise rejection
 * in the desugaring of an async function, so special
 * async/await handling in the debugger can take place.
 */
const ASYNC_AWAIT = 4;

const kPageSizeBits = 18;
const kMaxRegularHeapObjectSize = (1 << (kPageSizeBits - 1));
// TODO
const kTodoHeaderSize = 0;
const kSystemPointerSizeLog2 = 2;
const kTaggedSize = 1 << kSystemPointerSizeLog2;
const kMaximumSlots = (kMaxRegularHeapObjectSize - kTodoHeaderSize) / kTaggedSize - 1;

/**
 * 字节码生成器
 * 核心概念如下
 * 1. Register 寄存器 => 用来存储计算结果
 * 2. Accumulator 累加器 => 寄存器的一种 => 用来储存计算产生的中间结果 
 * 3. Imm 立即值
 */
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
    if (info.has_source_range_map()) {
      this.block_coverage_builder_ = new BlockCoverageBuilder(null, new BytecodeArrayBuilder(), info.source_range_map_);
    }
  }
  GenerateBytecode(stack_limit) {
    this.InitializeAstVisitor(stack_limit);

    let incoming_context = new ContextScope(this, this.closure_scope_);
    let control = new ControlScopeForTopLevel(this);
    // RegisterAllocationScope register_scope(this);
    let outer_next_register_index_ = this.register_allocator().next_register_index_;

    this.AllocateTopLevelRegisters();

    //
    this.builder_.StackCheck(this.info_.literal_.start_position());
 
    // 状态函数
    if (this.info_.literal_.CanSuspend()) {
      this.BuildGeneratorPrologue();
    }

    if (this.closure_scope_.NeedsContext()) {
      this.BuildNewLocalActivationContext();
      let local_function_context = new ContextScope(this, this.closure_scope_);
      this.BuildLocalActivationContextInitialization();
      this.GenerateBytecodeBody();
      // 析构
      let outer_ = local_function_context.outer_;
      if (outer_) {
        this.builder_.PopContext(outer_.register_);
        outer_.register_ = local_function_context.register_;
      }
      this.execution_context_ = outer_;
    } else {
      this.GenerateBytecodeBody();
    }
    // 析构
    this.register_allocator().ReleaseRegisters(outer_next_register_index_);
    let outer_ = incoming_context.outer_;
    if (outer_) {
      this.builder_.PopContext(outer_.register_);
      outer_.register_ = incoming_context.register_;
    }
    this.execution_context_ = outer_;
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
    if (this.info_.collect_type_profile()) { }

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
  BuildNewLocalActivationContext() {
    let value_execution_result = new ValueResultScope(this);
    let scope = this.closure_scope_;

    if (scope.is_script_scope()) {
      let scope_reg = this.register_allocator().NewRegister();
      this.builder_.LoadLiteral_Scope(scope)
        .StoreAccumulatorInRegister(scope_reg)
        .CallRuntime(kNewScriptContext, scope_reg);
    } else if (scope.is_module_scope()) {
      let args = this.register_allocator().NewRegisterList(2);
      this.builder_.MoveRegister(this.builder_.Parameter(0), args.get(0))
        .LoadLiteral_Scope(scope)
        .StoreAccumulatorInRegister(args.get(1))
        .CallRuntime(kPushModuleContext, args);
    } else {
      let slot_count = scope.num_heap_slots_ - MIN_CONTEXT_SLOTS;
      if (slot_count <= kMaximumSlots) {
        switch (scope.scope_type_) {
          case EVAL_SCOPE:
            this.builder_.CreateEvalContext(scope, slot_count);
            break;
          case FUNCTION_SCOPE:
            this.builder_.CreateFunctionContext(scope, slot_count);
            break;
          default:
            throw new Error('UNREACHABLE');
        }
      } else {
        let arg = this.register_allocator().NewRegister();
        this.builder_.LoadLiteral(scope).StoreAccumulatorInRegister(arg)
          .CallRuntime(kNewFunctionContext, arg);
      }
    }
    // 析构
    this.execution_result_ = value_execution_result.outer_;
    value_execution_result = null;
  }
  BuildLocalActivationContextInitialization() {
    let scope = this.closure_scope_;
    if (scope.has_this_declaration_ && scope.receiver_.IsContextSlot()) {
      let variable = scope.receiver_;
      let receiver = this.builder_.Receiver();

      this.builder_.LoadAccumulatorWithRegister(receiver)
        .StoreContextSlot(this.execution_context_.register_, variable.index_, 0);
    }

    let num_parameters = scope.num_parameters_;
    for (let i = 0; i < num_parameters; i++) {
      let variable = scope.params_[i];
      if (!variable.IsContextSlot()) continue;

      let parameter = this.builder_.Parameter(i);
      this.builder_.LoadAccumulatorWithRegister(parameter)
        .StoreContextSlot(this.execution_context_.register_, variable.index_, 0);
    }
  }

  BuildPrivateBrandInitialization() { }
  BuildInstanceMemberInitialization() { }

  /**
   * 处理语法树解析
   */
  Visit(node) {
    // if (CheckStackOverflow()) return;
    this.VisitNoStackOverflowCheck(node);
  }
  VisitNoStackOverflowCheck(node) {
    let node_type = node.node_type();
    switch (node_type) {
      case _kVariableDeclaration:
        return this.VisitVariableDeclaration(node);
      case _kExpressionStatement:
        return this.VisitExpressionStatement(node);
      case _kBlock:
        return this.VisitBlock(node);
      case _kAssignment:
        return this.VisitAssignment(node);
      case _kLiteral:
        return this.VisitLiteral(node);
    }
  }

  VisitArgumentsObject(variable) {
    if (variable === null) return;
    this.builder_.CreateArguments(this.closure_scope_.GetArgumentsType());
    this.BuildVariableAssignment(variable, 'Token::ASSIGN', HoleCheckMode_kElided);
  }
  VisitRestArgumentsArray(rest) {
    if (rest == null) return;
    this.builder_.CreateArguments(kRestParameter);
    this.BuildVariableAssignment(rest, 'Token::ASSIGN', HoleCheckMode_kElided);
  }
  VisitThisFunctionVariable(variable) {
    if (variable == null) return;
    this.builder_.LoadAccumulatorWithRegister();
    this.BuildVariableAssignment(variable, 'Token::INIT', HoleCheckMode_kElided);
  }
  VisitNewTargetVariable(variable) {
    if (variable == null) return;
    if (IsResumableFunction(this.info_.literal_.kind())) return;
    if (variable.location() === VariableLocation_LOCAL) return;

    this.builder_.LoadAccumulatorWithRegister(this.incoming_new_target_or_generator_);
    this.BuildVariableAssignment(variable, 'Token::INIT', HoleCheckMode_kElided);
  }
  BuildVariableAssignment(variable, op, hole_check_mode) {
    let mode = variable.mode();
    // RegisterAllocationScope assignment_register_scope(this);
    let outer_next_register_index_ = this.register_allocator().next_register_index_;
    // BytecodeLabel end_label;
    switch (variable.location()) {

    }
    // 析构
    this.register_allocator().ReleaseRegisters(outer_next_register_index_);
  }

  BuildGeneratorObjectVariableInitialization() {

  }
  BuildIncrementBlockCoverageCounterIfEnabled(node, kind) {
    if (this.block_coverage_builder_ === null) return;
    this.block_coverage_builder_.IncrementBlockCounter(node, kind);
  }
  VisitDeclarations(declarations) {
    // RegisterAllocationScope register_scope(this);
    let outer_next_register_index_ = this.register_allocator().next_register_index_;
    for (let decl of declarations) {
      // RegisterAllocationScope register_scope(this);
      let outer_next_register_index_ = this.register_allocator().next_register_index_;
      this.Visit(decl);
      // 析构
      this.register_allocator().ReleaseRegisters(outer_next_register_index_);
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
    // 析构
    this.register_allocator().ReleaseRegisters(outer_next_register_index_);
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
      case VariableLocation_UNALLOCATED: {
        let slot = this.GetCachedLoadGlobalICSlot(NOT_INSIDE_TYPEOF, variable);
        this.globals_builder_.AddUndefinedDeclaration(variable.name_, slot);
        break;
      }
      case VariableLocation_CONTEXT:
        if (variable.binding_needs_init()) {
          this.builder_.LoadTheHole()
            .StoreContextSlot(this.execution_context_.register_, variable.index_, 0);
        }
        break;
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
      let scope = new ContextScope(this. stmt.scope_);
      this.VisitBlockDeclarationsAndStatements(stmt);
      // 析构
      let outer_ = scope.outer_;
      if (outer_) {
        this.builder_.PopContext(outer_.register_);
        outer_.register_ = scope.register_;
      }
      this.execution_context_ = outer_;
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

  /**
   * 解析赋值表达式
   * 包含target_、value_
   * 步骤如下
   * 1. 获取赋值表达式左边类型(解构、对象、普通标识符)
   * 2. 对右值进行处理后放入累加器中
   * 3. 记录最后一次表达式的位置
   * 4. 构建赋值表达式的字节码
   * @param {Assignment} expr 赋值表达式
   */
  VisitAssignment(expr) {
    let lhs_data = this.PrepareAssignmentLhs(expr.target_);
    this.VisitForAccumulatorValue(expr.value_);
    this.builder_.SetExpressionPosition(expr);
    this.BuildAssignment(lhs_data, expr.op(), expr.lookup_hoisting_mode());
  }
  PrepareAssignmentLhs(lhs, accumulator_preserving_mode = AccumulatorPreservingMode_kNone) {
    let assign_type = null;
    /**
     * 根据类型进行划分
     * 1. 对象属性
     * 2. 普通标识符变量
     */
    if (lhs.IsProperty()) {
      assign_type = Property.GetAssignType(lhs);
    } else {
      assign_type = AssignType_NON_PROPERTY;
    }
    switch (assign_type) {
      case AssignType_NON_PROPERTY:
        return AssignmentLhsData.NonProperty(lhs);
      // TODO
    }
    throw new Error('UNREACHABLE');
  }
  /**
   * 计算表达式结果并保存到累加器中
   * @param {Assignment} expr 赋值表达式右值
   * @return {TypeHint} 右值的类型推断 Boolean/String/Any
   */
  VisitForAccumulatorValue(expr) {
    let accumulator_scope = new ValueResultScope(this);
    this.Visit(expr);
    let type_hint = accumulator_scope.type_hint_;
    // 析构
    this.execution_result_ = accumulator_scope.outer_;
    accumulator_scope = null;
    return type_hint;
  }
  BuildAssignment(lhs_data, op, lookup_hoisting_mode) {
    let expr = lhs_data.expr_;
    switch (lhs_data.assign_type_) {
      /**
       * 处理赋值解构与普通赋值
       * 1. let {a} = {a: 1};
       * 2. let [a] = [1];
       * 3. let a = 1;
       */
      case AssignType_NON_PROPERTY: {
        if (expr.IsObjectLiteral()) {
          this.BuildDestructuringObjectAssignment(expr, op, lookup_hoisting_mode);
        } else if (expr.IsArrayLiteral()) {
          this.BuildDestructuringArrayAssignment(expr, op, lookup_hoisting_mode);
        } else {
          this.BuildVariableAssignment(expr.var_, op, expr.hole_check_mode(), lookup_hoisting_mode);
        }
        break;
      }
      // TODO
    }
  }
  BuildDestructuringObjectAssignment() {}
  BuildDestructuringArrayAssignment() {}
  BuildVariableAssignment(variable, op, hole_check_mode, lookup_hoisting_mode) {
    let mode = variable.mode();
    // RegisterAllocationScope assignment_register_scope(this);
    let outer_next_register_index_ = this.register_allocator().next_register_index_;
    let end_label = null;
    let loc = variable.location();
    switch (loc) {
      case VariableLocation_PARAMETER:
      case VariableLocation_LOCAL: {
        let destination = null;
        if (loc === VariableLocation_PARAMETER) {
          if (variable.IsReceiver()) {
            destination = this.builder_.Receiver();
          } else {
            destination = this.builder_.Parameter(variable.index_);
          }
        } else {
          destination = this.builder_.Local(variable.index_);
        }

        if (hole_check_mode === HoleCheckMode_kRequired) {
          let value_temp = this.register_allocator().NewRegister();
          this.builder_
          .StoreAccumulatorInRegister(value_temp)
          .LoadAccumulatorWithRegister(destination);

          this.BuildHoleCheckForVariableAssignment(variable, op);
          this.builder_.LoadAccumulatorWithRegister(value_temp);
        }

        if (mode !== VariableMode_kConst || op === TokenEnumList.indexOf('Token::INIT')) {
          this.builder_.StoreAccumulatorInRegister(destination);
        } else if (variable.throw_on_const_assignment(this.language_mode())) {
          // this.builder_.CallRuntime(kThrowConstAssignError)
        }
        break;
      }
      case VariableLocation_UNALLOCATED: {
        let slot = this.GetCachedStoreGlobalICSlot(this.language_mode(), variable);
        this.builder_.StoreGlobal(variable.raw_name(), this.feedback_index(slot));
        break;
      }
      case VariableLocation_CONTEXT: {
        // 获取上下文深度 每一个作用域会生成一个
        let depth = this.execution_context_.ContextChainDepth(variable.scope_);
        // 获取上下文作用链
        let context = this.execution_context_.Previous(depth);
        let context_reg = null;

        if (context) {
          context_reg = context.register_;
        } else {
          context_reg = this.execution_context_.register_;
        }

        if (hole_check_mode === HoleCheckMode_kRequired) {
          let value_temp = this.register_allocator().NewRegister();
          this.builder_
          .StoreAccumulatorInRegister(value_temp)
          .LoadContextSlot(context_reg, variable.index_, depth, ContextSlotMutability_kMutableSlot);

          this.BuildHoleCheckForVariableAssignment(variable, op);
          this.builder_.LoadAccumulatorWithRegister(value_temp);
        }

        if (mode !== VariableMode_kConst || op === TokenEnumList.indexOf('Token::INIT')) {
          this.builder_.StoreContextSlot(context_reg, variable.index_, depth);
        } else if (variable.throw_on_const_assignment(this.language_mode())) {
          // this.builder_.CallRuntime(kThrowConstAssignError)
        }
        break;
      }
        
      // TODO
    }
    // 析构
    this.register_allocator().ReleaseRegisters(outer_next_register_index_);
  }
  BuildHoleCheckForVariableAssignment(variable, op) {
    // 检测const this = 1
    if (variable.is_this() && variable.mode() === VariableMode_kConst
    && op === TokenEnumList.indexOf('Token::INIT')) {
      this.builder_.ThrowSuperAlreadyCalledIfNotHole();
    } else {
      this.BuildThrowIfHole(variable);
    }
  }

  /**
   * 这个类的构造经过了特殊处理
   * 因此在生成字节码的时候也要进行额外区分各类字面量
   * @param {Literal*} expr 字面量
   */
  VisitLiteral(expr) {
    if (this.execution_result_.IsEffect()) return;
    switch (expr.type()) {
      /**
       * 这里会做各种类型转换 实际上返回各类立即值
       * JS在这里做调用分发
       */
      case Literal_kSmi:
        this.builder_.LoadLiteral_Smi(expr.val());
        break;
      case Literal_kHeapNumber:
        this.builder_.LoadLiteral_HeapNumber(expr.val());
      case Literal_kUndefined:
        this.builder_.LoadUndefined();
        break;
      case Literal_kBoolean:
        this.builder_.LoadBoolean(expr.ToBooleanIsTrue());
        execution_result_.SetResultIsBoolean();
        break;
      case Literal_kNull:
        this.builder_.LoadNull();
        break;
      case Literal_kTheHole:
        this.builder_.LoadTheHole();
        break;
      case Literal_kString:
        this.builder_.LoadLiteral_String(expr);
        execution_result_.SetResultIsString();
        break;
      case Literal_kSymbol:
        this.builder_.LoadLiteral_Symbol(expr.val());
        break;
      case Literal_kBigInt:
        this.builder_.LoadLiteral_BigInt(expr.val());
        break;
    }
  }

  feedback_index(slot) { return slot.id_; }
  language_mode() { return this.current_scope_.language_mode(); }
  function_kind() { return this.info_.literal_.kind(); }
  feedback_spec() { return this.info_.feedback_vector_spec_; }
  InitializeAstVisitor(stack_limit) {
    this.stack_limit = stack_limit;
    this.stack_overflow_ = false;
  }
  AllocateTopLevelRegisters() { }
  BuildGeneratorPrologue() {

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
    for (let i = 1; i < entries_per_slot; i++) {
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
    switch (kind) {
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

class SharedFeedbackSlot { }
class BlockCoverageBuilder { }

class ControlScopeForTopLevel { }
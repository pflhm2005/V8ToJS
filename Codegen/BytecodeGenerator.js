import { kElided, kRestParameter, kTraceEnter, kBody, LOCAL, _kBlock, _kVariableDeclaration, _kExpressionStatement, _kAssignment } from "../enum";
import Register from "./Register";
import { IsResumableFunction, IsBaseConstructor } from "../util";
import { FLAG_trace } from "../Compile/Flag";
import BytecodeArrayBuilder from "./BytecodeArrayBuilder";

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
      null, info.num_parameters_including_this(), 
      info.scope().num_stack_slots_, info.feedback_vector_spec_, 
      info.SourcePositionRecordingMode());
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
    let register_scope = new RegisterAllocationScope(this);

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

    // 构造函数内部变量声明
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
  VisitDeclarations() {

  }
  VisitModuleNamespaceImports() {
    if (!this.closure_scope_.is_module_scope()) return;
  }
  BuildPrivateBrandInitialization() {}
  BuildInstanceMemberInitialization() {}
  VisitStatements(statements) {
    for (let i = 0; i < statements.length; i++) {
      let stmt = statements[i];
      this.Visit(stmt);
      if (this.builder_.RemainderOfBlockIsDead()) break;
    }
  }
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
  BuildReturn() {

  }

  VisitVariableDeclaration(decl) {
    // let variable = decl;
    // console.log(variable);
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
class FeedbackSlotCache {}
class GlobalDeclarationsBuilder {}

class SharedFeedbackSlot {}
class BlockCoverageBuilder {}

class ContextScope {}
class ControlScopeForTopLevel {}
class RegisterAllocationScope {}
import { kElided } from "../enum";

// This kind means that the slot points to the middle of other slot
// which occupies more than one feedback vector element.
// There must be no such slots in the system.
const kInvalid = 0;

// Sloppy kinds come first; for easy language mode testing.
const kStoreGlobalSloppy = 1;
const kStoreNamedSloppy = 2;
const kStoreKeyedSloppy = 3;
const kLastSloppyKind = kStoreKeyedSloppy;
const
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
    this.builder_ = new BytecodeArrayBuilder(null, info.num_parameters_including_this(), 
    info.scope().num_stack_slots_, info.feedback_vector_spec_, info.SourcePositionRecordingMode());
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
    this.dummy_feedback_slot_ = new SharedFeedbackSlot(this.feedback_spec(), kCompareOp);
    this.generator_jump_table_ = null;
    this.suspend_count_ = 0;
    this.loop_depth_ = 0;
    this.catch_prediction_ = UNCAUGHT;
    this.stack_limit_ = 0;
    this.stack_overflow_ = false;
    if(info.has_source_range_map()) this.block_coverage_builder_ = new BlockCoverageBuilder(null, new BytecodeArrayBuilder(), info.source_range_map_);
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
  GenerateBytecode(stack_limit) {
    this.InitializeAstVisitor(stack_limit);

    let incoming_context = new ContextScope(this, this.closure_scope_);
    let control = new ControlScopeForTopLevel(this);
    let register_scope = new RegisterAllocationScope(this);

    this.AllocateTopLevelRegisters();

    if(this.info_.literal_.CanSuspend()) this.BuildGeneratorPrologue();
    if(this.closure_scope_.NeedsContext()) {
      this.BuildNewLocalActivationContext();
      let local_function_context = new ContextScope(this, this.closure_scope_);
      this.BuildLocalActivationContextInitialization();
      this.GenerateBytecodeBody();
    } else {
      this.GenerateBytecodeBody();
    }
  }
  GenerateBytecodeBody() {
    this.VisitArgumentsObject(this.closure_scope_.arguments_);
  }
  VisitArgumentsObject(variable) {
    if(variable === null) return;
    this.builder_.CreateArguments(this.closure_scope_.GetArgumentsType());
    this.BuildVariableAssignment(variable, 'Token::ASSIGN', kElided);
  }
  BuildVariableAssignment(variable, op, hole_check_mode) {
    let mode = variable.mode();
    let assignment_register_scope = new RegisterAllocationScope(this);
    // BytecodeLabel end_label;
    switch(variable.location()) {
      
    }
  }
}

class BytecodeArrayBuilder {}
class FeedbackSlotCache {}
class GlobalDeclarationsBuilder {}
class Register {}
class SharedFeedbackSlot {}
class BlockCoverageBuilder {}

class ContextScope {}
class ControlScopeForTopLevel {}
class RegisterAllocationScope {}
const kNoReason = 0;

class BlockState {
  constructor(scope_stack, scope) {
    this.scope_stack_ = scope_stack;
    this.outer_scope_ = scope;
  }
};

export default class FunctionState extends BlockState {
  constructor(function_state_stack = null, scope_stack = null, scope = null) {
    super(scope_stack, scope);
    this.expected_property_count_ = 0;
    this.suspend_count_ = 0;
    this.function_state_stack_ = function_state_stack;
    this.outer_function_state_ = null;
    this.scope_ = scope;
    this.dont_optimize_reason_ = kNoReason;
    this.next_function_is_likely_called_ = false;
    this.previous_function_was_likely_called_ = false;
    this.contains_function_or_eval_ = false;
  }
  RecordFunctionOrEvalCall() { 
    this.contains_function_or_eval_ = true;
  }
  kind() {
    return this.scope_.function_kind_;
  }
  next_function_is_likely_called() {
    return this.next_function_is_likely_called_;
  }
}
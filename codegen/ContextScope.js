import Register from "./Register";

export default class ContextScope{
  constructor(generator, scope) {
    this.generator_ = generator;
    this.scope_ = scope;
    this.outer_ = generator.execution_context_;
    this.register_ = Register.current_context();
    this.depth_ = 0;
    if (this.outer_) {
      this.depth_ = this.outer_.depth_ + 1;
      let outer_context_reg = generator.register_allocator().NewRegister();
      this.outer_.register_ = outer_context_reg;
      generator.builder_.PushContext(outer_context_reg);
    }
    generator.execution_context_ = this;
  }
  ContextChainDepth(scope) {
    return this.scope_.ContextChainLength(scope);
  }
  Previous(depth) {
    if (depth > this.depth_) {
      return null;
    }

    let previous = this;
    for (let i = depth; i > 0; --i) {
      previous = previous.outer_;
    }
    return previous;
  }
}
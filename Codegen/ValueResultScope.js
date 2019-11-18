import { _kAny } from "../enum";

const kUninitialized = 0;
const kEffect = 1;
const kValue = 2;
const kTest = 3;

class ExpressionResultScope {
  constructor(generator, kind) {
    this.outer_ = generator.execution_result_;
    this.allocator_ = generator;
    this.kind_ = kind;
    this.type_hint_ = _kAny;
    generator.execution_result_ = this;
  }
}

export default class ValueResultScope extends ExpressionResultScope{
  constructor(generator) {
    super(generator, kValue);
  }
}
import { TypeHint_kBoolean, TypeHint_kString, TypeHint_kAny } from "../enum";

const kUninitialized = 0;
const kEffect = 1;
const kValue = 2;
const kTest = 3;

class ExpressionResultScope {
  constructor(generator, kind) {
    this.outer_ = generator.execution_result_;
    this.allocator_ = generator;
    this.kind_ = kind;
    this.type_hint_ = TypeHint_kAny;
    generator.execution_result_ = this;
  }
  IsEffect() { return this.kind_ === kEffect; }
  IsValue() { return this.kind_ === kValue; }
  IsTest() { return this.kind_ === kTest; }

  SetResultIsBoolean() {
    this.type_hint_ = TypeHint_kBoolean;
  }
  SetResultIsString() {
    this.type_hint_ = TypeHint_kString;
  }
}

export default class ValueResultScope extends ExpressionResultScope{
  constructor(generator) {
    super(generator, kValue);
  }
}
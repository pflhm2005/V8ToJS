import { ZoneObject } from "../../ast/Ast";

export default class Parameter extends ZoneObject {
  constructor(pattern, initializer, position, initializer_end_position, is_rest) {
    super();
    // PointerWithPayload
    this.initializer_ = initializer;
    this.is_rest_ = is_rest;
    this.pattern = pattern;
    this.position = position;
    this.initializer_end_position = initializer_end_position;
  }
  name() {
    return this.pattern.raw_name();
  }
}
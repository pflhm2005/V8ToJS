import { kEmptyFixedArray } from "../ParseStatementList/enum";

export default class Factory {
  constructor(isolate) {
    this.isolate = isolate;
  }
  empty_fixed_array() {
    return this.isolate.roots_table[kEmptyFixedArray];
  }
}
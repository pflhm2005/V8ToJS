import { AllocationType_kOld } from "../enum";

export default class HandlerTableBuilder {
  constructor() {
    this.entries_ = [];
  }
  ToHandlerTable(isolate) {
    let handler_table_size = this.entries_.length;
    let table_byte_array = isolate.factory_.NewByteArray(
      HandlerTable.LengthForRange(handler_table_size), AllocationType_kOld);
    // let table = new HandlerTable(table_byte_array);
    // for (let i = 0; i < handler_table_size; ++i) {
    //   let entry = this.entries_[i];
    // }
    return table_byte_array;
  }
}

const kRangeEntrySize = 4;

class HandlerTable {
  static LengthForRange(entries) {
    return entries * kRangeEntrySize * 4;
  }
}
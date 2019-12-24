import { RecordingMode_RECORD_SOURCE_POSITIONS, RecordingMode_OMIT_LAZY_SOURCE_POSITIONS, AllocationType_kOld } from "../enum";
import { MoreBit, ValueBits } from "../util";

export default class SourcePositionTableBuilder {
  constructor(mode = RecordingMode_RECORD_SOURCE_POSITIONS) {
    this.mode_ = mode;
    this.previous_ = new PositionTableEntry();
    this.bytes_ = [];
    this.raw_entries_ = [];
  }
  Omit() { return this.mode_ !== RecordingMode_RECORD_SOURCE_POSITIONS; }
  Lazy() { return this.mode_ === RecordingMode_OMIT_LAZY_SOURCE_POSITIONS; }
  AddPosition(code_offset, source_position, is_statement) {
    if (this.Omit()) return;
    this.AddEntry(new SourcePositionTableBuilder(code_offset, source_position, is_statement));
  }
  AddEntry(entry) {
    this.SubtractFromEntry(entry, this.previous_);
    this.EncodeEntry(tmp);
    this.previous_ = entry;
    this.raw_entries_.push(entry);
  }
  SubtractFromEntry(value, other) {
    value.code_offset -= other.code_offset;
    value.source_position -= other.source_position;
  }
  EncodeEntry(entry) {
    this.EncodeInt(entry.is_statement ? entry.code_offset : -entry.code_offset - 1);
    this.EncodeInt(entry.source_position);
  }
  EncodeInt(value) {
    const kShift = 4 * 8 - 1;
    value = (value << 1) ^ (value >> kShift);
    let more = false;
    let encoded = value >>> 0;
    do {
      more = encoded > ValueBits.kMax;
      let current = MoreBit.encode(more) | ValueBits.encode(encoded & ValueBits.Mask);
      this.bytes_.push(current);
      encoded >>= ValueBits.kSize;
    } while (more);
  }
  ToSourcePositionTable(isolate) {
    if (!this.bytes_.length) {
      return null;
    }
    let table = isolate.factory_.NewByteArray(this.bytes_.length, AllocationType_kOld);
    table.bytecodes = this.bytes_;
    return table;
  }
}

class PositionTableEntry {
  constructor() {
    this.code_offset = 0;
    this.source_position = 0;
    this.is_statement = false;
  }
}
import { kNoSourcePosition } from "../enum";

export default class SourceRange {
  constructor(start = kNoSourcePosition, end = kNoSourcePosition) {
    this.start = start;
    this.end = end;
  }
  IsEmpty() { return start === kNoSourcePosition; }
  // static Empty() { return new SourceRange(); }
  static OpenEnded(start) { return new SourceRange(start, kNoSourcePosition); }
  static ContinuationOf(that, end = kNoSourcePosition) {
    return that.IsEmpty() ? new SourceRange() : new SourceRange(that.end, end);
  }
}
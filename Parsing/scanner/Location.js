import { IsInRange } from "../../util";

class Location {
  constructor(start, end) {
    this.beg_pos = start;
    this.end_pos = end;
  }
  length() { return this.end_pos - this.beg_pos; }
  IsValid() { return IsInRange(this.beg_pos, 0, this.end_pos); }
  invalid() {
    this.beg_pos = -1;
    this.end_pos = 0;
    return this;
  }
}

export default Location;
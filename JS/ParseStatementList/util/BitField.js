/**
 * 这个类是一个模板类
 * template <class T, int shift, int size, class U = int>
 * class BitField {}
 */
class BitField {
  constructor(shift, size) {
    this.kShift = shift;
    this.kSize = size;
    this.kMask = ((1 << this.kShift) << this.kSize) - (1 << this.kShift);
    this.kNext = this.kShift + this.kSize;
    this.kNumValues = 1 << this.kSize;
    this.kMax = this.kNumValues - 1;
  }
  static encode(value) {
    return value << this.kShift;
  }
  /**
   * 当kMask是111111时 ~kMask => 1000000 由于直接是最大值 所以左侧相当于9
   * 当kMask是11111100时 ~kMask => 11111101 做与运算
   */
  static update(previous, value) {
    return (previous & ~this.kMask) | this.encode(value);
  }
  static decode(value) {
    return (value & this.kMask) >> this.kShift;
  }
}

/**
 * shift =>0 size => 6
 * kMax => (1 << 6) - 1 => 1000000 - 1 => 111111
 * 当shift为0时 kMask === KMax
 * 当shift为2时 
 * kMask => ((1 << 6) << 2) - (1 << 2) => 100000000 - 100 => 11111100
 * 相当于kMax左移两位
 */
export class NodeTypeField extends BitField {
  constructor() {
    super(0, 6);
  }
}

/**
 * Statement::kNextBitFieldIndex = NodeTypeField::kNext = 6;
 * BreakableStatement::kNextBitFieldIndex = BreakableTypeField::kNext = Statement::kNextBitFieldIndex + 1 = 7
 * IsLabeledField::kNext = 7 + 1 = 8
 */

export class BreakableTypeField extends BitField {
  constructor() {
    super(6, 1);
  }
}

export class IgnoreCompletionField extends BitField {
  constructor() {
    super(7, 1);
  }
}

export class IsLabeledField extends BitField {
  constructor() {
    super(8, 1);
  }
}

export class TokenField extends BitField {
  constructor() {
    super(6, 8);
  }
}
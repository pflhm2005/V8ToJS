import { kHashShift, TryAddIndexChar } from './StringHasher';
import { kIsNotArrayIndexMask, kMaxCachedArrayIndexLength } from '../enum';
import { ArrayIndexValueBits, IsDecimalDigit } from '../util';

export default class AstRawString {
  constructor(is_one_byte_, literal_bytes_, hash_field_) {
    this.literal_bytes_ = literal_bytes_;
    this.hash_field_ = hash_field_;
    this.is_one_byte_ = is_one_byte_;
  }
  StringToArrayIndex(stream, index) {
    let result = {
      is_array_index: false,
      index,
    };
    let ch = stream[0];
    /**
     * 只有字符0可以作为索引键
     */
    if (ch === '0') {
      result.is_array_index = stream.length === 1;
      result.index = 0;
      return result;
    }

    if (!IsDecimalDigit(ch)) {
      result.is_array_index = false;
      return result;
    }
    let d = ch - '0';
    let r = d;
    for(let i = 1; i < stream.length; i++) {
      if(!TryAddIndexChar(r, stream[i])) {
        result.is_array_index = false;
        return result;
      }
    }
    result.is_array_index = true;
    result.index = r;
    return result;
  }
  AsArrayIndex(index = 0) {
    let result = {
      is_array_index: false,
      index,
    };
    if((this.hash_field_ & kIsNotArrayIndexMask) !== 0) return result;
    result.is_array_index = true;
    if(this.literal_bytes_.length <= kMaxCachedArrayIndexLength) {
      result.index = ArrayIndexValueBits.decode(this.hash_field_);
    } else {
      result = StringToArrayIndex(this.literal_bytes_, index);
    }
    return result;
  }
  Hash() {
    return this.hash_field_ >> kHashShift;
  }
}
import { kHashShift } from './StringHasher';

export default class AstRawString {
  constructor(is_one_byte_, literal_bytes_, hash_field_) {
    this.literal_bytes_ = literal_bytes_;
    this.hash_field_ = hash_field_;
    this.is_one_byte_ = is_one_byte_;
  }
  Hash() {
    return this.hash_field_ >> kHashShift;
  }
}
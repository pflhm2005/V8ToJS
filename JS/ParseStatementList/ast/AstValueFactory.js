import StringHasher from './StringHasher';
import AstRawString from "./AstRawString";

const kMaxOneCharStringValue = 128;

export default class AstValueFactory {
  constructor() {
    this.one_character_strings_ = new Array(kMaxOneCharStringValue).fill(0);
    this.string_table_ = new Map();
    // this.hash_seed_ = BigInt(15853730874361889590); 
    this.hash_seed_ = 1704808181;
    this.string_end_ = [];
  }
  dot_result_string() { return '.result'; }
  prototype_string() { return 'prototype'; }
  GetOneByteString(literal) {
    return this.GetOneByteStringInternal(literal);
  }
  GetOneByteStringInternal(literal) {
    if (literal.length === 1 && literal[0] < kMaxOneCharStringValue) {
      let key = literal[0];
      /**
       * 单字符变量第一次出现会进这里
       * one_character_strings_是一个长度为128的Vector 保存每一个字符生成的hash值
       */
      if (one_character_strings_[key] === null) {
        let hash_field = StringHasher.HashSequentialString(literal, 1, this.hash_seed_);
        one_character_strings_[key] = this.GetString(hash_field, true, literal);
      }
      return one_character_strings_[key];
    }
    let hash_field = StringHasher.HashSequentialString(literal, literal.length, this.hash_seed_);
    hash_field >>>= 0;
    return this.GetString(hash_field, true, literal);
  }
  GetString(hash_field, is_one_byte, literal_bytes) {
    let new_string = new AstRawString(is_one_byte, literal_bytes, hash_field);
    // 这里实际传的key是对象的指针
    let entry = this.LookupOrInsert(new_string, new_string.Hash());
    /**
     * 源码由HashMap返回
     * key是一个void*、value是对应的hash值
     */
    if (entry === null) {
      // 在指定的内存上初始化对象 对JS来说毫无意义
      // int length = literal_bytes.length();
      // byte* new_literal_bytes = zone_->NewArray<byte>(length);
      // memcpy(new_literal_bytes, literal_bytes.begin(), length);
      // AstRawString* new_string = new (zone_) AstRawString(is_one_byte, Vector<const byte>(new_literal_bytes, length), hash_field);
      this.AddString(new_string);
      // 感觉是这么个逻辑
      // entry->key = new_string;
      // entry->value = reinterpret_cast<void*>(1);
      this.string_table_.set(new_string, 1);
    }
    // 源码将void*强转返回 => reinterpret_cast<AstRawString*>
    return new_string;
  }
  /**
   * 
   * @param {AstRawString*} key 源码是指针 这里只能用对象代替
   * @param {Number} value Hash值
   */
  LookupOrInsert(key, value) {
    if (this.string_table_.has(key)) {
      this.string_table_.get(key);
      return key;
    }
    this.string_table_.set(key, value);
    return null;
  }
  AddString(string) {
    /**
     * 二维指针 搞屁
     */
    this.string_end_.push(string);
    return string;
  }
}
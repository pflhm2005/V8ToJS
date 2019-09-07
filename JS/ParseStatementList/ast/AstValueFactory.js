import StringHasher from './StringHasher';
import AstRawString from "./AstRawString";
import { ZoneObject } from './Ast';

const kMaxOneCharStringValue = 128;

export default class AstValueFactory {
  constructor() {
    this.one_character_strings_ = new Array(kMaxOneCharStringValue).fill(null);
    this.string_table_ = new Map();
    // this.hash_seed_ = BigInt(15853730874361889590); 
    this.hash_seed_ = 1704808181;
    this.string_end_ = [];
    this.cons_string_ar = [];
    this.empty_cons_string_ = this.NewConsString();
  }

  dot_string() { return '.'; }
  eval_string() { return 'eval'; }
  arguments_string() { return 'arguments'; }
  dot_result_string() { return '.result'; }
  prototype_string() { return 'prototype'; }
  proto_string() { return '__proto__'; }
  empty_string() { return ''; }
  new_target_string() { return '.new.target'; }
  this_string() { return 'this'; }
  this_function_string() { return '.this_function'; }
  default_string() { return 'default'; }
  dot_default_string() { return '.default'; }

  empty_cons_string() { return this.empty_cons_string_; }
  NewConsString() {
    let new_string = new AstConsString();
    this.AddConsString(new_string);
    return new_string;
  }
  AddConsString(string) {
    /**
     * 这里用二维指针实现的一个链表
     * JS直接用数组代替了
     */
    this.cons_string_ar.push(string);
  }
  GetOneByteString(literal) {
    return this.GetOneByteStringInternal(literal);
  }
  GetOneByteStringInternal(literal) {
    if (literal.length === 1 && literal[0].charCodeAt() < kMaxOneCharStringValue) {
      let key = literal[0].charCodeAt();
      /**
       * 单字符变量第一次出现会进这里
       * one_character_strings_是一个长度为128的Vector 保存每一个字符生成的hash值
       */
      if (this.one_character_strings_[key] === null) {
        let hash_field = StringHasher.HashSequentialString(literal, 1, this.hash_seed_);
        this.one_character_strings_[key] = this.GetString(hash_field, true, literal);
      }
      return this.one_character_strings_[key];
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

class AstConsString extends ZoneObject {
  constructor() {
    super();
    this.next_ = null;
    this.segment_ = [];
  }
  IsEmpty() {
    return !this.segment_.length;
  }
  AddString(s) {
    this.segment_.push(s);   
  }
}
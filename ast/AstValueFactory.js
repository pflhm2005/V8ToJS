import StringHasher from './StringHasher';
import AstRawString from "./AstRawString";
import { ZoneObject } from './Ast';

const kMaxOneCharStringValue = 128;

export default class AstValueFactory {
  constructor() {
    this.one_character_strings_ = new Array(kMaxOneCharStringValue).fill(null);
    this.string_table_ = [];
    // this.hash_seed_ = BigInt(15853730874361889590); 
    this.hash_seed_ = 1704808181;
    this.string_end_ = [];
    this.cons_string_ar = [];
    this.empty_cons_string_ = this.NewConsString();
  }

  dot_string() { return '.'; }
  eval_string() { return 'eval'; }
  name_string() { return 'name'; }
  constructor_string() { return 'constructor'; }
  arguments_string() { return 'arguments'; }
  dot_result_string() { return '.result'; }
  dot_generator_object_string() { return '.generator_object'; }
  dot_switch_tag_string() { return '.switch_tag'; }
  prototype_string() { return 'prototype'; }
  proto_string() { return '__proto__'; }
  empty_string() { return ''; }
  new_target_string() { return '.new.target'; }
  this_string() { return 'this'; }
  this_function_string() { return '.this_function'; }
  default_string() { return 'default'; }
  dot_default_string() { return '.default'; }
  get_space_string() { return 'get'; }
  set_space_string() { return 'set'; }
  native_string() { return 'native'; }
  of_string() { return 'of'; }
  computed_string() { return '<computed>'; }
  meta_string() { return 'meta'; }
  dot_catch_string() { return '.catch'; }

  empty_cons_string() { return this.empty_cons_string_; }
  NewConsString(str1 = null, str2 = null) {
    let new_string = new AstConsString();
    this.AddConsString(new_string);
    return new_string.AddString(str1).AddString(str2);
  }
  AddConsString(string) {
    /**
     * 这里用二维指针实现的一个链表
     * JS直接用数组代替了
     */
    this.cons_string_ar.push(string);
  }
  /**
   * 源码中参数是一个vector容器 这里直接用字符串代替了
   * @param {Vector<const uint8_t>} literal 
   */
  GetOneByteString(literal) {
    return this.GetOneByteStringInternal(literal);
  }
  GetOneByteStringInternal(literal) {
    // 单字符特殊处理 有一个映射表单独缓存了所有key
    if (literal.length === 1 && literal[0].charCodeAt() < kMaxOneCharStringValue) {
      let key = literal[0].charCodeAt();
      /**
       * V8_UNLIKELY
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
    // 最后返回的必须是无符号整数
    hash_field >>>= 0;
    return this.GetString(hash_field, true, literal);
  }
  GetString(hash_field, is_one_byte, literal_bytes) {
    let key = new AstRawString(is_one_byte, literal_bytes, hash_field);
    // 这里实际传的key是对象的指针
    let entry = this.LookupOrInsert(key, key.Hash());
    /**
     * 源码由HashMap返回
     * key是一个void*、value是对应的hash值
     */
    if (entry.value === null) {
      // 在指定的内存上初始化对象 对JS来说毫无意义
      // int length = literal_bytes.length();
      // byte* new_literal_bytes = zone_->NewArray<byte>(length);
      // memcpy(new_literal_bytes, literal_bytes.begin(), length);
      // AstRawString* new_string = new (zone_) AstRawString(is_one_byte, Vector<const byte>(new_literal_bytes, length), hash_field);
      this.AddString(key);
      // entry->key = new_string;
      // entry->value = reinterpret_cast<void*>(1);
      /**
       * C++中两个地址相同的对象全等
       * 所以上面的代码value直接用一个给定指针代替
       * JS不存在这种科技 因此用Hash值作为标示判定对象的相等
       */
      entry.key = key;
      entry.value = key.Hash();
    }
    // 源码将void*强转返回 => reinterpret_cast<AstRawString*>
    return entry.key;
  }
  /**
   * 
   * @param {AstRawString*} key 源码是指针 这里只能用对象代替
   * @param {Number} value Hash值
   */
  LookupOrInsert(key, hash) {
    let tar = this.string_table_.find(v => v.hash === hash);
    if (!tar) {
      let result = {
        key: null,
        value: null
      };
      this.string_table_.push(result);
      return result;
    }
    return tar;
  }
  AddString(string) {
    /**
     * 二维指针 搞屁
     */
    this.string_end_.push(string);
    return string;
  }

  Internalize() {}
}

class AstConsString extends ZoneObject {
  constructor() {
    super();
    this.next_ = null;
    // 链表
    this.segment_ = {
      string: null, 
      next: null,
    };
  }
  IsEmpty() {
    return this.segment_.string === null;
  }
  // 没有指针 实现起来有点变扭。。。
  AddString(s) {
    if(s === null) return this;
    if(!this.IsEmpty()) {
      let tmp = {
        string: s, 
        next: this.segment_,
      };
      this.segment_ = tmp;
    }
    this.segment_.string = s;
    return this;
  }
}
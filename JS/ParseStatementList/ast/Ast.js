import { 
  kVar,
  kVariableDeclaration,
  kNoSourcePosition,

  kSmi,
  kHeapNumber,
  kBigInt,
  kString,
  kSymbol,
  kBoolean,
  kUndefined,
  kNull,
  kTheHole,

  kLiteral,
} from "../base/Const";

const update = () => {};
const decode = () => {};

export class AstNodeFactory {
  NewVariableProxy(name, variable_kind, start_position = kNoSourcePosition) {
    return new VariableProxy(name, variable_kind, start_position);
  }
  NewVariableDeclaration(pos) {
    return new VariableDeclaration(pos);
  }

  /**
   * 生成字面量对象
   * 源码这里用的是函数重载 由于有严格的类型形参 所以很舒适
   * JS无法做到完美模拟 这里手动将对应类型的枚举传入构造函数
   */
  NewNullLiteral(pos) {
    return new Literal(kNull, null, pos);
  }
  NewBooleanLiteral(b, pos) {
    return new Literal(kBoolean, b, pos);
  }
  NewSmiLiteral(number, pos) {
    return new Literal(kSmi, number, pos);
  }
  // TODO
  // NewNumberLiteral() {}
  NewBigIntLiteral(bigint, pos) {
    return new Literal(kBigInt, bigint, pos);
  }
  NewStringLiteral(string, pos) {
    return new Literal(kString, string, pos);
  }
}

class AstNode {
  constructor(position, type) {
    this.position_ = position;
    this.bit_field_ = this.encode(type);
  }
  encode() {}
}

export class Expression extends AstNode {
  constructor(pos = 0, type = 0) {
    super(pos, type);
  }
}

class Declaration extends AstNode {
  constructor(pos, type) {
    super(pos, type);
    this.next_ = null;
    this.var_ = null;
  }
  var() { return this.var_; }
  set_var(v) { this.var_ = v; }

  // Declarations list threaded through the declarations.
  // Declaration** next() { return &next_; }
  // Declaration* next_;
}

class VariableDeclaration extends Declaration {
  constructor(pos, is_nested = false) {
    super(pos, kVariableDeclaration);
    this.bit_field_ = update(this.bit_field_, is_nested);
  }
}

export class VariableProxy extends Expression {
  constructor(name, variable_kind, start_position) {
    super(start_position, variable_kind);
    this.raw_name_ = name;
    this.next_unresolved_ = null;

    this.var_ = null;

    this.bit_field_ |= 0;
  }
  set_var(v) { this.var_ = v; }
  set_is_resolved() { this.bit_field_ = update(this.bit_field_, true); }
  is_assigned() { return decode(this.bit_field_); }

  BindTo(variable) {
    this.set_var(variable);
    this.set_is_resolved();
    variable.set_is_used();
    if (this.is_assigned()) variable.set_maybe_assigned();
  }
}

// The AST refers to variables via VariableProxies - placeholders for the actual
// variables. Variables themselves are never directly referred to from the AST,
// they are maintained by scopes, and referred to from VariableProxies and Slots
// after binding and variable allocation.
const kNotAssigned = 0;
const kMaybeAssigned = 1;

const kNeedsInitialization = 0;
const kCreatedInitialized = 1;
class ZoneObject {}
export class Variable extends ZoneObject {
  constructor(scope, name, mode, kind, initialization_flag, maybe_assigned_flag = kNotAssigned) {
    super();
    this.scope_ = scope;
    this.name_ = name;
    this.local_if_not_shadowed_ = false;
    this.next_ = null;
    this.index_ = -1;
    this.initializer_position_ = kNoSourcePosition;
    this.bit_field_ = 0; // TODO
  }
  set_is_used() { this.bit_field_ = update(this.bit_field_, true); }
  set_maybe_assigned() { this.bit_field_ = update(this.bit_field_, kMaybeAssigned); }

  static DefaultInitializationFlag(mode) { return mode === kVar ? kCreatedInitialized : kNeedsInitialization; }
};

/**
 * 字面量类
 */
class Literal extends Expression{
  /**
   * 源码构造函数只用了2个参数 由于重载的存在 所以类型已经确定了
   * JS手动传进来
   * @param {Enumerator} type 枚举类型
   * @param {any} val 字面量的值
   * @param {Number} pos 位置
   */
  constructor(type, val, pos) {
    super(pos, kLiteral);
    /**
     * 每一种字面量只会有唯一的值 不可能同时是字符串与数字
     * 因此源码在这里用了union来优化内存的使用
     * 包括了6个字面量变量string_、smi_、number_、symbol_、bigint_、boolean_
     */
    this.type = type;
    /**
     * JS既没有函数重载(参数不同可以模拟 类型实在无力) 也没有union数据结构 连枚举也没有
     * 因此用一个数组来保存值 用val()来获取对应的值
     */
    this.val = new Array(6).fill(null);
    this.val[type] = val;
    
    this.bit_field_ = this.update(this.bit_field_, type);
  }
  // add
  val() {
    return this.val[this.type];
  }
}
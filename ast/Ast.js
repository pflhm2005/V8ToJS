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
  kAssignment,
  kCompoundAssignment,
  kExpressionStatement,

  _kVariableProxy,

  TARGET_FOR_ANONYMOUS,
  TARGET_FOR_NAMED_ONLY,

  _kBlock,
  CONSTANT,
  COMPUTED,
  MATERIALIZED_LITERAL,
  PROTOTYPE,
  _kRegExpLiteral,
  _kObjectLiteral,
  _kArrayLiteral,
  _kLiteral,
  GETTER,
  SETTER,
  _kEmptyStatement,
  _kClassLiteral,
  PARAMETER_VARIABLE,
  kLet,
  _kFunctionLiteral,
  kAnonymousExpression,
} from "../enum";

import {
  NodeTypeField,
  BreakableTypeField,
  IgnoreCompletionField,
  IsLabeledField,
  TokenField,
  HashMap,
  IsResolvedField,
  HasElementsField,
  HasRestPropertyField,
  FastElementsField,
  HasNullPrototypeField,
  NeedsInitialAllocationSiteField,
  IsSimpleField,
  FunctionSyntaxKindBits,
  IsConciseMethod,
  IsNewTargetField,
  LocationField,
} from '../util';

export class AstNodeFactory {
  constructor(ast_value_factory) {
    this.ast_value_factory_ = ast_value_factory;
  }
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
   * @returns {Literal} 字面量类
   */
  NewNullLiteral(pos) {
    return new Literal(kNull, null, pos);
  }
  NewNumberLiteral() {}
  NewBooleanLiteral(b, pos) {
    return new Literal(kBoolean, b, pos);
  }
  NewSmiLiteral(number, pos) {
    return new Literal(kSmi, number, pos);
  }
  NewObjectLiteral(properties, boilerplate_properties, pos, has_rest_property) {
    return new ObjectLiteral(properties, boilerplate_properties, pos, has_rest_property);
  }
  // TODO
  // NewNumberLiteral() {}
  NewBigIntLiteral(bigint, pos) {
    return new Literal(kBigInt, bigint, pos);
  }
  NewStringLiteral(string, pos) {
    return new Literal(kString, string, pos);
  }
  NewObjectLiteralProperty(key, value, is_computed_name) {
    return new ObjectLiteralProperty(this.ast_value_factory_, key, value, is_computed_name);
  }

  /**
   * 声明+赋值语句
   * @param {Token} op 赋值类型
   * @param {Expression} target 变量名
   * @param {Expression} value 变量值
   * @param {Number} pos 位置
   * @returns {Assignment}
   */
  NewAssignment(op, target, value, pos) {
    if (op !== 'Token::INIT' && target.IsVariableProxy()) target.AsVariableProxy().set_is_assigned();
    if (op === 'Token::ASSIGN' || op === 'Token::INIT') return new Assignment(kAssignment, op, target, value, pos);
    else return new CompoundAssignment(op, target, value, pos, this.NewBinaryOperation(BinaryOpForAssignment(op), target, value, pos + 1));
  }
  NewExpressionStatement(expression, pos) {
    return new ExpressionStatement(expression, pos);
  }
  /**
   * 该方法有重载
   */
  NewBlock(ignore_completion_value, statements) {
    // 构造参数在这里基本上毫无意义
    let result = new Block();
    result.InitializeStatements(statements, null);
    return result;
  }
}

class AstNode {
  constructor(position, type) {
    this.position_ = position;
    this.bit_field_ = NodeTypeField.encode(type);
  }
  IsVariableProxy() { return this.node_type() === _kVariableProxy; }
  IsEmptyStatement() { return this.node_type() === _kEmptyStatement; }
  IsClassLiteral() { return this.node_type() === _kClassLiteral; }
  IsFunctionLiteral() { return this.node_type() === _kClassLiteral; }
  IsLiteral() { return this.node_type() === _kFunctionLiteral; }
  node_type() { return NodeTypeField.decode(this.bit_field_); }
  AsMaterializedLiteral() {
    switch(this.node_type()) {
      case _kRegExpLiteral:
      case _kObjectLiteral:
      case _kArrayLiteral:
        return true;
      default:
        return null;
    }
  }
}

class Statement extends AstNode {
  constructor(position, type) {
    super(position, type);
    this.kNextBitFieldIndex = 6;
  }
}

class ExpressionStatement extends Statement {
  constructor(expression, pos) {
    super(pos, kExpressionStatement);
    this.expression_ = expression;
  }
  set_expression(e) {
    this.expression_ = e;
  }
}

/**
 * break语句除了for、while等关键词的break操作
 * 还包括了foo: if (b) { f(); break foo; }此类语法
 */
class BreakableStatement extends Statement {
  constructor(breakable_type, position, type) {
    super(position, type);
    this.bit_field_ |= BreakableTypeField.encode(breakable_type);
  }
}

class Block extends BreakableStatement {
  constructor(zone = null, labels = null, capacity = 0, ignore_completion_value = true) {
    super(TARGET_FOR_NAMED_ONLY, kNoSourcePosition, _kBlock);
    this.statement_ = null;
    this.scope_ = null;
    this.bit_field_ |= IgnoreCompletionField.encode(1) | IsLabeledField.encode(0);
  }
  // 这里用的内存拷贝
  InitializeStatements(statements, zone = null) {
    this.statement_ = statements;
  }
}

class LabeledBlock extends Block {
  // 这里构造函数重载了 capacity参数后移了一位 去掉了zone参数
  constructor(labels, ignore_completion_value, capacity = 0) {
    super(labels, capacity, ignore_completion_value);
    this.labels_ = labels;
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
    this.bit_field_ = NodeTypeField.update(this.bit_field_, is_nested);
  }
}

export class Expression extends AstNode {
  constructor(pos, type) {
    super(pos, type);
  }
  IsAnonymousFunctionDefinition() {
    return (this.IsFunctionLiteral() && this.IsAnonymousFunctionDefinition()) || 
    (this.IsClassLiteral() && this.IsAnonymousFunctionDefinition());
  }
  IsConciseMethodDefinition() {
    return this.IsFunctionLiteral() && IsConciseMethod(this.kind());
  }
  IsAccessorFunctionDefinition() {
    return this.IsFunctionLiteral() && this.IsAccessorFunctionDefinition(this.kind());
  }
}

class Assignment extends Expression {
  constructor(node_type, op, target, value, pos) {
    super(pos, node_type);
    this.target_ = target;
    this.value_ = value;
    this.bit_field_ |= TokenField.encode(op);
  }
}

class CompoundAssignment extends Assignment {
  constructor(op, target, value, pos, binary_operation) {
    super(kCompoundAssignment, op, target, value, pos);
    // BinaryOperation* binary_operation_;
    this.binary_operation_ = binary_operation;
  }
}

export class VariableProxy extends Expression {
  constructor(name, variable_kind, start_position) {
    super(start_position, _kVariableProxy);
    this.raw_name_ = name;
    this.next_unresolved_ = null;

    this.var_ = null;

    this.bit_field_ |= 0;
  }
  set_var(v) { this.var_ = v; }
  set_is_resolved() { this.bit_field_ = NodeTypeField.update(this.bit_field_, true); }
  is_assigned() { return NodeTypeField.decode(this.bit_field_); }

  BindTo(variable) {
    this.set_var(variable);
    this.set_is_resolved();
    variable.set_is_used();
    if (this.is_assigned()) variable.set_maybe_assigned();
  }
  raw_name() {
    return IsResolvedField.decode(this.bit_field_) ? this.var_.raw_name_ : this.raw_name_;
  }
  is_new_target() {
    return IsNewTargetField.decode(this.bit_field_);
  }
}

/**
 * 字面量类
 * 实际上有很多种类 同时提供Asxxx方法进行转换 这里统一用一个
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
     * JS既没有函数重载(参数不同可以模拟 类型实在无力) 也没有union数据结构
     * 连枚举也没有(实际上用ES6的Symbol模拟枚举是一个可行性方案 但是成本略高)
     * 因此用一个数组来保存值 用val()来获取对应的值
     */
    this.val_ = new Array(6).fill(null);
    this.val_[type] = val;
    
    this.bit_field_ = NodeTypeField.update(this.bit_field_, type);
  }
  // add
  val() {
    return this.val_[this.type];
  }
  AsLiteral() {}
  IsString() {
    return this.type = kString;
  }
  AsRawString() {
    return this.val();
  }
  Hash() {
    return this.IsString() ? 
    this.AsRawString().Hash() : 
    this.ComputeLongHash(this.double_to_uint64(this.AsNumber()));
  }
  ComputeLongHash() {}
  double_to_uint64() {}
  AsNumber() {}
}

class MaterializedLiteral extends Expression {
  constructor(pos, type) {
    super(pos, type);
  }
}

class AggregateLiteral extends MaterializedLiteral {
  constructor(pos, type) {
    super(pos, type);
    this.depth_ = 0;
    this.bit_field_ |= NeedsInitialAllocationSiteField.encode(false) | IsSimpleField.encode(false);
  }
}

class ObjectLiteral extends AggregateLiteral {
 constructor(properties, boilerplate_properties, pos, has_rest_property) {
    super(pos, _kObjectLiteral);
    this.boilerplate_properties_ = boilerplate_properties;
    this.properties = properties;
    this.bit_field_ |= HasElementsField.encode(false) | 
                      HasRestPropertyField.encode(has_rest_property) | 
                      FastElementsField.encode(false) | 
                      HasNullPrototypeField.encode(false);
  }
  CalculateEmitStore(zone = null) {
    // ZoneAllocationPolicy allocator(zone);

    /**
     * 这里生成指定内存地址的一个HashMap
     */
    // let table = new HashMap();
    let table = [];
    for (const property of this.properties) {
      if (property.is_computed_name_) continue;
      if (property.IsPrototype()) continue;
      let literal = property.key_;
      let hash = literal.Hash();
      /**
       * JS的HashMap只能支持简单类型的存储
       * 干脆用数组算了 其中hash作为标记 TODO后续考虑hashmap
       */
      // let entry = table.LookupOrInsert(literal, hash);
      let entry = table.find(v => v.hash === hash);
      /**
       * 这里是为了统计对象内部实际上有多少个有效键值对
       * 1、{ a: 1, a: 2 }  重复定义
       * 2、{ a: 1, get a() {} }  覆盖定义
       */
      if (!entry) {
        table.push({ value: literal, hash });
      }
      /**
       * 如果有重复的key并不代表一定是重复定义
       */
      else {
        let later_kind = entry.value.kind_;
        let complementary_accessors = (property.kind_ === GETTER && later_kind === SETTER) ||
        (property.kind_ === SETTER && later_kind === GETTER);
        if (!complementary_accessors) {
          property.emit_store_ = false;
          if (later_kind === GETTER || later_kind === SETTER) entry.value = property;
        }
      }
    }
  }
}

class ClassLiteral extends Expression {
  constructor() {
    super();
    this.constructor_ = null;
  }
  _constructor() {
    return this.constructor_;
  }
}

class FunctionLiteral extends Expression {
  constructor(zone = null, name, ast_value_factory, scope, body, expected_property_count,
  parameter_count, function_length, function_syntax_kind, has_duplicate_parameters,
  eager_compile_hint, position, has_braces, function_literal_id, produced_preparse_data = null) {
    super();
    this.scope_ = scope;
    this.raw_name_ = null;
    this.suspend_count_ = 0;
  }
  kind() { return this.scope_.function_kind_; }
  is_anonymous_expression() {
    return this.syntax_kind() === kAnonymousExpression;
  }
  syntax_kind() {
    return FunctionSyntaxKindBits.decode(this.bit_field_);
  }
  set_raw_name() {
    this.raw_name_ = nane;
  }
  AllowsLazyCompilation() {
    return this.scope_.AllowsLazyCompilation();
  }
  CanSuspend() {
    return this.suspend_count_ > 0;
  }
}

/**
 * 下面放的是继承于ZoneObject类
 */
// The AST refers to variables via VariableProxies - placeholders for the actual
// variables. Variables themselves are never directly referred to from the AST,
// they are maintained by scopes, and referred to from VariableProxies and Slots
// after binding and variable allocation.
const kNotAssigned = 0;
const kMaybeAssigned = 1;

const kNeedsInitialization = 0;
const kCreatedInitialized = 1;
export class ZoneObject {}
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
  mode() { return VariableModeField.decode(this.bit_field_); }
  location() { return LocationField.decode(this.bit_field_); }
  set_is_used() { this.bit_field_ = NodeTypeField.update(this.bit_field_, true); }
  set_maybe_assigned() { this.bit_field_ = NodeTypeField.update(this.bit_field_, kMaybeAssigned); }
  is_parameter() { return VariableKindField.decode(this.bit_field_) === PARAMETER_VARIABLE; }

  MakeParameterNonSimple() {
    this.bit_field_ = VariableModeField.update(this.bit_field_, kLet);
    this.bit_field_ = InitializationFlagField.update(this.bit_field_, kNeedsInitialization);
  }
  static DefaultInitializationFlag(mode) { return mode === kVar ? kCreatedInitialized : kNeedsInitialization; }
};

/**
 * 
 */
class LiteralProperty extends ZoneObject {
  constructor(key, value, is_computed_name) {
    super();
    this.pointer_ = 0;
    this.key_ = key;
    this.value_ = value;
    this.is_computed_name_ = is_computed_name;
  }
  NeedsSetFunctionName() {
    // TODO
    // return this.is_computed_name_ && (this.value_.type === '')
    return false;
  }
}

class ObjectLiteralProperty extends LiteralProperty {
  constructor(ast_value_factory, key, value, is_computed_name) {
    super(key, value, is_computed_name);
    this.emit_store_ = true;
    if (!is_computed_name && key.IsString() &&
    key.AsRawString().literal_bytes_ === ast_value_factory.proto_string()) {
      this.kind_ = PROTOTYPE;
    } else if (this.value_.AsMaterializedLiteral() !== null) {
      this.kind_ = MATERIALIZED_LITERAL;
    } else if (value.IsLiteral()) {
      this.kind_ = CONSTANT;
    } else {
      this.kind_ = COMPUTED;
    }
  }
  IsPrototype() {
    return this.kind_ === PROTOTYPE;
  }
}
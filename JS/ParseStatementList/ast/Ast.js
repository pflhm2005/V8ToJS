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

  kVariableProxy,

  TARGET_FOR_ANONYMOUS,
  TARGET_FOR_NAMED_ONLY,

  kExpression,
  kBlock,
} from "../base/Const";

import {
  NodeTypeField,
  BreakableTypeField,
  IgnoreCompletionField,
  IsLabeledField,
  TokenField,
} from '../base/Util';

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
   * @returns {Literal} 字面量类
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
  IsVariableProxy() { return this.node_type() === kVariableProxy; }
  node_type() { return NodeTypeField.decode(this.bit_field_); }
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
    super(TARGET_FOR_NAMED_ONLY, kNoSourcePosition, kBlock);
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
    super(start_position, kVariableProxy);
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
}

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
     * JS既没有函数重载(参数不同可以模拟 类型实在无力) 也没有union数据结构
     * 连枚举也没有(实际上用ES6的Symbol模拟枚举是一个可行性方案 但是成本略高)
     * 因此用一个数组来保存值 用val()来获取对应的值
     */
    this.val = new Array(6).fill(null);
    this.val[type] = val;
    
    this.bit_field_ = NodeTypeField.update(this.bit_field_, type);
  }
  // add
  val() {
    return this.val[this.type];
  }
}

/**
 * 这个比较特殊
 * 放最下面了
 */
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
  set_is_used() { this.bit_field_ = NodeTypeField.update(this.bit_field_, true); }
  set_maybe_assigned() { this.bit_field_ = NodeTypeField.update(this.bit_field_, kMaybeAssigned); }

  static DefaultInitializationFlag(mode) { return mode === kVar ? kCreatedInitialized : kNeedsInitialization; }
};
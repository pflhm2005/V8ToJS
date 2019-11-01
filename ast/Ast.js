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
  _kCall,
  _kCallNew,
  _kCountOperation,
  _kUnaryOperation,
  kNoDuplicateParameters,
  kShouldLazyCompile,
  kFunctionLiteralIdTopLevel,
  _kSloppyBlockFunctionStatement,
  _kCompareOperation,
  TokenEnumList,
  _kConditional,
  _kAwait,
  _kReturnStatement,
  _kFunctionDeclaration,
  kNotAssigned,
  kNeedsInitialization,
  kCreatedInitialized,
  _kThisExpression,
  _kEmptyParentheses,
  _kAssignment,
  _kBinaryOperation,
  _kNaryOperation,
  _kSpread,
  kMaybeAssigned,
  _kIfStatement,
  _kDoWhileStatement,
  _kWhileStatement,
  _kForStatement,
  _kContinueStatement,
  _kBreakStatement,
  _kThrow,
  _kWithStatement,
  _kSwitchStatement,
  _kDebuggerStatement,
  NOT_EVAL,
  IS_POSSIBLY_EVAL,
  _kProperty,
  _kSuperCallReference,
  _kSuperPropertyReference,
} from "../enum";

import {
  NodeTypeField,
  BreakableTypeField,
  IgnoreCompletionField,
  IsLabeledField,
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
  IsParenthesizedField,
  IsAssignedField,
  MaybeAssignedFlagField,
  IsPrefixField,
  TypeField,
  OperatorField,
  CountOperationTokenField,
  AssignmentTokenField,
  SloppyBlockFunctionStatementTokenField,
  OnAbruptResumeField,
  ReturnStatementTypeField,
  ForceContextAllocationField,
  IsInRange,
  IsPossiblyEvalField,
  IsTaggedTemplateField,
} from '../util';

// 返回语句 因为被工厂方法引用同时为了规避暂时性死区 放前面
const kNormal = 0;
const kAsyncReturn = 0;

export class AstNodeFactory {
  constructor(ast_value_factory) {
    this.ast_value_factory_ = ast_value_factory;
    this.empty_statement_ = new EmptyStatement();
    this.this_expression_ = new ThisExpression();
  }
  NewVariableProxy(name, variable_kind, start_position = kNoSourcePosition) {
    return new VariableProxy(name, variable_kind, start_position);
  }
  NewVariableDeclaration(pos) {
    return new VariableDeclaration(pos);
  }
  NewFunctionDeclaration(fun, pos) {
    return new FunctionDeclaration(fun, pos);
  }

  NewConditional(condition, then_expression, else_expression, position) {
    return new Conditional(condition, then_expression, else_expression, position);
  }
  /**
   * 生成字面量对象
   * 源码这里用的是函数重载 由于有严格的类型形参 所以很舒适
   * JS无法做到完美模拟 这里手动将对应类型的枚举传入构造函数
   * @returns {Literal} 字面量类
   */
  NewTheHoleLiteral() {
    return new Literal(kTheHole, null, kNoSourcePosition);
  }
  NewUndefinedLiteral(pos) {
    return new Literal(kUndefined, null, pos);
  }
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
  NewBigIntLiteral(bigint, pos) {
    return new Literal(kBigInt, bigint, pos);
  }
  NewStringLiteral(string, pos) {
    return new Literal(kString, string, pos);
  }
  /**
   * 存在重载 在内部区分 工厂方法保持唯一
   * 3参时 构造函数会添加ast_value_factory_作为第一个参数 最后总的还是4个
   * 4参情况
   * @param {Expression*} key 
   * @param {Expression*} value 
   * @param {ObjectLiteralProperty::Kind} kind
   * @param {bool} is_computed_name
   * new (zone_) ObjectLiteral::Property(key, value, kind, is_computed_name);
   * 3参情况
   * @param {Expression*} key 
   * @param {Expression*} value 
   * @param {bool} is_computed_name
   * return new (zone_) ObjectLiteral::Property(ast_value_factory_, key, value, is_computed_name);
   */
  NewObjectLiteralProperty(...args) {
    /**
     * 两种情况下都有key、value、is_computed_name三个参数
     * 所以这里调整一下构造参数顺序 根据kind来判断是哪一个
     */
    // [ast_value_factory_, key, value, is_computed_name]
    if(args.length === 3) return new ObjectLiteralProperty(this.ast_value_factory_, ...args);
    // 修正后[kind, key, value, is_computed_name]
    return new ObjectLiteralProperty(args[2], args[0], args[1], args[3]);
  }
  NewProperty(obj, key, pos) {
    return new Property(obj, key, pos);
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
    if (op !== 'Token::INIT' && target.IsVariableProxy()) target.set_is_assigned();
    if (op === 'Token::ASSIGN' || op === 'Token::INIT') return new Assignment(kAssignment, op, target, value, pos);
    else return new CompoundAssignment(op, target, value, pos, this.NewBinaryOperation(BinaryOpForAssignment(op), target, value, pos + 1));
  }
  NewExpressionStatement(expression, pos) {
    return new ExpressionStatement(expression, pos);
  }
  NewSloppyBlockFunctionStatement(pos, variable, init) {
    return new SloppyBlockFunctionStatement(pos, variable, init, this.empty_statement_);
  }
  // ++a
  NewCountOperation(op, is_prefix, expr, pos) {
    return new CountOperation(op, is_prefix, expr, pos);
  }
  // +a
  NewUnaryOperation(op, expression, pos) {
    return new UnaryOperation(op, expression, pos);
  }
  // a+b
  NewBinaryOperation(op, left, right, pos) {
    return new BinaryOperation(op, left, right, pos);
  }
  // a+b+c...
  NewNaryOperation(op, first, initial_subsequent_size) {
    return new NaryOperation(op, first, initial_subsequent_size);
  }

  NewCompareOperation(op, left, right, pos) {
    return new CompareOperation(op, left, right, pos);
  }
  /**
   * 该方法有重载
   */
  NewBlock(ignore_completion_value, statements) {
    // 构造参数在这里基本上毫无意义
    let result = new Block(null, null, 0, ignore_completion_value);
    // result.InitializeStatements(statements, null);
    result.statement_ = statements || [];
    return result;
  }
  NewCaseClause(label, statements) {
    return new CaseClause(label, statements);
  }

  NewAwait(expression, pos) {
    if(!expression) expression = this.NewUndefinedLiteral(pos);
    return new Await(expression, pos);
  }
  /**
   * 返回各类语句
   */
  NewReturnStatement(expression, pos, end_position = kNoSourcePosition) {
    return new ReturnStatement(expression, kNormal, pos, end_position);
  }
  NewAsyncReturnStatement(expression, pos, end_position = kNoSourcePosition) {
    return new ReturnStatement(expression, kAsyncReturn, pos, end_position);
  }
  NewIfStatement(condition, then_statement, else_statement, pos) {
    return new IfStatement(condition, then_statement, else_statement, pos);
  }
  NewDoWhileStatement(labels, own_labels, pos) {
    return new DoWhileStatement(labels, own_labels, pos);
  }
  NewWhileStatement(labels, own_labels, pos) {
    return new WhileStatement(labels, own_labels, pos);
  }
  NewForStatement(labels, own_labels, pos) {
    return new ForStatement(labels, own_labels, pos);
  }
  NewContinueStatement(target, pos) {
    return new ContinueStatement(target, pos);
  }
  NewBreakStatement(target, pos) {
    return new BreakStatement(target, pos);
  }
  NewThrow(exception, pos) {
    return new Throw(exception, pos);
  }
  NewWithStatement(scope, expression, statement, pos) {
    return new WithStatement(scope, expression, statement, pos);
  }
  NewSwitchStatement(labels, tag, pos) {
    return new SwitchStatement(labels, tag, pos);
  }
  NewDebuggerStatement(pos) {
    return new DebuggerStatement(pos);
  }

  NewClassLiteralProperty(key, value, kind, is_static, is_computed_name, is_private) {
    return new ClassLiteralProperty(key, value, kind, is_static, is_computed_name, is_private);
  }
  // 返回一个函数字面量 整个JS的顶层是一个函数
  NewScriptOrEvalFunctionLiteral(scope, body, expected_property_count, parameter_count) {
    return new FunctionLiteral(null, this.ast_value_factory_.empty_string(), this.ast_value_factory_, scope,
    body, expected_property_count, parameter_count, parameter_count, kAnonymousExpression,
    kNoDuplicateParameters, kShouldLazyCompile, 0, false, kFunctionLiteralIdTopLevel);
  }
  NewFunctionLiteral(name, scope, body, expected_property_count, parameter_count,
    function_length, has_duplicate_parameters, function_type, eager_compile_hint,
    position, has_braces, function_literal_id, produced_preparse_data = null) {
    return new FunctionLiteral(null, name, this.ast_value_factory_, scope, body, expected_property_count,
      parameter_count, function_length, function_type, has_duplicate_parameters,
      eager_compile_hint, position, has_braces, function_literal_id, produced_preparse_data);
  }
  NewCall(expression, _arguments, pos, possibly_eval = NOT_EVAL) {
    return new Call(expression, _arguments, pos, possibly_eval);
  }

  NewEmptyParentheses(pos) {
    return new EmptyParentheses(pos);
  }

  // 比较特殊 处理this
  ThisExpression() {
    this.this_expression_.clear_parenthesized();
    return this.this_expression_;
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
  IsCall() { return this.node_type() === _kCall; }
  IsCallNew() { return this.node_type() === _kCallNew; }
  IsProperty() { return this.node_type() === _kProperty; }
  IsAssignment() { return this.node_type() === _kAssignment; }
  IsEmptyParentheses() { return this.node_type() === _kEmptyParentheses; }
  IsBinaryOperation() { return this.node_type() === _kBinaryOperation; }
  IsNaryOperation() { return this.node_type() === _kNaryOperation; }
  IsSpread() { return this.node_type() === _kSpread; }
  IsSuperCallReference() { return this.node_type() === _kSuperCallReference; }
  IsSuperPropertyReference() { return this.node_type() === _kSuperPropertyReference; }

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

class EmptyStatement extends Statement {
  constructor() {
    super(kNoSourcePosition, _kEmptyStatement);
  }
}

class DebuggerStatement extends Statement {
  constructor(pos) {
    super(pos, _kDebuggerStatement);
  }
}

class ExpressionStatement extends Statement {
  constructor(expression, pos) {
    super(pos, kExpressionStatement);
    this.expression_ = expression;
  }
}

class SloppyBlockFunctionStatement extends Statement {
  constructor(pos, variable, init, statement) {
    super(pos, _kSloppyBlockFunctionStatement);
    this.var_ = variable;
    this.statement_ = statement;
    this.next_ = null;
    this.bit_field_ = SloppyBlockFunctionStatementTokenField.update(this.bit_field_, init);
  }
  name() { return this.var_.raw_name(); }
  scope() { return this.var_.scope_; }
  init() { return SloppyBlockFunctionStatementTokenField.decode(this.bit_field_); }
}

// 返回语句
class JumpStatement extends Statement {
  constructor(pos, type) {
    super(pos, type);
  }
}

class ReturnStatement extends JumpStatement {
  constructor(expression, type, pos, end_position) {
    super(pos, _kReturnStatement);
    this.expression_ = expression;
    this.end_position_ = end_position;
    this.bit_field_ |= ReturnStatementTypeField.encode(type);
  }
}

class IfStatement extends Statement {
  constructor(condition, then_statement, else_statement, pos) {
    super(pos, _kIfStatement);
    this.condition_ = condition;
    this.then_statement_ = then_statement;
    this.else_statement_ = else_statement;
  }
}

class WithStatement extends Statement {
  constructor(scope, expression, statement, pos) {
    super(pos, _kWithStatement);
    this.scope_ = scope;
    this.expression_ = expression;
    this.statement_ = statement;
  }
}

class ContinueStatement extends JumpStatement {
  constructor(target, pos) {
    super(pos, _kContinueStatement);
    this.target_ = target;
  }
}

class BreakStatement extends JumpStatement {
  constructor(target, pos) {
    super(pos, _kBreakStatement);
    this.target_ = target;
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
  is_target_for_anonymous() {
    return BreakableTypeField.decode(this.bit_field_) === TARGET_FOR_ANONYMOUS;
  }
}

class SwitchStatement extends BreakableStatement {
  constructor(labels, tag, pos) {
    super(TARGET_FOR_ANONYMOUS, pos, _kSwitchStatement);
    this.labels_ = labels;
    this.tag_ = tag;
    this.cases_ = [];
  }
}

class Block extends BreakableStatement {
  constructor(zone = null, labels = null, capacity = 0, ignore_completion_value = true) {
    super(TARGET_FOR_NAMED_ONLY, kNoSourcePosition, _kBlock);
    this.statement_ = null;
    this.scope_ = null;
    this.bit_field_ |= IgnoreCompletionField.encode(Number(ignore_completion_value)) | IsLabeledField.encode(Number(labels !== null));
  }
  // 这里用的内存拷贝
  // InitializeStatements(statements, zone = null) {
  //   this.statement_ = statements;
  // }
}

// goto语法的block
class LabeledBlock extends Block {
  // 这里构造函数重载了 capacity参数后移了一位 去掉了zone参数
  constructor(labels, ignore_completion_value, capacity = 0) {
    super(labels, capacity, ignore_completion_value);
    this.labels_ = labels;
  }
}

class IterationStatement extends BreakableStatement {
  constructor(labels, own_labels, pos, type) {
    super(TARGET_FOR_ANONYMOUS, pos, type);
    this.labels_ = labels;
    this.own_labels_ = own_labels;
    this.body_ = null;
  }
}

class DoWhileStatement extends IterationStatement {
  constructor(labels, own_labels, pos) {
    super(labels, own_labels, pos, _kDoWhileStatement);
    this.cond_ = null;
  }
  Initialize(cond, body) {
    this.body_ = body;
    this.cond_ = cond;
  }
}

class WhileStatement extends IterationStatement {
  constructor(labels, own_labels, pos) {
    super(labels, own_labels, pos, _kWhileStatement);
    this.cond_ = null;
  }
  Initialize(cond, body) {
    this.body_ = body;
    this.cond_ = cond;
  }
}

class ForStatement extends IterationStatement {
  constructor(labels, own_labels, pos) {
    super(labels, own_labels, pos, _kForStatement);
    this.init_ = null;
    this.cond_ = null;
    this.next_ = null;
  }
  Initialize(init, cond, next, body) {
    this.body_ = body;
    this.init_ = init;
    this.cond_ = cond;
    this.next_ = next;
  }
}

class Declaration extends AstNode {
  constructor(pos, type) {
    super(pos, type);
    this.next_ = null;
    this.var_ = null;
  }
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

class FunctionDeclaration extends Declaration {
  constructor(fun, pos) {
    super(pos, _kFunctionDeclaration);
    this.fun_ = fun;
  }
}

export class Expression extends AstNode {
  constructor(pos, type) {
    super(pos, type);
  }
  UNIMPLEMENTED() { throw new Error('unimplemented code'); }
  UNREACHABLE() { throw new Error('unreachable code'); }
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
  is_parenthesized() {
    return IsParenthesizedField.decode(this.bit_field_);
  }
  mark_parenthesized() {
    this.bit_field_ = IsParenthesizedField.update(this.bit_field_, true);
  }
  clear_parenthesized() {
    this.bit_field_ = IsParenthesizedField.update(this.bit_field_, false);
  }
  IsNumberLiteral() { return this.IsLiteral() && (this.type() === kHeapNumber || this.type() === kSmi); }
  IsPattern() { return IsInRange(this.node_type(), _kObjectLiteral, _kArrayLiteral); }

  type() { return TypeField.decode(this.bit_field_); }
  ToBooleanIsFalse() { return !this.ToBooleanIsTrue(); }
  ToBooleanIsTrue() {
    switch(this.type()) {
      case kSmi:
        return this.val() !== 0;
      case kHeapNumber:
        return this.DoubleToBoolean(this.val());
      case kString:
        return !this.val() === '';
      case kNull:
      case kUndefined:
        return false;
      case kBoolean:
        return this.val();
      case kBigInt:
        // TODO
        return false;
      case kSymbol:
        return true;
      case kTheHole:
        this.UNREACHABLE();
    }
    this.UNREACHABLE();
  }
}

class Call extends Expression {
  constructor(expression, _arguments, pos, possibly_eval) {
    super(pos, _kCall);
    this.expression_ = expression;
    this.arguments_ = _arguments;
    this.bit_field_ |= IsPossiblyEvalField.encode(possibly_eval === IS_POSSIBLY_EVAL) | IsTaggedTemplateField.encode(false);
  }
}

class Property extends Expression {
  constructor(obj, key, pos) {
    super(pos, _kProperty);
    this.obj_ = obj;
    this.key_ = key;
  }
  IsSuperAccess() {
    return this.obj_.IsSuperPropertyReference();
  }
}

class ThisExpression extends Expression {
  constructor() {
    super(kNoSourcePosition, _kThisExpression);
  }
}

class Assignment extends Expression {
  constructor(node_type, op, target, value, pos) {
    super(pos, node_type);
    this.target_ = target;
    this.value_ = value;
    op = TokenEnumList.indexOf(op);
    this.bit_field_ |= AssignmentTokenField.encode(op);
  }
}

class Throw extends Expression {
  constructor(exception, pos) {
    super(pos, _kThrow);
    this.exception_ = exception;
  }
}

class CompoundAssignment extends Assignment {
  constructor(op, target, value, pos, binary_operation) {
    super(kCompoundAssignment, op, target, value, pos);
    // BinaryOperation* binary_operation_;
    this.binary_operation_ = binary_operation;
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
     * 因此用一个数组来保存各种类型的值 用val()来获取对应的值
     */
    this.val_ = new Array(6).fill(null);
    if(type !== kNull || val !== kUndefined || val !== kTheHole) this.val_[type] = val;
    
    this.bit_field_ = NodeTypeField.update(this.bit_field_, type);
  }
  // add
  val() {
    return this.val_[this.type];
  }
  AsLiteral() {}
  IsString() { return this.type = kString; }
  AsRawString() { return this.val(); }
  Hash() {
    return this.IsString() ? 
    this.AsRawString().Hash() : 
    this.ComputeLongHash(this.double_to_uint64(this.AsNumber()));
  }
  ComputeLongHash() {}
  double_to_uint64() {}
  AsNumber() {}
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
  set_is_resolved() { this.bit_field_ = NodeTypeField.update(this.bit_field_, 1); }
  set_is_assigned() {
    this.bit_field_ = IsAssignedField.update(this.bit_field_, 1);
    if(this.is_resolved()) this.var_.set_maybe_assigned();
  }
  set_maybe_assigned() { this.bit_field_ = MaybeAssignedFlagField.update(this.bit_field_, kMaybeAssigned); }
  is_resolved() { return IsResolvedField.decode(this.bit_field_); }
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

class Conditional extends Expression {
  constructor(condition, then_expression, else_expression, position) {
    super(position, _kConditional);
    this.condition_ = condition;
    this.then_expression_ = then_expression;
    this.else_expression_ = else_expression;
  }
}

class CountOperation extends Expression {
  constructor(op, is_prefix, expr, pos) {
    super(pos, _kCountOperation);
    this.expression_ = expr;
    op = TokenEnumList.indexOf(op);
    this.bit_field_ |= IsPrefixField.encode(is_prefix) | CountOperationTokenField.encode(op);
  }
}

class UnaryOperation extends Expression {
  constructor(op, expression, pos) {
    super(pos, _kUnaryOperation);
    this.expression_ = expression;
    op = TokenEnumList.indexOf(op);
    this.bit_field_ |= OperatorField.encode(op);
  }
}

class BinaryOperation extends Expression {
  constructor(op, left, right, pos) {
    super(pos, _kBinaryOperation);
    this.left_ = left;
    this.right_ = right;
    op = TokenEnumList.indexOf(op);
    this.bit_field_ |= OperatorField.encode(op);
  }
}

class NaryOperation extends Expression {
  constructor(op, first, initial_subsequent_size) {
    super(first.position(), _kNaryOperation);
    this.first_ = first;
    // 此处会根据initial_subsequent_size调用vector::reserve JS这边不需要这个逻辑
    this.subsequent_ = [];
    op = TokenEnumList.indexOf(op);
    this.bit_field_ |= OperatorField.encode(op);
  }
  AddSubsequent(expr, pos) {
    // vector::emplace_back
    this.subsequent_.push(new NaryOperationEntry(expr, pos));
  }
  subsequent_length() {
    return this.subsequent_.length;
  }
  subsequent_op_position() {
    return this.subsequent_[index].op_position;
  }
  subsequent(index) {
    return this.subsequent_[index].expression;
  }
}

class NaryOperationEntry {
  constructor(e, pos) {
    this.expression = e;
    this.op_position = pos;
  }
}

class CompareOperation extends Expression {
  constructor(op, left, right, pos) {
    super(pos, _kCompareOperation);
    this.left_ = left;
    this.right_ = right;
    op = TokenEnumList.indexOf(op);
    this.bit_field_ |= OperatorField.encode(op);
  }
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
       * 干脆用数组算了 其中hash作为标记 目前有歧义 无法分辨get是key还是getter
       * TODO 后续考虑hashmap
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
       * 比如说 { get: 1, get a() {} } 两个get意义不一样
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

/**
 * class内部属性的四种形态
 * class { content... }
 */
export const _METHOD = 0; // fn() {}
export const _GETTER = 0; // get fn() {}
export const _SETTER = 0; // set fn() {}
export const _FIELD = 0;  // fn = 1;

class ClassLiteral extends Expression {
  constructor() {
    super();
    this.constructor_ = null;
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
    this.body_ = body;
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

// 延迟执行的字面量类型
const kOnExceptionThrow = 0;
const kNoControl = 1;

class Suspend extends Expression {
  constructor(node_type, expression, pos, on_abrupt_resume) {
    super(pos, node_type);
    this.expression_ = expression;
    this.bit_field_ |= OnAbruptResumeField.encode(on_abrupt_resume);
  }
}

// 这个类专门处理没有参数的箭头函数
class EmptyParentheses extends Expression {
  constructor(pos) {
    super(pos, _kEmptyParentheses);
    this.mark_parenthesized();
  }
}

class Await extends Suspend {
  constructor(expression, pos) {
    super(_kAwait, expression, pos, kOnExceptionThrow);
  }
}

/**
 * 下面放的是继承于ZoneObject类
 */
// The AST refers to variables via VariableProxies - placeholders for the actual
// variables. Variables themselves are never directly referred to from the AST,
// they are maintained by scopes, and referred to from VariableProxies and Slots
// after binding and variable allocation.
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

  ForceContextAllocation() {
    this.bit_field_ = ForceContextAllocationField.update(this.bit_field_, true);
  }
  MakeParameterNonSimple() {
    this.bit_field_ = VariableModeField.update(this.bit_field_, kLet);
    this.bit_field_ = InitializationFlagField.update(this.bit_field_, kNeedsInitialization);
  }
  static DefaultInitializationFlag(mode) { return mode === kVar ? kCreatedInitialized : kNeedsInitialization; }
};

class CaseClause extends ZoneObject {
  constructor(label, statements) {
    super();
    this.label_ = label;
    this.statement_ = statements;
  }
}

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

class ClassLiteralProperty extends LiteralProperty {
  constructor(key, value, kind, is_static, is_computed_name, is_private) {
    super(key, value, is_computed_name);
    this.kind_ = kind;
    this.is_static_ = is_static;
    this.is_private_ = is_private;
    this.private_or_computed_name_var_ = null;
  }
}

class ObjectLiteralProperty extends LiteralProperty {
  constructor(ast_value_factoryOrKind, key, value, is_computed_name) {
    super(key, value, is_computed_name);
    // [kind, key, value, is_computed_name]
    if(typeof ast_value_factoryOrKind === 'number') {
      this.kind_ = ast_value_factoryOrKind;
      this.emit_store_ = true;
    }
    // [ast_value_factory_, key, value, is_computed_name]
    else {
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
  }
  IsPrototype() {
    return this.kind_ === PROTOTYPE;
  }
}
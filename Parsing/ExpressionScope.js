import { Variable, VariableProxy } from '../ast/Ast';

import {
  NORMAL_VARIABLE,

  kNoSourcePosition
} from '../enum';

import {
  IsLexicalVariableMode,
  IsInRange,
} from '../util';

import {
  kTooManyVariables,
  kLetInLexicalBinding,
} from '../MessageTemplate';
import Location from './scanner/Location';

const kExpressionIndex = 0;
const kPatternIndex = 1;
const kNumberOfErrors = 2;

const kExpression = 0;
const kMaybeArrowParameterDeclaration = 1;
const kMaybeAsyncArrowParameterDeclaration = 2;
const kParameterDeclaration = 3;
const kVarDeclaration = 4;
const kLexicalDeclaration = 5;

const kMaxNumFunctionLocals = (1 << 23) - 1;

class ExpressionScope {
  /**
   * ExpressionScope构造时做两件事
   * 1、将当前parser的expression_scope_赋值给parent_属性
   * 2、设置parser的expression_scope_为新生成的实例
   * 析构时会将parent_赋值给parser_的expression_scope_
   * 因此这里会形成一个scope链
   * JS无法模拟析构 头疼
   */
  constructor(parser, type) {
    this.parser_ = parser;
    this.parent_ = parser.expression_scope_;
    this.type_ = type;
    parser.expression_scope_ = this;
  }
  CanBeParameterDeclaration() {
    return IsInRange(this.type_, kMaybeArrowParameterDeclaration, kParameterDeclaration);
  }
  CanBeExpression() {
    return IsInRange(this.type_, kExpression, kMaybeAsyncArrowParameterDeclaration);
  }
  CanBeDeclaration() {
    return IsInRange(this.type_, kMaybeArrowParameterDeclaration, kLexicalDeclaration);
  }
  IsVarDeclaration() { return this.type_ === kVarDeclaration; }
  IsLexicalDeclaration() { return this.type_ === kLexicalDeclaration; }
  IsCertainlyDeclaration() { return IsInRange(this.type_, kParameterDeclaration, kLexicalDeclaration); }
  /**
   * 下面三个方法 源码将类向下强转类型
   * JS做不到 不搞了
   */
  AsExpressionParsingScope() { return new ExpressionParsingScope(this.parser_, this.type_); }
  AsParameterDeclarationParsingScope(parser) { return new ParameterDeclarationParsingScope(parser); }
  AsVariableDeclarationParsingScope(parser, mode, names) { return new VariableDeclarationParsingScope(parser, mode, names); }

  /**
   * 生成一个VariableProxy与一个Variable并进行绑定
   * @returns {VariableProxy}
   */
  NewVariable(name, pos) {
    /**
     * 生成一个新的VariableProxy实例
     * 为了方便 这里省去中间步骤
     */
    // let result = this.parser_.NewRawVariable(name, pos);
    let result = new VariableProxy(name, NORMAL_VARIABLE, pos);
    /**
     * 当右值是复杂表达式时 需要进行完整的解析 例如let a = (1 + 1);
     * 所以这里先将声明部分放入待完成容器中
     */
    if (this.CanBeExpression()) {
      new ExpressionParsingScope().TrackVariable(result);
    }
    // 简单的单值赋值语句
    else {
      /**
       * 源码变量名是var JS这里要改一下
       * 可以直接跳去看this.parser_.DeclareVariable
       * 需要注意的是 这里优先调用子类的Declare方法
       * @returns {VariableDeclaration}
       */
      let variable = this.Declare(name, pos);
      // var声明语句且当前作用域不是函数作用域
      if (this.IsVarDeclaration() && !this.parser_.scope_.is_declaration_scope()) {
        this.parser_.scope_.AddUnresolved(result);
      } else {
        result.BindTo(variable);
      }
    }
    return result;
  }
  /**
   * 默认情况不会进这个方法
   * 基本上都有确定的expression_scope_实例
   */
  Declare(name, pos = kNoSourcePosition) {
    if (this.type_ === kParameterDeclaration) {
      return new ParameterDeclarationParsingScope(this.parser_).Declare(name, pos);
    }
    return new VariableDeclarationParsingScope(this.parser_, this.mode_, this.names_).Declare(name, pos);
  }
}

export class ExpressionParsingScope extends ExpressionScope {
  constructor(parser, type = kExpression) {
    super(parser, type);
    this.variable_list_ = parser.variable_buffer_;
    this.messages_ = [null, null];
    this.locations_ = [null, null];
    this.clear(kExpressionIndex);
    this.clear(kPatternIndex);
    this.verified_ = false;
  }
  clear(index) {
    this.messages_[index] = ''; // MessageTemplate::kNone 与已有名冲突 这里直接设置空字符串
    this.locations_[index] = new Location().invalid();
  }

  ValidateExpression() { this.Validate(kExpressionIndex); }
  ValidatePattern() { this.Validate(kPatternIndex); }
  is_valid(index) { return !this.locations_[index].IsValid(); }

  Validate(index) {
    if (!this.is_valid(index)) throw new Error('ExpressionParsingScope');
    this.verified_ = true;
  }
  TrackVariable(variable) {
    if (!this.CanBeDeclaration()) {
      this.parser_.scope_.AddUnresolved(variable);
    }
    this.variable_list_.push(variable);
  }

  MarkIdentifierAsAssigned() {
    if(this.variable_list_.length === 0) return;
    this.variable_list_[this.variable_list_.length - 1].set_is_assigned();
  }
}

export class VariableDeclarationParsingScope extends ExpressionScope {
  constructor(parser, mode, names) {
    super(parser, IsLexicalVariableMode(mode) ? kLexicalDeclaration : kVarDeclaration);
    this.mode_ = mode;
    this.names_ = names || [];
  }
  /**
   * 回一个AstNode
   * name是标识符
   * @returns {VariableDeclaration}
   */
  Declare(name, pos) {
    let kind = NORMAL_VARIABLE;
    // was_added标记是否成功添加HashMap 即第一次声明该变量
    let { was_added, variable } = this.parser_.DeclareVariable(name, kind, this.mode_, 
      Variable.DefaultInitializationFlag(this.mode_), this.parser_.scope_, false, pos);
    if (this.names_) this.names_.push(name);
    /**
     * 一个作用域最多可声明2^23 - 1个变量
     * 下面的代码可以不用关心 全是错误处理
     */
    if (was_added && this.parser_.scope_.num_var() > kMaxNumFunctionLocals) {
      throw new Error(kTooManyVariables);
    }
    if (this.IsLexicalDeclaration()) {
      // 所有关键词的字符串已经在map表中 直接做对比
      if (this.parser_.IsLet(name.literal_bytes_)) {
        throw new Error(kLetInLexicalBinding);
      }
    } else {}
    return variable;
  }
}

export class ParameterDeclarationParsingScope extends ExpressionScope {
  constructor(parser) {
    super(parser, kParameterDeclaration);
    this.duplicate_loc_ = new Location().invalid();
  }
  has_duplicate() {
    return this.duplicate_loc_.IsValid();
  }
  duplicate_location() {
    return this.duplicate_loc_;
  }
}

/**
 * 这个类纯粹就是用来管理错误的
 */
export class AccumulationScope {
  constructor(scope) {
    this.messages_ = [null, null];
    this.locations_ = [null, null];
    this.scope_ = null;
    if (!scope.CanBeExpression()) return;
    this.scope_ = scope.AsExpressionParsingScope();
    // for (let i = 0; i < kNumberOfErrors; i++) {
    //   if (!this.scope_.is_valid(i)) {
    //     this.scope_ = null;
    //     break;
    //   }
    //   this.copy(i);
    // }
  }
  Accumulate() {
    if (this.scope_ === null) return;
  }
  copy(entry) {
    this.messages_[entry] = this.scope_.messages_[entry];
    this.locations_[entry] = this.scope_.locations_[entry];
  }
}
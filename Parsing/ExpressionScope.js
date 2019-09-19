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
  /**
   * 下面三个方法 源码将类向下强转类型
   * JS做不到 不搞了
   */
  AsExpressionParsingScope() { return new ExpressionParsingScope(this.parser_, this.type_).TrackVariable(); }
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
       * @returns {VariableDeclaration}
       */
      let variable = this.Declare(name, pos);
      // var声明语句
      if (this.IsVarDeclaration() && !this.parser_.scope_.is_declaration_scope()) {
        this.parser_.scope_.AddUnresolved(result);
      } else {
        result.BindTo(variable);
      }
    }
    return result;
  }
  /**
   * 当type_确定时 此时的向下强转不存在参数丢失问题
   * 这里分为变量的赋值与声明赋值
   * 即let a = 1、function fn(a = 1) {}
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
    this.variable_list_ = [];
    this.messages_ = [null, null];
    this.locations_ = [null, null];
  }
  ValidateExpression() { this.Validate(kExpressionIndex); }
  is_valid(index) { return !locations_[index].IsValid(); }
  Validate(index) {
    if (!is_valid(index)) RTCStatsReport(index);
    this.mark_verified();
  }
  TrackVariable(variable) {
    if (!this.CanBeDeclaration()) {
      this.parser_.scope_.AddUnresolved(variable);
    }
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
    // 标记是否成功添加HashMap 即第一次声明该变量
    let was_added = false;
    let variable = this.parser_.DeclareVariable(name, kind, this.mode_, 
      Variable.DefaultInitializationFlag(this.mode_), this.parser_.scope_, was_added, pos);
    if (this.names_) this.names_.push(name);
    /**
     * 一个作用域最多可声明2^23 - 1个变量
     * 下面的代码可以不用关心 全是错误处理
     */
    if (this.was_added && this.parser_.scope_.num_var() > kMaxNumFunctionLocals) {
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
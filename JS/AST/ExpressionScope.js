import { Variable } from './AST';

import {
  kLastLexicalVariableMode,

  kVarDeclaration,
  kLexicalDeclaration,

  kExpression,
  kMaybeArrowParameterDeclaration,
  kMaybeAsyncArrowParameterDeclaration,
  kParameterDeclaration,
  kVarDeclaration,
  kLexicalDeclaration,
} from './Const';

import {
  IsLexicalVariableMode,
  IsInRange,
} from './Util';

import {
  kTooManyVariables,
} from './MessageTemplate';

const kNoSourcePosition = -1;

const kMaxNumFunctionLocals = (1 << 23) - 1;

class ExpressionScope {
  constructor(parser, type) {
    this.parser_ = parser;
    this.parent_ = parser_.expression_scope_;
    this.type_ = type;
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
   * JS做不到 只能取巧
   */
  AsExpressionParsingScope() {
    return new ExpressionParsingScope(this.parser_, this.type_).TrackVariable();
  }
  AsParameterDeclarationParsingScope(parser) {
    return new ParameterDeclarationParsingScope(parser);
  }
  AsVariableDeclarationParsingScope(parser, mode, names) {
    return new VariableDeclarationParsingScope(parser, mode, names);
  }

  NewVariable(name, pos) {
    // 生成一个新的VariableProxy实例
    let result = this.parser_.NewRawVariable(name, pos);
    /**
     * 当右值是复杂表达式时 需要进行完整的解析 例如let a = (1 + 1);
     * 所以这里先将声明部分放入待完成容器中
     */
    if(this.CanBeExpression()) {
      this.AsExpressionParsingScope().TrackVariable(result);
    }
    // 简单的单值赋值
    else {
      /**
       * 源码变量名是var JS这里要改一下
       * 
       */
      let variable = this.Declare(name, pos);
      // var声明语句
      if(this.IsVarDeclaration() && !this.parser_.scope().is_declaration_scope()) {
        this.parser_.scope().AddUnresolved(result);
      } else {
        result.BindTo(variable);
      }
    }
    return result;
  }
  /**
   * 当type_确定时 此时的向下强转不存在参数丢失问题
   */
  Declare(name, pos = kNoSourcePosition) {
    if(this.type_ === kParameterDeclaration) {
      return this.AsParameterDeclarationParsingScope(this.parser_).Declare(name, pos);
    }
    return this.AsVariableDeclarationParsingScope(this.parser_, this.mode_, this.names_).Declare(name, pos);
  }
}

class ExpressionParsingScope extends ExpressionScope {
  constructor(parser, type = kExpression) {
    super(parser, type);
    this.variable_list_ = [];
  }
  TrackVariable(variable) {
    if(!this.CanBeDeclaration()) {
      this.parser_.scope().AddUnresolved(variable);
    }
  }
}

export class VariableDeclarationParsingScope extends ExpressionScope {
  constructor(parser, mode, names) {
    super(parser, IsLexicalVariableMode(mode) ? kLexicalDeclaration : kVarDeclaration);
    this.mode_ = mode;
    this.names_ = names;
  }
  /**
   * 这个子类只有一个方法
   * 还不如干脆当成静态方法调用
   */
  Declare(name, pos) {
    let kind = NORMAL_VARIABLE;
    // 标记是否成功添加HashMap 即第一次声明该变量
    let was_added = false;
    let variable = this.parser_.DeclareVariable(name, kind, this.mode_, 
      Variable.DefaultInitializationFlag(this.mode_), this.parser_.scope(), was_added, pos);
    // 一个作用域最多可声明2^23 - 1个变量
    if(this.was_added && this.parser_.scope().num_var() > kMaxNumFunctionLocals) {
      throw new Error(kTooManyVariables);
    }
    if(this.names_) this.names_.Add(name, this.parser_.zone());
    if(this.IsLexicalDeclaration()) {
      if(this.parser_.IsLet(name)) {
        
      }
    }
  }
}

class ParameterDeclarationParsingScope extends ExpressionScope {}
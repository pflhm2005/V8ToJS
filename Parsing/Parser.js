import ParserBase from './ParserBase';
import FunctionState from './function/FunctionState';

import {
  PARSE_EAGERLY,
  kNoSourcePosition,
  kUseCounterFeatureCount,
  kVar,
  PARAMETER_VARIABLE,
  kSloppyModeBlockScopedFunctionRedefinition,
  kWrapped,
  kShouldEagerCompile,
  kShouldLazyCompile,
  PARSE_LAZILY,
  kSloppyMode,
  kStrictMode,
  kIncludingVariables,
  kYes,
  kBlock,
  kNamedExpression,
  kConst,
  NORMAL_VARIABLE,
  kCreatedInitialized,
  SLOPPY_BLOCK_FUNCTION_VARIABLE,
  kUseAsm,
  kMaxArguments,
  kSloppy,
  _kVariableProxy,
  kNoDuplicateParameters,
  REFLECT_APPLY_INDEX,
  kInlineGetImportMetaObject,
} from '../enum';

import {
  kParamDupe,
  kVarRedeclaration,
  kArgStringTerminatesParametersEarly,
  kUnexpectedEndOfArgString,
  kTooManyParameters,
  kParamAfterRest,
  kMalformedArrowFunParamList
} from '../MessageTemplate';
import { is_strict, is_sloppy, IsDerivedConstructor, IsGetterFunction, IsSetterFunction, Divide, DoubleToInt32, ShlWithWraparound, DoubleToUint32 } from '../util';
import ParserFormalParameters from './function/ParserFormalParameters';
import { ParameterDeclarationParsingScope } from './ExpressionScope';
import Parameter from './function/Parameter';
import { Declaration } from './DeclarationParsingResult';
import { Variable } from '../ast/Ast';


/**
 * 源码中的Parser类作为模板参数impl作为模板参数传入ParseBase 同时也继承于该类
 * class Parser : public ParserBase<Parser>
 * template <typename Impl> class ParserBase {...}
 * Parser、ParserBase基本上是一个类
 */
class Parser extends ParserBase {
  constructor(info) {
    super(null, info.scanner_, info.stack_limit_, info.extension_, info.ast_value_factory_,
      info.pending_error_handler_, info.runtime_call_stats_, info.logger_, 0, info.is_module(), true);
    this.info_ = info;
    // this.scanner = info.scanner_;
    this.preparser_zone_ = null;
    this.reusable_preparser_ = null;
    this.mode_ = PARSE_EAGERLY; // Lazy mode must be set explicitly.
    this.source_range_map_ = null;
    this.target_stack_ = null;
    this.total_preparse_skipped_ = 0;
    this.consumed_preparse_data_ = info.consumed_preparse_data_;
    this.preparse_data_buffer_ = null;
    this.parameters_end_pos_ = kNoSourcePosition;

    let can_compile_lazily = info.allow_lazy_compile() && !info.is_eager();
    this.default_eager_compile_hint_ = can_compile_lazily ? kShouldLazyCompile : kShouldEagerCompile;
    this.allow_lazy_ = info.allow_lazy_compile() && info.allow_lazy_parsing() && info.extension_ === null && can_compile_lazily;
    this.allow_natives_ = info.allow_natives_syntax();
    this.allow_harmony_dynamic_import_ = info.allow_harmony_dynamic_import();
    this.allow_harmony_import_meta_ = info.allow_harmony_import_meta();
    this.allow_harmony_nullish_ = info.allow_harmony_nullish();
    this.allow_harmony_optional_chaining_ = info.allow_harmony_optional_chaining();
    this.allow_allow_harmony_private_methods_ = info.allow_harmony_private_methods();
    this.use_counts_ = new Array(kUseCounterFeatureCount).fill(0);
  }
  ParseProgram(isolate, info) {
    // let runtime_timer = new RuntimeCallTimerScope(this.runtime_call_stats_, info.is_eval() ? )
    // 初始化顶层作用域
    this.DeserializeScopeChain(isolate, info, info.maybe_outer_scope_info_, kIncludingVariables);
    this.scanner_.Initialize();
    let result = this.DoParseProgram(isolate, info);

    // MaybeResetCharacterStream(info, result);
    // MaybeProcessSourceRanges(info, result, stack_limit_);
    // HandleSourceURLComments(isolate, info->script());
    return result;
  }
  DoParseProgram(isolate, info) {
    /**
     * 源码如下
     * ParsingModeScope mode(this, allow_lazy_ ? PARSE_LAZILY : PARSE_EAGERLY);
     * 这里重新设置了mode_属性 改成了懒编译
     * 利用ParsingModeScope的构造与析构缓存了当前mode 作用域结束后还原
     */
    let old_mode_ = this.mode_;
    this.mode_ = this.allow_lazy_ ? PARSE_LAZILY : PARSE_EAGERLY;
    this.ResetFunctionLiteralId();
    let result = null;
    {
      let outer = this.original_scope_;
      if (info.is_eval()) outer = this.NewEvalScope(outer);
      else if (this.parsing_module_) outer = this.NewModuleScope(info.script_scope_);
      // C++赋值深拷贝
      let scope = outer;
      scope.set_start_position(0);
      /**
       * C++空指针nullptr依然是引用传递 不同于JS的null
       * 有时候变量会在我不注意时初始化
       * 比如这里的参数是作为引用传递进去 顺便被初始化了
       */
      let outer_scope_ = this.scope_;
      this.scope_ = scope;
      this.function_state_ = new FunctionState(null, this.scope_, scope);
      // 这里暂时不知道是新的内存空间还是旧的
      let body = [];
      if (this.parsing_module_) { }
      else if (info.is_wrapped_as_function()) this.ParseWrapped(isolate, info, body, scope, null);
      else {
        this.scope_.set_language_mode(info.is_strict_mode());
        this.ParseStatementList(body, 'Token::EOS');
      }

      this.scope_.end_position_ = this.peek_position();

      let parameter_count = this.parsing_module_ ? 1 : 0;
      result = this.ast_node_factory_.NewScriptOrEvalFunctionLiteral(scope, body, this.function_state_.expected_property_count_, parameter_count);
      result.suspend_count_ = this.function_state_.suspend_count_;

      // 析构
      this.scope_ = outer_scope_;
    }

    // info.max_function_literal_id_ = this.function_literal_id_;
    // RecordFunctionLiteralSourceRange(result);
    // 析构
    this.mode_ = old_mode_;
    return result;
  }
  DeserializeScopeChain(isolate, info, maybe_outer_scope_info_, mode) {
    this.InitializeEmptyScopeChain(info);
    // this.original_scope_ = Scope.DeserializeScopeChain(isolate, null, maybe_outer_scope_info_, info.script_scope_, this.ast_value_factory_, mode);
  }
  InitializeEmptyScopeChain(info) {
    let script_scope = this.NewScriptScope();
    info.script_scope_ = script_scope;
    this.original_scope_ = script_scope;
  }
  ParseWrapped() { }

  parse_lazily() { return this.mode_ === PARSE_LAZILY; }
  // 判断是否可以懒编译这个函数字面量
  AllowsLazyParsingWithoutUnresolvedVariables() {
    return this.scope_.AllowsLazyParsingWithoutUnresolvedVariables(this.original_scope_);
  }

  // RecordFunctionLiteralSourceRange(node) {
  //   if(this.source_range_map_ === null) return;
  //   this.source_range_map_.Insert(node, new FunctionLiteralSourceRanges);
  // }

  IsName(identifier) { return identifier.literal_bytes_ === this.ast_value_factory_.name_string(); }
  IsEval(identifier) { return identifier.literal_bytes_ === this.ast_value_factory_.eval_string(); }
  IsConstructor(identifier) { return identifier.literal_bytes_ === this.ast_value_factory_.constructor_string(); }
  IsArguments(identifier) { return identifier.literal_bytes_ === this.ast_value_factory_.arguments_string(); }
  IsEvalOrArguments(identifier) { return this.IsEval(identifier) || this.IsArguments(identifier); }
  IsNative(expr) { return expr.IsVariableProxy() && expr.raw_name() === this.ast_value_factory_.native_string(); }
  /**
   * 判断当前的expression是不是通过let const var声明的标识符
   * @param {Expression}} expression 
   */
  IsIdentifier(expression) {
    if (expression.node_type() === _kVariableProxy) return !expression.is_new_target();
    return false;
  }
  IsThisProperty(expression) {
    return expression !== null && expression.obj_.IsThisExpression();
  }
  CheckAssigningFunctionLiteralToProperty(left, right) {
    if (left.IsProperty() && right.IsFunctionLiteral()) {
      right.set_pretenure();
    }
  }
  IsStringLiteral(statement, arg = null) {
    if (statement === null) return false;
    let literal = statement.expression_;
    if (literal === null || !literal.IsString()) return false;
    return arg === null || literal.AsRawString() === arg;
  }
  ParsingDynamicFunctionDeclaration() {
    return this.parameters_end_pos_ !== kNoSourcePosition;
  }

  /**
   * 两个数字字面量的运算直接进行整合
   * 例如 1 + 2 => 输出3个数字字面量
   */
  ShortcutNumericLiteralBinaryExpression(x, y, op, pos) {
    if (x.IsNumberLiteral() && y.IsNumberLiteral()) {
      let x_val = x.val();
      let y_val = y.val();
      switch (op) {
        case 'Token:ADD':
          x = this.ast_node_factory_.NewNumberLiteral(x_val + y_val, pos);
          return true;
        case 'Token::SUB':
          x = this.ast_node_factory_.NewNumberLiteral(x_val - y_val, pos);
          return true;
        case 'Token::MUL':
          x = this.ast_node_factory_.NewNumberLiteral(x_val * y_val, pos);
          return true;
        case 'Token::DIV':
          x = this.ast_node_factory_.NewNumberLiteral(Divide(x_val, y_val), pos);
          return true;
        case 'Token::BIT_OR': {
          let value = DoubleToInt32(x_val) | DoubleToInt32(y_val);
          x = this.ast_node_factory_.NewNumberLiteral(value, pos);
          return true;
        }
        case 'Token::BIT_ADD': {
          let value = DoubleToInt32(x_val) & DoubleToInt32(y_val);
          x = this.ast_node_factory_.NewNumberLiteral(value, pos);
          return true;
        }
        case 'Token::BIT_XOR': {
          let value = DoubleToInt32(x_val) ^ DoubleToInt32(y_val);
          x = this.ast_node_factory_.NewNumberLiteral(value, pos);
          return true;
        }
        case 'Token::SHL': {
          let value = ShlWithWraparound(DoubleToInt32(x_val), DoubleToInt32(y_val));
          x = this.ast_node_factory_.NewNumberLiteral(value, pos);
          return true;
        }
        case 'Token::SHR': {
          let shift = DoubleToInt32(y_val) & 0x1f;
          let value = DoubleToUint32(x_val) >> shift;
          x = this.ast_node_factory_.NewNumberLiteral(value, pos);
          return true;
        }
      }
    }
    return false;
  }
  CollapseNaryExpression(x, y, op, pos) {

  }

  EmptyIdentifierString() { return this.ast_value_factory_.empty_string(); }
  NullExpression() { return Object.create(null); }
  NullIdentifier() { return Object.create(null); }

  NewTemporary(name) { return this.scope_.NewTemporary(name); }
  NewThrowStatement(exception, pos) {
    return this.ast_node_factory_.NewExpressionStatement(this.ast_node_factory_.NewThrow(exception, pos), pos);
  }

  ImportMetaExpression(pos) {
    let args = [];
    return this.ast_node_factory_.NewCallRuntime(kInlineGetImportMetaObject, args, pos);
  }

  GetIdentifier() { return this.GetSymbol(); }
  GetSymbol() { return this.scanner_.CurrentSymbol(this.ast_value_factory_); }

  SetAsmModule() {
    ++this.use_counts_[kUseAsm];
    this.scope_.is_asm_module_ = true;
    this.info_.set_contains_asm_module(true);
  }
  /**
   * 这个方法的实现太复杂 简化处理
   */
  GetNumberAsSymbol() {
    // 进行数字解析 非数字返回NaN(内部表现是大整数 可被系统api识别为特殊宏名)
    let double_value = this.scanner_.DoubleValue();
    // let array = [];
    // 调用了系统API对返回的数字进行处理 => FPCLASSIFY_NAMESPACE::fpclassify
    let string = DoubleToCString(double_value);
    return this.ast_value_factory_.GetOneByteString(string);
  }
  // GetDefaultStrings(default_string, dot_default_string) {
  //   default_string = this.ast_value_factory_.default_string();
  //   dot_default_string = this.ast_value_factory_.dot_default_string();
  // }

  PushEnclosingName(name) {
    this.fni_.PushEnclosingName(name);
  }
  PushPropertyName(expression) {
    if (expression.IsPropertyName()) {
      this.fni_.PushLiteralName(expression.AsRawPropertyName());
    } else {
      this.fni_.PushLiteralName(this.ast_value_factory_.computed_string());
    }
  }
  AddFunctionForNameInference(func_to_infer) {
    this.fni_.AddFunction(func_to_infer);
  }

  /**
   * 这个方法处理运算符+表达式的语句
   * 比如说+1,!function(){return false}
   * @param {Expression} expression 表达式
   * @param {Token} op Token
   * @param {int} pos 
   */
  BuildUnaryExpression(literal, op, pos) {
    /**
     * 这里C++做了一个强制转换
     * const Literal* literal = expression->AsLiteral();
     * 只是利用了bit_field_属性
     * 把这些特殊方法直接放到公共父类expression上
     */
    if (literal !== null) {
      if (op === 'Token::NOT') return this.ast_node_factory_.NewBooleanLiteral(literal.ToBooleanIsFalse(), pos);
      // 处理数字字面量
      else if (literal.IsNumberLiteral()) {
        // double value = literal->AsNumber(); 又做了一次转换
        switch (op) {
          case 'case Token::ADD':
            return literal;
          case 'Token::SUB':
            return this.ast_node_factory_.NewNumberLiteral(-value, pos);
          case 'Token::BIT_NOT':
            return this.ast_node_factory_.NewNumberLiteral(~this.DoubleToInt32(literal), pos);
          default:
            break;
        }
      }
    }
    return this.ast_node_factory_.NewUnaryOperation(op, expression, pos);
  }
  // 突然发现这里的参数是从0开始计数 有点蒙
  ExpressionListToExpression(args) {
    let expr = args[0];
    if (args.length === 1) return expr;
    if (args.length === 2) {
      return this.ast_node_factory_.NewBinaryOperation('Token::COMMA', expr, args[1], args[1].position());
    }
    let result = this.ast_node_factory_.NewNaryOperation('Token::COMMA', expr, args.length - 1);
    for (let i = 0; i < args.length; i++) {
      result.AddSubsequent(args[i], args[i].position());
    }
    return result;
  }
  /**
   * 过程总结如下：
   * 1、生成一个VariableProxy实例(继承于Expressio) 
   * 该类负责管理VariableDeclaration 并记录了变量是否被赋值、是否被使用等等
   * 2、生成一个VariableDeclaration实例(继承于AstNode)
   * 该类管理Variable 并描述了变量的位置、声明类型(变量、参数、表达式)等
   * 3、在合适的Scope中生成一个Variable实例 插入到Map中
   * 该类描述了变量的作用域、名称等等
   * 
   * 整个过程有如下细节
   * (1)有两种情况下 该声明会被标记为unresolved丢进一个容器
   * 第一是赋值右值为复杂表达式 复杂表达式需要重新走Parse的完整解析
   * 例如let a = '123'.split('').map(v => v ** 2);
   * 第二种情况是var类型的声明 由于需要向上搜索合适的作用域 声明需要后置处理
   * (2)let、const与var生成的AstNode类型不一致 var属于NestedVariable({var a=1;{var a=2;}})
   * (3)有一个作用域链 类似于原型链 从里向外通过outer_scope属性(类似于__proto__)连着
   * (4)var类型的声明会向上一直搜索is_declaration_scope_为1的作用域
   * (5)由于检测到了赋值运算符 所以这里的变量属性都会被标记可能被赋值
   * @returns {Expression}
   */
  ExpressionFromIdentifier(name, start_position, infer = kYes) {
    // 
    if (infer === kYes) {
      this.fni_.PushVariableName(name);
    }
    // 在当前的作用域下生成一个新的变量
    return this.expression_scope_.NewVariable(name, start_position);
  }
  DeclareIdentifier(name, start_position) {
    return this.expression_scope_.Declare(name, start_position);
  }
  DeclareCatchVariableName(scope, name) {
    return scope.DeclareCatchVariableName(name);
  }
  DeclareBoundVariable(name, mode, pos) {
    let proxy = this.ast_node_factory_.NewVariableProxy(name, NORMAL_VARIABLE, this.position());
    let { variable } = this.DeclareVariable(name, NORMAL_VARIABLE, mode, Variable.DefaultInitializationFlag(mode),
      this.scope_, false /* was_added */, pos, this.end_position());
    proxy.BindTo(variable);
    return proxy;
  }
  DeclareAndBindVariable(proxy, kind, mode, init, scope, was_added, begin, end) {
    let variable = this.DeclareVariable(proxy.raw_name(), kind, mode, init, scope, was_added, begin, end);
    proxy.BindTo(variable);
  }
  DeclareVariable(name, kind, mode, init, scope, was_added_params, begin, end = kNoSourcePosition) {
    let declaration;
    // var声明的变量需要提升
    if (mode === kVar && !scope.is_declaration_scope_) {
      declaration = this.ast_node_factory_.NewNestedVariableDeclaration(scope, begin);
    }
    /**
     * let、const 声明
     * 这里才是返回一个VariableDeclaration实例
     * 即new VariableDeclaration(begin)
     */
    else {
      declaration = this.ast_node_factory_.NewVariableDeclaration(begin);
    }
    let was_added = this.Declare(declaration, name, kind, mode, init, scope, was_added_params.begin, end);
    return { variable: declaration.var_, was_added };
  }
  Declare(declaration, name, variable_kind, mode, init, scope, was_added_params, var_begin_pos, var_end_pos) {
    // 这两个参数作为引用传入方法 JS只能用这个操作了
    let local_ok = true;
    // bool sloppy_mode_block_scope_function_redefinition = false;
    // 普通模式下 在作用域内容重定义
    let { was_added, sloppy_mode_block_scope_function_redefinition } = scope.DeclareVariable(
      declaration, name, var_begin_pos, mode, variable_kind, init, was_added_params,
      false, true);
    // 下面代码大部分情况不会走
    if (!local_ok) {
      // 标记错误地点 end未传入时仅仅高亮start一个字符
      let loc = new Location(var_begin_pos, var_end_pos !== kNoSourcePosition ? var_end_pos : var_begin_pos + 1);
      if (variable_kind === PARAMETER_VARIABLE) throw new Error(loc, kParamDupe);
      else throw new Error(loc, kVarRedeclaration);
    }
    // 重定义计数
    else if (sloppy_mode_block_scope_function_redefinition) {
      ++this.use_counts_[kSloppyModeBlockScopedFunctionRedefinition];
    }
    return was_added;
  }

  /**
   * 返回初始化表达式 处理for in、for of、let、var、const
   * @returns {Statement}
   */
  BuildInitializationBlock(parsing_result) {
    /**
     * ScopedPtrList就是一个高级数组 先不实现了
     * ScopedPtrList<Statement> statements(pointer_buffer());
     */
    // let len = this.pointer_buffer_.length;
    let statements = [];
    let decls = parsing_result.declarations;
    for (const declaration of decls) {
      // 这里的initializer是声明的初始值 跳过所有声明未定义
      if (!declaration.initializer) continue;
      // 这里第二个参数是parsing_result.descriptor.kind 但是没有使用
      this.InitializeVariables(statements, declaration);
    }
    let result = this.ast_node_factory_.NewBlock(true, statements);
    // 析构
    // this.pointer_buffer_.length = len;
    return result;
  }
  InitializeVariables(statements, declaration) {
    let pos = declaration.value_beg_pos;
    if (pos === kNoSourcePosition) pos = declaration.initializer.position_;
    let assignment = this.ast_node_factory_.NewAssignment('Token::INIT', declaration.pattern, declaration.initializer, pos);
    statements.push(this.ast_node_factory_.NewExpressionStatement(assignment, pos));
  }

  /**
   * 解析函数参数与函数体 分为三种结构
   * 1、普通函数 '(' FormalParameterList? ')' '{' FunctionBody '}'
   * 2、Getter函数 '(' ')' '{' FunctionBody '}'
   * 3、Setter函数 '(' PropertySetParameterList ')' '{' FunctionBody '}'
   * @param {AstRawString*} function_name 函数名
   * @param {Location} function_name_location 函数位置 这是一个对象
   * @param {FunctionNameValidity} function_name_validity 函数名是否是保留字
   * @param {FunctionKind} kind 函数类型 分为普通函数、对象简写方法、class的函数属性
   * @param {int} function_token_pos 当前位置点
   * @param {FunctionType} function_type 声明类型(kDeclaration)
   * @param {LanguageMode} language_mode 当前作用域是否是严格模式
   * @param {ZonePtrList} arguments_for_wrapped_function null
   * @returns {FunctionLiteral} 返回一个函数字面量
   */
  ParseFunctionLiteral(function_name, function_name_location, function_name_validity,
    kind, function_token_pos, function_type, language_mode, arguments_for_wrapped_function) {
    /**
     * 难道是(function(){}) ???
     */
    let is_wrapped = function_type === kWrapped;
    let pos = function_token_pos === kNoSourcePosition ? this.peek_position() : function_type;
    // 匿名函数传进来是null 给设置一个空字符串
    let should_infer_name = function_name === null;
    if (should_infer_name) function_name = this.ast_value_factory_.empty_string();
    /**
     * 标记该函数是否应该被立即执行
     * !function(){}、+function(){}、IIFE等等
     * 默认懒编译
     */
    let eager_compile_hint = this.function_state_.next_function_is_likely_called_ ||
      is_wrapped ? kShouldEagerCompile : this.default_eager_compile_hint_;

    /**
     * 有些函数在解析(抽象语法树生成阶段)阶段就需要被提前编译 比如说IIFE
     * 其余的函数则是懒编译 只做抽象语法树的解析
     * 判断是否懒编译有以下几个条件
     * 1、开发者没有禁用这个功能
     * 2、外部作用域必须允许内部函数的懒编译
     * 3、函数表达式之前不能有左括号 这可能是一个IIFE的暗示
     * 
     * 顶层作用域的函数与内部作用域的函数在懒编译的处理上不一样
     * 因为存在着变量提升的可能 比如下面的案例
     * (function foo() { bar = function() { return 1; } })()
     * 此时foo会被立即解析编译 bar则稍微才会被解析
     */
    let is_lazy = eager_compile_hint === kShouldLazyCompile;
    // 判断是否是顶级作用域
    let is_top_level = this.scope_.AllowsLazyParsingWithoutUnresolvedVariables(this.original_scope_);
    let is_eager_top_level_function = !is_lazy && is_top_level;
    let is_lazy_top_level_function = is_lazy && is_top_level;
    let is_lazy_inner_function = is_lazy && !is_top_level;

    /**
     * 判定是否可以懒解析内部函数
     * 前提条件如下
     * 1、Lazy compilation功能开启
     * 2、禁止声明native函数
     * 3、...
     */
    let should_preparse_inner = this.parse_lazily() && is_lazy_inner_function;
    // 默认是false
    let should_post_parallel_task = false;

    let should_preparse = (this.parse_lazily() && is_lazy_top_level_function) ||
      should_preparse_inner || should_post_parallel_task;
    /**
     * @warning 存疑
     * 这个地方的源码如下
     * ScopedPtrList<Statement> body(pointer_buffer());
     * 与fni_一样 这里也是栈上实例化 需要关注对应类的构造、析构函数
     * ScopedPtrList主要有三个属性
     * 1.容器buffer_
     * 2.开始start_、结束end_
     * 构造 => buffer_(*buffer),start_(buffer->size()),end_(buffer->size())
     * 析构 => vector::resize(start_),end_ = start_
     * pointer_buffer_默认是vector<void*> 万能指针容器 大小为0
     * 目前不需要关注start_、end_ 直接缓存当前长度 结束后重置即可
     */
    // let body = this.pointer_buffer_.slice();
    let body = [];
    /**
     * 下面的变量作为引用传到ParseFunction里去了
     */
    let expected_property_count = 0;
    let suspend_count = -1;
    let num_parameters = -1;
    let function_length = -1;
    let has_duplicate_parameters = false;

    let function_literal_id = this.GetNextFunctionLiteralId();
    let produced_preparse_data = null;

    let scope = this.NewFunctionScope(kind);
    this.SetLanguageMode(scope, language_mode);
    // V8_UNLIKELY
    if (!is_wrapped && (!this.Check('Token::LPAREN'))) throw new Error('UnexpectedToken');
    scope.set_start_position(this.position);

    /**
     * 终于开始解析了
     * 如果是声明类型的函数 这里会跳过
     * 目前的结构 => '(' 函数参数 ')' '{' 函数体 '}'
     */
    let did_preparse_successfully = false;
    if (should_preparse) {
      let result = this.SkipFunction(function_name, kind, function_type, scope, -1, -1, null);
      did_preparse_successfully = result.did_preparse_successfully;
      if (did_preparse_successfully) {
        num_parameters = result.num_parameters;
        function_length = result.function_length;
        produced_preparse_data = result.produced_preparse_data
      }
    }

    /**
     * 预编译失败会走完整解析
     */
    if (!did_preparse_successfully) {
      if (should_preparse) this.Consume('Token::LPAREN');
      should_post_parallel_task = false;
      let result = this.ParseFunction(body, function_name, pos, kind, function_type, scope,
        -1, -1, false, 0, -1, arguments_for_wrapped_function);
      num_parameters = result.num_parameters;
      function_length = result.function_length;
      has_duplicate_parameters = result.has_duplicate_parameters;
      expected_property_count = result.expected_property_count;
      suspend_count = result.suspend_count;
    }

    /**
     * 解析完函数后再检测函数名合法性
     * 因为函数名的严格模式取决于外部作用域
     */
    language_mode = scope.language_mode();
    this.CheckFunctionName(language_mode, function_name, function_name_validity, function_name_location);
    // if (is_strict(language_mode)) this.CheckStrictOctalLiteral(scope.start_position(), scope.end_position());
    let duplicate_parameters = has_duplicate_parameters ? kHasDuplicateParameters : kNoDuplicateParameters;

    let function_literal = this.ast_node_factory_.NewFunctionLiteral(
      function_name, scope, body, expected_property_count, num_parameters,
      function_length, duplicate_parameters, function_type,
      eager_compile_hint, pos, true, function_literal_id, produced_preparse_data);

    function_literal.function_token_position_ = function_token_pos;
    function_literal.suspend_count_ = suspend_count;


    // this.RecordFunctionLiteralSourceRange(function_literal);

    // if (should_post_parallel_task) {}
    if (should_infer_name) this.fni_.AddFunction(function_literal);

    // 析构
    // this.pointer_buffer_.length = len;
    return function_literal;
  }
  parse_lazily() {
    return this.mode_ === PARSE_LAZILY;
  }
  GetNextFunctionLiteralId() {
    return ++this.function_literal_id_;
  }
  SetLanguageMode(scope, mode) {
    let feature;
    if (is_sloppy(mode)) feature = kSloppyMode;
    else if (is_strict(mode)) feature = kStrictMode;
    else this.UNREACHABLE();
    ++this.use_counts_[feature];
    scope.set_language_mode(mode);
  }

  SpreadCall(_function, args_list, pos, is_possibly_eval) {
    if (this.OnlyLastArgIsSpread(args_list) || _function.IsSuperCallReference()) {
      return this.ast_node_factory_.NewCall(_function, args_list, pos);
    }
    let args = [];
    if (_function.IsProperty()) {
      if (_function.IsSuperAccess()) {
        let home = this.ThisExpression();
        args.push(_function);
        args.push(home);
      } else {
        let temp = this.NewTemporary(this.ast_value_factory_.empty_string());
        let obj = this.ast_node_factory_.NewVariableProxy(temp);
        let assign_obj = this.ast_node_factory_.NewAssignment('Token::ASSIGN', obj, _function.obj_, kNoSourcePosition);
        _function = this.ast_node_factory_.NewProperty(assign_obj, _function.key_, kNoSourcePosition);
        args.push(_function);
        obj = this.ast_node_factory_.NewVariableProxy(temp);
        args.push(obj);
      }
    } else {
      args.push(_function);
      args.push(this.ast_node_factory_.NewUndefinedLiteral(kNoSourcePosition));
    }
    args.push(this.ArrayLiteralFromListWithSpread(args_list));
    return this.ast_node_factory_.NewCallRuntime(REFLECT_APPLY_INDEX, args, pos);
  }
  OnlyLastArgIsSpread(args) {
    for (let i = 0; i < args.length; i++) {
      if (args[i].IsSpread()) {
        return false;
      }
    }
    return args[args.length - 1].IsSpread();
  }

  /**
   * TODO 过于麻烦 后面再处理
   * 预编译函数 跳过函数体的解析
   * @param {AstRawString*} function_name 函数名
   * @param {FunctionKind} kind 
   * @param {FunctionSyntaxKind} function_syntax_kind 
   * @param {DeclarationScope*} function_scope 
   * @param {int*} num_parameters 
   * @param {int*} function_length 
   * @param {ProducedPreparseData**} produced_preparse_data 
   */
  SkipFunction(function_name, kind, function_syntax_kind, function_scope,
    num_parameters, function_length, produced_preparse_data) {
    return { did_preparse_successfully: false };
    // let outer_scope_ = this.scope_;
    // new FunctionState(this.function_state_, this.scope_, function_scope);

    // // 有两个跳过函数的方式 这里是有预先编译好的缓存
    // if(this.consumed_preparse_data_) {
    //   let result = this.consumed_preparse_data_.GetDataForSkippableFunction(
    //     null, function_scope.start_position_,
    //     0, num_parameters, function_length, 0, false, kSloppy);
    //   produced_preparse_data = result.produced_preparse_data;
    //   let { end_position, language_mode, num_inner_functions, uses_super_property } = result;

    //   function_scope.outer_scope_.SetMustUsePreparseData();
    //   function_scope.is_skipped_function_ = true;
    //   function_scope.end_position_ = end_position;
    //   this.scanner_.SeekForward(end_position - 1);
    //   this.Expect('Token::RBRACE');
    //   this.SetLanguageMode(function_scope, language_mode);
    //   if(uses_super_property) function_scope.RecordSuperPropertyUsage();
    //   this.SkipFunctionLiterals(num_inner_functions);
    //   function_scope.ResetAfterPreparsing(this.ast_value_factory_, false);
    //   return { did_preparse_successfully: true };
    // }

    // let bookmark = new BookmarkScope(this.scanner_);
    // bookmark.bookmark_ = function_scope.start_position_;

    // let closest_class_scope = function_scope.GetClassScope();
    // let unresolved_private_tail = null;
    // if(closest_class_scope !== null) {
    //   unresolved_private_tail = closest_class_scope.GetUnresolvedPrivateNameTail();
    // }

    // let result = this.reusable_preparser().PreParseFunction(
    //   function_name, kind, function_syntax_kind, function_scope, this.use_counts_,
    //   produced_preparse_data, this.script_id_);

    // // 析构
    // this.scope_ = outer_scope_;
    // return { did_preparse_successfully: true };
  }
  // reusable_preparser() {
  //   if(this.reusable_preparser_ === null) {
  //     this.reusable_preparser_ = new PreParse(
  //       null, this.scanner_, this.stack_limit_, this.ast_value_factory_,
  //       null, this.runtime_call_stats_, this.logger_, -1,
  //       this.parsing_module_, this.parsing_on_main_thread_);
  //     this.reusable_preparser_
  //   }
  //   return this.reusable_preparser_;
  // }
  // RecordFunctionLiteralSourceRange(node) {
  //   if(this.source_range_map_ === null) return;
  //   this.source_range_map_.Insert(node, new FunctionLiteralSourceRanges());
  // }

  /**
   * 这个函数的参数是他妈真的多
   * 解析函数参数与函数体 流程巨长
   * @param {ScopedPtrList<Statement>*} body 保存了当前作用域内所有变量
   * @param {AstRawString*} function_name 函数名 匿名函数是空字符串
   * @param {int} pos 当前位置
   * @param {FunctionKind} kind 函数类型 见FunctionKindForImpl
   * @param {FunctionSyntaxKind} function_type 表达式、声明、IIFE
   * @param {DeclarationScope} function_scope 函数的作用域
   * @param {int*} num_parameters 参数数量
   * @param {int*} function_length 函数长度
   * @param {bool*} has_duplicate_parameters 是否有重复参数
   * @param {int*} expected_property_count 
   * @param {int*} suspend_count 
   * @param {ZonePtrList<const AstRawString>*} arguments_for_wrapped_function 
   */
  ParseFunction(body, function_name, pos, kind, function_type, function_scope,
    num_parameters = -1, function_length = -1, has_duplicate_parameters = false,
    expected_property_count = 0, suspend_count = -1, arguments_for_wrapped_function = null) {

    let old_mode_ = this.mode_;
    this.mode_ = this.allow_lazy_ ? PARSE_LAZILY : PARSE_EAGERLY;
    let function_state = new FunctionState(this.function_state_, this.scope_, function_scope);

    let is_wrapped = function_type === kWrapped;

    let expected_parameters_end_pos = this.parameters_end_pos_;
    if (expected_parameters_end_pos !== kNoSourcePosition) this.parameters_end_pos_ = kNoSourcePosition;

    /**
     * ParserFormalParameters formals(function_scope);
     * 这里是栈上实例化 但是没看到析构函数 应该是不用额外操作
     */
    let formals = new ParserFormalParameters(function_scope);
    {
      // 栈上实例化 无析构
      let formals_scope = new ParameterDeclarationParsingScope(this);
      /**
       * 这里的逻辑待定 还没搞懂怎么才会进
       */
      if (is_wrapped) {
        for (const arg of arguments_for_wrapped_function) {
          const is_rest = false;
          let argument = this.ExpressionFromIdentifier(arg, kNoSourcePosition);
          this.AddFormalParameter(formals, argument, null, kNoSourcePosition, is_rest);
        }
        this.DeclareFormalParameters(formals);
      }
      /**
       * 正常声明的函数
       */
      else {
        this.ParseFormalParameterList(formals);
        if (expected_parameters_end_pos !== kNoSourcePosition) {
          let position = this.peek_position();
          if (position < expected_parameters_end_pos) throw new Error(kArgStringTerminatesParametersEarly);
          else if (position > expected_parameters_end_pos) throw new Error(kUnexpectedEndOfArgString);
          return;
        }
        // )
        this.Expect('Token::RPAREN');
        let formals_end_position = this.scanner_.location().end_pos;
        // 检测函数参数数量的合法性
        this.CheckArityRestrictions(formals.arity, kind, formals.has_rest, function_scope.start_position_, formals_end_position);
        // {
        this.Expect('Token::LBRACE');
      }
      formals.duplicate_loc = formals_scope.duplicate_location();
    }
    num_parameters = formals.num_parameters();
    function_length = formals.function_length;

    // AcceptINScope scope(this, true);
    let previous_accept_IN_ = this.accept_IN_;
    this.accept_IN_ = true;

    this.ParseFunctionBody(body, function_name, pos, formals, kind, function_type, kBlock);
    has_duplicate_parameters = formals.has_duplicate();
    expected_property_count = function_state.expected_property_count_;
    suspend_count = function_state.suspend_count_;
    // 析构
    this.mode_ = old_mode_;
    this.accept_IN_ = previous_accept_IN_;
    return { num_parameters, function_length, has_duplicate_parameters, expected_property_count, suspend_count };
  }
  CheckArityRestrictions(param_count, function_kind, has_rest, formals_start_pos, formals_end_pos) {
    if (this.HasCheckedSyntax()) return;
    if (IsGetterFunction(function_kind) && param_count !== 0) throw new Error(kBadGetterArity);
    else if (IsSetterFunction(function_kind)) {
      if (param_count !== 1) throw new Error(kBadSetterArity);
      if (has_rest) throw new Error(kBadSetterRestParameter);
    }
  }
  HasCheckedSyntax() {
    return this.scope_.GetDeclarationScope().has_checked_syntax_;
  }
  // 生成一个临时generator对象 服务于yield表达式
  PrepareGeneratorVariables() {
    this.function_state_.scope_.DeclareGeneratorObjectVar(this.ast_value_factory_.dot_generator_object_string());
  }
  RewriteAsyncFunctionBody(body, block, return_value) {
    block.statements_.push(this.ast_node_factory_.NewAsyncReturnStatement(return_value, return_value.position_));
    block = this.BuildRejectPromiseOnException(block);
    body.push(block);
  }
  BuildRejectPromiseOnException(inner_block) {
    let result = this.ast_node_factory_.NewBlock(1, true);
    // TODO
    return result;
  }
  // 为形参注入一个作用域
  BuildParameterInitializationBlock(parameters) {
    // ScopedPtrList<Statement> init_statements(pointer_buffer());
    let init_statements = [];
    let index = 0;
    for (let parameter of parameters.params) {
      /**
       * parameters保存了所有的形参
       * 这里判断设置的默认值是否是undefined 过滤掉
       */
      let initial_value = this.ast_node_factory_.NewVariableProxy(parameters.scope.parameter(index));
      if (parameter.initializer_ !== null) {
        let condition = this.ast_node_factory_.NewCompareOperation(
          'Token::EQ_STRICT',
          this.ast_node_factory_.NewVariableProxy(parameters.scope.parameter(index)),
          this.ast_node_factory_.NewUndefinedLiteral(kNoSourcePosition), kNoSourcePosition);
        initial_value = this.ast_node_factory_.NewConditional(condition, parameter.initializer_, initial_value, kNoSourcePosition);
      }

      // 处理eval 跳过 一般也不会用
      // let param_scope = this.scope_;
      // if()...

      // BlockState block_state(&scope_, param_scope);
      let outer_scope_ = this.scope_;
      this.scope_ = param_scope;
      let decl = new Declaration(parameter.pattern, initial_value);
      this.InitializeVariables(init_statements, decl);

      ++index;
      // 析构
      this.scope_ = outer_scope_;
    }
    return this.ast_node_factory_.NewBlock(true, init_statements);
  }
  InsertSloppyBlockFunctionVarBindings(scope) {
    // 最外层的eval作用域不需要做提升
    if (scope.is_eval_scope() && scope.outer_scope_ === this.original_scope_) return;
    scope.HoistSloppyBlockFunctions(this.ast_node_factory_);
  }
  DeclareFunctionNameVar(function_name, function_type, function_scope) {
    if (function_type === kNamedExpression && function_scope.LookupLocal(function_name) === null) {
      function_scope.DeclareFunctionVar(function_name);
    }
  }

  ParseAndRewriteAsyncGeneratorFunctionBody() { }
  ParseAndRewriteGeneratorFunctionBody() { }
  ParseAsyncFunctionBody() { }

  /**
   * 给函数设名字
   * 其中value可能是function也可能是class
   * @param {Expression*} value 值
   * @param {Expression*} identifier 键
   */
  SetFunctionNameFromIdentifierRef(value, identifier) {
    if (!identifier.IsVariableProxy()) return;
    this.SetFunctionName(value, identifier.raw_name());
  }
  SetFunctionName(value, name, prefix = null) {
    /**
     * 匿名函数、属性简写、get/set才需要名字
     */
    if (!value.IsAnonymousFunctionDefinition() &&
      !value.IsConciseMethodDefinition() &&
      !value.IsAccessorFunctionDefinition()) return;
    // 这里调用了AsFunctionLiteral方法进行了强转
    let f = value;
    // 如果是class 这里同样会调用AsClassLiteral强转
    if (value.IsClassLiteral()) f = v.constructor_;
    /**
     * 到这里最终会变成一个函数字面量
     * 只有FunctionLiteral类才有set_raw_name方法
     */
    if (f !== null) {
      let cons_name = null;
      if (name !== null) {
        if (prefix !== null) cons_name = this.ast_value_factory_.NewConsString(prefix, name);
        else cons_name = this.ast_value_factory_.NewConsString(name);
      }
      f.set_raw_name(cons_name);
    }
  }
  /**
   * 添加单个形参到容器中
   * @param {ParserFormalParameters*} parameters 参数描述类
   * @param {Expression*} pattern 形参
   * @param {Expression*} initializer 参数默认值(没有就是null)
   * @param {int} initializer_end_position 位置
   * @param {bool} is_rest 由于rest只能是最后一个 所以这个直接代表当前参数是否是rest参数
   */
  AddFormalParameter(parameters, pattern, initializer, initializer_end_position, is_rest) {
    parameters.UpdateArityAndFunctionLength(initializer !== null, is_rest);
    let parameter = new Parameter(pattern, initializer, this.scanner_.location().beg_pos, initializer_end_position, is_rest);
    parameters.params.push(parameter);
  }
  /**
   * TODO
   * @param {ParserFormalParameters*} parameters 
   */
  DeclareFormalParameters(parameters) {
    /**
     * 出现以下三种情况时该值是false
     * 1.rest参数
     * 2.默认参数
     * 3.解构参数
     */
    let is_simple = parameters.is_simple;
    let scope = parameters.scope;
    if (!is_simple) scope.MakeParametersNonSimple();
    for (let parameter of parameters.params) {
      let is_optional = parameter.initializer_ !== null;
      /**
       * 根据simple属性来决定参数
       * 非简单模式会使用临时的镜像参数
       */
      scope.DeclareParameter(
        is_simple ? parameter.name() : this.ast_value_factory_.empty_string(),
        is_simple ? kVar : kTemporary,
        is_optional, parameter.is_rest_, this.ast_value_factory_, parameter.position
      );
    }
  }
  RewriteClassLiteral() {

  }

  DeclareClassVariable(name, class_info, class_token_pos) {
    if (name !== null) {
      let proxy = this.DeclareBoundVariable(name, kConst, class_token_pos);
      class_info.variable = proxy.var_;
    }
  }
  DeclareFunction(variable_name, fnc, mode, kind, beg_pos, end_pos, names) {
    let declaration = this.ast_node_factory_.NewFunctionDeclaration(fnc, beg_pos);
    this.Declare(declaration, variable_name, kind, mode, kCreatedInitialized, this.scope_, false, beg_pos);
    if (this.info_.coverage_enabled()) declaration.var_.set_is_used();
    if (names) names.push(variable_name);
    if (kind === SLOPPY_BLOCK_FUNCTION_VARIABLE) {
      let init = this.function_state_.loop_nesting_depth_ > 0 ? 'Token::ASSIGN' : 'Token::INIT';
      let statement = this.ast_node_factory_.NewSloppyBlockFunctionStatement(end_pos, declaration.var_, init);
      this.scope_.GetDeclarationScope().DeclareSloppyBlockFunction(statement);
      return statement;
    }
    return this.ast_node_factory_.EmptyStatement();
  }
  DeclareArrowFunctionFormalParameters(parameters, expr, params_loc) {
    if (expr.IsEmptyParentheses()) return;
    this.AddArrowFunctionFormalParameters(parameters, expr, params_loc.end_pos);

    if (parameters.arity > kMaxArguments) throw new Error(kMalformedArrowFunParamList);

    this.DeclareFormalParameters(parameters);
  }
  // JS的弱类型有时候是真的好用
  AddArrowFunctionFormalParameters(parameters, expr, end_pos) {
    // 递归处理多形参
    if (expr.IsNaryOperation()) {
      let next = nary.first_;
      for (let i = 0; i < expr.subsequent_length(); ++i) {
        this.AddArrowFunctionFormalParameters(parameters, next, expr.subsequent_op_position(i));
        next = nary.subsequent(i);
      }
      this.AddArrowFunctionFormalParameters(parameters, next, end_pos);
      return;
    }
    // 两个形参只递归解决左边的 右边的在方法尾部处理
    if (expr.IsBinaryOperation()) {
      let left = expr.left_;
      let right = expr.right_;
      let comma_pos = expr.position_;
      this.AddArrowFunctionFormalParameters(parameters, left, comma_pos);
      expr = right;
    }

    // 处理扩展运算符
    let is_rest = expr.IsSpread();
    if (is_rest) {
      expr = expr.expression_;
      parameters.has_rest = true;
    }

    // 默认参数在这里处理
    let initializer = null;
    if (expr.IsAssignment()) {
      initializer = expr.value_;
      expr = expr.target_;
    }

    this.AddFormalParameter(parameters, expr, initializer, end_pos, is_rest);
  }

  /**
   * 对象字面量工具函数
   * @param {ObjectLiteralProperty*} property 
   */
  IsBoilerplateProperty(property) {
    return !property.IsPrototype();
  }
  InitializeObjectLiteral(object_literal) {
    object_literal.CalculateEmitStore();
    return object_literal;
  }
  /**
   * 判定该字符串是否是int32的纯数字 多位数不可以0开头
   * @param {AstRawString} string 
   * @param {Number} index 
   */
  IsArrayIndex(string, index) {
    return string.AsArrayIndex(index);
  }
  PushLiteralName(id) {
    this.fni_.PushLiteralName(id);
  }

  DesugarLexicalBindingsInForStatement() {

  }

  LookupContinueTarget(label) {
    let anonymous = label === null;
    for (let t = this.target_stack_; t !== null; t = t.previous_) {
      let stat = t.statement_;
      if (stat === null) continue;
      if (anonymous || this.ContainsLabel(stat.own_labels_, label)) {
        return stat;
      }
      if (this.ContainsLabel(stat.labels_, label)) break;
    }
    return null;
  }
  LookupBreakTarget() {
    let anonymous = label === null;
    for (let t = this.target_stack_; t !== null; t = t.previous_) {
      let stat = t.statement_;
      if ((anonymous && stat.is_target_for_anonymous()) ||
        (!anonymous && this.ContainsLabel(stat.labels_, label))) {
        return stat;
      }
    }
    return null;
  }
  ContainsLabel(labels, label) {
    if (labels !== null && labels.includes(label)) {
      return true;
    }
    return false;
  }

  /**
   * 这个方法主要处理派生类构造函数的返回
   * 派生类构造函数返回只能是undefined或者类(当然一般不会出现返回语句）
   * 当返回是undefined(即未指定返回) 就会返回this
   * 当返回是对象时 就会返回指定对象
   * 这里就将返回语句置换成三元表达式语句 即(return_value === undefined) ? this : return_value
   * 返回是基本类型时 会报下述错误
   * Derived constructors may only return object or undefined
   * @param {Expression} return_value 一般是this
   */
  RewriteReturn(return_value, pos) {
    if (IsDerivedConstructor(this.function_state_.kind())) {
      let temp = this.NewTemporary(this.ast_value_factory_.empty_string());
      let assign = this.ast_node_factory_.NewAssignment(
        'Token::ASSIGN', this.ast_node_factory_.NewVariableProxy(temp), return_value, pos);

      let is_undefined = this.ast_node_factory_.NewCompareOperation(
        'Token::EQ_STRICT', assign, this.ast_node_factory_.NewUndefinedLiteral(kNoSourcePosition), pos);

      return_value = this.ast_node_factory_.NewConditional(is_undefined, this.ast_node_factory_.ThisExpression(),
        this.ast_node_factory_.NewVariableProxy(temp), pos);
    }
    return return_value;
  }
  /**
   * 重写switch语句
   * @returns {Statement*}
   */
  RewriteSwitchStatement(switch_statement, scope) {
    let switch_block = this.ast_node_factory_.NewBlock(2, false);
    let tag = switch_statement.tag_;
    let tag_variable = this.NewTemporary(this.ast_value_factory_.dot_switch_tag_string());
    let tag_assign = this.ast_node_factory_.NewAssignment('Token::ASSIGN',
      this.ast_node_factory_.NewVariableProxy(tag_variable), tag, tag.position_);

    let tag_statement = this.IgnoreCompletion(this.ast_node_factory_.NewExpressionStatement(tag_assign, kNoSourcePosition));
    switch_block.statement_.push(tag_statement);

    switch_statement.tag_ = this.ast_node_factory_.NewVariableProxy(tag_variable);
    let cases_block = this.ast_node_factory_.NewBlock(1, false);
    cases_block.statement_.push(switch_statement);
    cases_block.scope_ = scope;
    switch_block.statement_.push(cases_block);
    return switch_block;
  }
  IgnoreCompletion(statement) {
    let block = this.ast_node_factory_.NewBlock(1, true);
    block.statement_.push(statement);
    return block;
  }
  /**
   * 重写catch的复杂参数解构
   */
  RewriteCatchPattern(catch_info) {
    let decl = new Declaration(catch_info.pattern, ast_node_factory_.NewVariableProxy(catch_info.variable));
    let init_statements = [];
    this.InitializeVariables(init_statements, NORMAL_VARIABLE, decl);
    return this.ast_node_factory_.NewBlock(true, init_statements);
  }
  RewriteTryStatement() {}

  OpenTemplateLiteral(pos) {
    return new TemplateLiteral(pos);
  }
  AddTemplateSpan(state, should_cook, tail) {
    let end = this.scanner_.location().end_pos - (tail ? 1 : 2);
    let raw = this.scanner_.CurrentRawSymbol(this.ast_value_factory_);
    if (should_cook) {
      let cooked = this.scanner_.CurrentSymbol(this.ast_value_factory_);
      state.AddTemplateSpan(cooked, raw, end);
    } else {
      state.AddTemplateSpan(null, raw, end);
    }
  }
  CloseTemplateLiteral(state, start, tag) {
    let pos = state.pos_;
    let cooked_strings = state.cooked_;
    let raw_strings = state.raw_;
    let expressions = state.expressions_;
    if (!tag) {
      if (cooked_strings.length === 1) {
        return this.ast_node_factory_.NewStringLiteral(cooked_strings[0], pos);
      }
      return this.ast_node_factory_.NewTemplateLiteral(cooked_strings, expressions, pos);
    } else {
      let template_object = this.ast_node_factory_.NewGetTemplateObject(cooked_strings, raw_strings, pos);

      let call_args = [];
      call_args.push(template_object);
      call_args.push(...expressions);
      return this.ast_node_factory_.NewTaggedTemplate(tag, call_args, pos);
    }
  }

  // NewV8Intrinsic(name, args, pos) {
  //   if(this.extension_ !== null) {
  //     this.scope_.GetClosureScope().ForceEagerCompilation();
  //   }
  //   if(!name.is_one_byte()) throw new Error(kNotDefined);
  // }
}

class TemplateLiteral {
  constructor() {
    this.cooked_ = [];
    this.raw_ = [];
    this.expressions_ = [];
    this.pos_ = pos;
  }
  AddTemplateSpan(cooked, raw, end) {
    this.cooked_.push(cooked);
    this.raw_.push(raw);
  }
  AddExpression(expression) {
    this.expressions_.push(expression);
  }
}

// export class ParserTarget {
//   constructor(parser, statement) {
//     this.variable_ = parser.target_stack_;
//     this.statement_ = statement;
//     parser.target_stack_ = this;
//   }
// }

export default Parser;
import { 
  kVar,
  kDynamic,
  kConst,
  kNotAssigned,
  kSloppy,
  kStrict,
  NORMAL_VARIABLE,
  kCreatedInitialized,
  THIS_VARIABLE,
  kNeedsInitialization,
  kTemporary,
  EVAL_SCOPE,
  FUNCTION_SCOPE,
  MODULE_SCOPE,
  CATCH_SCOPE,
  WITH_SCOPE,
  SCRIPT_SCOPE,
} from "../../enum";
import { Variable } from "../../ast/AST";
import { 
  IsConciseMethod, 
  IsClassConstructor, 
  IsAccessorFunction, 
  IsDerivedConstructor 
} from "../../util";
// import ThreadedList from '../base/ThreadedList';

class ZoneObject {};

/**
 * JS不存在HashMap的数据结构
 * 由于不存在指针 所以对象之间的比较十分困难
 * 这里用hash值来做对比
 */
class VariableMap {
  constructor() {
    /**
     * 源码中是一个HashMap
     * 这里暂时用数组代替
     */
    this.variables_ = [];
  }
  Lookup(name) {
    let tar = this.variables_.find(v => v.hash === name.Hash());
    return tar ? tar.value : null;
  }
  LookupOrInsert(name, hash) {
    let tar = this.variables_.find(v => v.hash === hash);
    if (!tar){
      let p = { hash, value: null };
      this.variables_.push(p);
      return p;
    }
    return tar;
  }
  Declare(zone, scope, name, mode, kind, initialization_flag, maybe_assigned_flag, was_added) {
    let p = this.LookupOrInsert(name, name.Hash());
    was_added = p.value === null;
    if (was_added) {
      let variable = new Variable(scope, name, mode, kind, initialization_flag, maybe_assigned_flag);
      p.value = variable;
    }
    return {
      was_added,
      variable: p.value
    };
  }
}

export default class Scope extends ZoneObject {
  constructor(zone, outer_scope = null, scope_type = SCRIPT_SCOPE) {
    super();
    this.outer_scope_ = outer_scope;
    this.inner_scope_ = null;
    this.is_declaration_scope_ = 1;
    this.start_position_ = 0;

    this.scope_type_ = scope_type;

    this.is_strict_ = kSloppy;

    // The variables declared in this scope:
    //
    // All user-declared variables (incl. parameters).  For script scopes
    // variables may be implicitly 'declared' by being used (possibly in
    // an inner scope) with no intervening with statements or eval calls.
    this.variables_ = new VariableMap();
    /**
     * ThreadedList<Declaration> decls
     * 这是一个类似于链表的数据结构
     * 主属性有tail_、head_两个属性 其中tail_是二维指针、head_是一维指针
     * 这是因为传入该list里的都是指向Declaration实例的指针
     */
    // this.decls_ = new ThreadedList();
    this.decls_ = [];
    // In case of non-scopeinfo-backed scopes, this contains the variables of the
    // map above in order of addition.
    // base::ThreadedList<Variable> locals_;
    this.locals_ = [];

    /**
     * 内存管理相关
     */
    this.zone_ = null;
  }
  zone() { return this.zone_; }
  set_start_position(statement_pos) { this.start_position_ = statement_pos; }

  is_eval_scope() { return this.scope_type_ == EVAL_SCOPE; }
  is_function_scope() { return this.scope_type_ == FUNCTION_SCOPE; }
  is_module_scope() { return this.scope_type_ == MODULE_SCOPE; }
  is_declaration_scope() { return this.is_declaration_scope_; }
  is_script_scope() { return this.scope_type_ == SCRIPT_SCOPE; }
  is_catch_scope() { return this.scope_type_ == CATCH_SCOPE; }
  is_block_scope() {
    return this.scope_type_ == BLOCK_SCOPE || this.scope_type_ == CLASS_SCOPE;
  }
  is_with_scope() { return this.scope_type_ == WITH_SCOPE; }
  is_class_scope() { return this.scope_type_ == CLASS_SCOPE; }

  SetLanguageMode(language_mode) { this.is_strict_ = this.is_strict(language_mode); }
  language_mode() { return this.is_strict_ ? kStrict : kSloppy; }
  is_sloppy(language_mode) { return language_mode === kSloppy; }
  is_strict(language_mode) { return language_mode !== kSloppy; }

  declarations() { return this.decls_; }
  outer_scope() { return this.outer_scope_; }
  /**
   * 遍历作用域链 判定是否有未处理的变量
   * @param {Scope} outer 指定的外层作用域
   */
  AllowsLazyParsingWithoutUnresolvedVariables(outer) {
    for(let s = this; s !== outer; s = s.outer_scope_) {
      if(s.is_eval_scope()) return this.is_sloppy(s.language_mode());
      if(s.is_catch_scope()) continue;
      if(s.is_with_scope()) continue;
      return false;
    }
    return true;
  }
  // 这里形成一个作用域链
  GetDeclarationScope() {
    let scope = this;
    while (!scope.is_declaration_scope()) {
      scope = scope.outer_scope();
    }
    return scope.AsDeclarationScope();
  }
  AsDeclarationScope() {
    return new DeclarationScope();
  }
  /**
   * 根据name生成一个Variable实例 绑定到Declaration上面
   * @param {Declaration} declaration 声明表达式
   * @param {AstRawString*} name 变量名
   * @param {int} pos 声明位置
   * @param {VariableMode} mode kVar、kLet、kConst
   * @param {VariableKind} kind NORMAL_VARIABLE
   * @param {InitializationFlag} init kCreatedInitialized、kNeedsInitialization
   * @param {Boolean} was_added 代表是否第一次声明
   * @param {Boolean} sloppy_mode_block_scope_function_redefinition 函数重定义
   * @param {Boolean} ok 成功声明或赋值
   */
  DeclareVariable(declaration, name, pos, mode, kind, init, was_added, sloppy_mode_block_scope_function_redefinition, ok) {
    // 变量提升 往上搜索第一个有效作用域
    if (mode === kVar && !this.is_declaration_scope()) {
      return this.GetDeclarationScope().DeclareVariable(declaration, name, pos, mode, kind, init, was_added, sloppy_mode_block_scope_function_redefinition, ok);
    }
    let variable = this.LookupLocal(name);
    was_added = variable === null;
    // 第一次声明
    if (was_added) {
      /**
       * "eval(var a = 1;)"
       * 属于动态声明的变量
       */
      if (this.is_eval_scope() && this.is_sloppy(this.language_mode()) && mode === kVar) {
        // variable = this.NonLocal(name, kDynamic);
        variable.set_is_used();
      }
      // 正常声明
      else {
        variable = this.DeclareLocal(name, mode, kind, was_added, init);
      }
    } else {
      variable.set_maybe_assigned();
      // 重复定义处理
      // if () {}
    }

    this.decls_.push(declaration);
    declaration.set_var(variable);
    return { was_added, sloppy_mode_block_scope_function_redefinition };
  }
  DeclareLocal(name, mode, kind, was_added_param, init_flag) {
    let { was_added, variable } = this.variables_.Declare(this.zone(), this, name, mode, kind, init_flag, kNotAssigned, was_added_param);
    if (was_added) this.locals_.push(variable);

    // 作用域判断
    if (this.is_script_scope() || this.is_module_scope()) {
      if (mode !== kConst) variable.set_maybe_assigned();
      variable.set_is_used();
    }
    return variable;
  }
  /**
   * 声明一个特殊变量
   * @param {Zone*} zone 内存地址
   * @param {AstRawString*} name 变量名
   * @param {VariableMode*} mode 声明类型
   * @param {VariableKind*} kind 变量类型
   * @param {InitializationFlag*} initialization_flag 
   * @param {MaybeAssignedFlag*} maybe_assigned_flag 
   * @param {bool*} was_added 
   */
  Declare(zone = null, name, mode, kind, initialization_flag, maybe_assigned_flag, was_added_param) {
    let { was_added, variable } = this.variables_.Declare(zone, this, name, mode, kind, initialization_flag, maybe_assigned_flag, was_added_param);
    if(was_added) this.locals_.push(variable);
    return variable;
  }
  /**
   * JS新出的Map类 has仅仅返回true、false
   * 所以需要对返回值做一些处理
   */
  LookupLocal(name) {
    return this.variables_.Lookup(name);
  }
}

export class DeclarationScope extends Scope {
  constructor(zone = null, outer_scope, scope_type, function_kind) {
    super(zone, outer_scope, scope_type);
    this.function_kind_ = function_kind;
    this.num_parameters_ = 0;
    this.params_ = [];
    this.SetDefaults();
  }
  SetDefaults() {
    this.is_declaration_scope_ = true;
    this.has_simple_parameters_ = true;
    this.is_asm_module_ = false;
    this.force_eager_compilation_ = false;
    this.has_arguments_parameter_ = false;
    this.scope_uses_super_property_ = false;
    this.has_checked_syntax_ = false;
    this.has_this_reference_ = false;
    this.has_this_declaration_ = (this.is_function_scope() && !this.is_arrow_scope()) || this.is_module_scope();
    this.has_rest_ = false;
    this.receiver_ = null;
    this.new_target_ = null;
    this.function_ = null;
    this.arguments_ = null;
    this.rare_data_ = null;
    this.should_eager_compile_ = false;
    this.was_lazily_parsed_ = false;
    this.is_skipped_function_ = false;
    this.preparse_data_builder_ = null;
  }
  DeclareDefaultFunctionVariables(ast_value_factory) {
    // 生成this变量
    this.DeclareThis(ast_value_factory);
    // 生成.new.target变量
    this.new_target_ = this.Declare(null, ast_value_factory.GetOneByteStringInternal(ast_value_factory.new_target_string()), kConst, NORMAL_VARIABLE, kCreatedInitialized, kNotAssigned, false);
    if(IsConciseMethod(this.function_kind_) || IsClassConstructor(this.function_kind_) || IsAccessorFunction(this.function_kind_)) {
      this.EnsureRareData().this._function = this.Declare(null, ast_value_factory.GetOneByteStringInternal(ast_value_factory.this_function_string()), kConst, NORMAL_VARIABLE, kCreatedInitialized, kNotAssigned, false);
    }
  }
  DeclareThis(ast_value_factory) {
    let derived_constructor = IsDerivedConstructor(this.function_kind_);
    let p1 = derived_constructor ? kConst : kVar;
    let p2 = derived_constructor ? kNeedsInitialization : kCreatedInitialized;
    this.receiver_ = new Variable(this, ast_value_factory.this_string(), p1, THIS_VARIABLE, p2, kNotAssigned);
  }
  EnsureRareData() {
    if(this.rare_data_ === null) this.rare_data_ = new RareData();
    return this.rare_data_;
  }
  MakeParametersNonSimple() {
    this.SetHasNonSimpleParameters();
    for(let p of this.variables_) {
      let variable = p.value;
      if(variable.is_parameter()) Variable.MakeParameterNonSimple();
    }
  }
  SetHasNonSimpleParameters() {
    this.has_simple_parameters_ = false;
  }
  /**
   * ...
   * @param {AstRawString*} name 参数名
   * @param {VariableMode} mode 声明模式
   * @param {bool} is_optional 是否有默认值
   * @param {bool} is_rest rest参数
   * @param {AstValueFactory*} ast_value_factory 
   * @param {int} position 
   */
  DeclareParameter(name, mode, is_optional, is_rest, ast_value_factory, position) {
    let variable = null;
    if(mode === kTemporary) variable = NewTemporary(name);
    else variable = this.LookupLocal(name);
    this.has_rest_ = is_rest;
    variable.initializer_position_ = position;
    this.params_.push(variable);
    if(!is_rest) ++this.num_parameters_;
    if(name === ast_value_factory.arguments_string()) this.has_arguments_parameter_ = true;
    variable.set_is_used();
    return variable;
  }
}

class RareData extends ZoneObject {
  constructor() {
    super();
    this.this_function = null;
    this.generator_object = null;
  }
}


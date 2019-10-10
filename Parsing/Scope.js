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
  kNormalFunction,
  kDynamicGlobal,
  kNoSourcePosition,
  kMappedArguments,
  kUnmappedArguments,
  SLOPPY_FUNCTION_NAME_VARIABLE,
  CONTEXT,
  TokenEnumList,
  kMaybeAssigned,
  CLASS_SCOPE,
} from "../enum";
import { Variable } from "../ast/AST";
import { 
  IsConciseMethod, 
  IsClassConstructor, 
  IsAccessorFunction, 
  IsDerivedConstructor, 
  IsClassMembersInitializerFunction,
  IsLexicalVariableMode,
  is_sloppy
} from "../util";
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
  occupancy() { return this.variables_.length; }
}

export default class Scope extends ZoneObject {
  constructor(zone, outer_scope = null, scope_type = SCRIPT_SCOPE) {
    super();
    this.zone_ = null;
    this.outer_scope_ = outer_scope;
    // The variables declared in this scope:
    //
    // All user-declared variables (incl. parameters).  For script scopes
    // variables may be implicitly 'declared' by being used (possibly in
    // an inner scope) with no intervening with statements or eval calls.
    this.variables_ = new VariableMap();
    this.scope_type_ = scope_type;
    this.scope_info_ = null;

    this.is_strict_ = kSloppy;
    this.scope_calls_eval_ = false;
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

    this.unresolved_list_ = [];

    this.SetDefaults();
  }
  SetDefaults() {
    this.inner_scope_ = null;
    this.sibling_ = null;
    this.start_position_ = kNoSourcePosition;
    this.end_position_ = kNoSourcePosition;
    this.num_stack_slots_ = 0;
    this.num_heap_slots_ = 0;

    this.calls_eval_ = false;
    this.sloppy_eval_can_extend_vars_ = false;
    this.scope_nonlinear_ = false;
    this.is_hidden_ = false;
    this.is_debug_evaluate_scope_ = false;
    this.inner_scope_calls_eval_ = false;
    this.force_context_allocation_for_parameters_ = false;

    this.is_declaration_scope_ = false;
    this.must_use_preparsed_scope_data_ = false;
  }

  zone() { return this.zone_; }
  set_start_position(statement_pos) { this.start_position_ = statement_pos; }

  is_eval_scope() { return this.scope_type_ === EVAL_SCOPE; }
  is_function_scope() { return this.scope_type_ === FUNCTION_SCOPE; }
  is_module_scope() { return this.scope_type_ === MODULE_SCOPE; }
  is_script_scope() { return this.scope_type_ === SCRIPT_SCOPE; }
  is_catch_scope() { return this.scope_type_ === CATCH_SCOPE; }
  is_block_scope() { return this.scope_type_ === BLOCK_SCOPE || this.scope_type_ === CLASS_SCOPE; }
  is_with_scope() { return this.scope_type_ === WITH_SCOPE; }
  is_class_scope() { return this.scope_type_ === CLASS_SCOPE; }

  set_language_mode(language_mode) { this.is_strict_ = this.is_strict(language_mode); }
  language_mode() { return this.is_strict_ ? kStrict : kSloppy; }
  is_sloppy(language_mode) { return language_mode === kSloppy; }
  is_strict(language_mode) { return language_mode !== kSloppy; }

  outer_scope() { return this.outer_scope_; }
  /**
   * 初始化origin_scope_ 即最外层作用域
   * @param {Isolate*} isolate 
   * @param {Zone*} zone null
   * @param {ScopeInfo} scope_info null
   * @param {DeclarationScope*} script_scope null
   * @param {AstValueFactory*} ast_value_factory 
   * @param {DeserializationMode} deserialization_mode kIncludingVariables
   */
  // DeserializeScopeChain(isolate, zone, scope_info, script_scope, ast_value_factory, deserialization_mode) {
  //   let current_scope = null;
  //   let innermost_scope = null;
  //   let outer_scope = null;
  //   while(!scope_info) {
  //   }
  // }
  AllowsLazyCompilation() {
    return !this.force_eager_compilation_ && !IsClassMembersInitializerFunction(this.function_kind_);
  }
  /**
   * 遍历作用域链 判定是否有未处理的变量
   * @param {Scope} outer 指定的外层作用域
   */
  AllowsLazyParsingWithoutUnresolvedVariables(outer) {
    for(let s = this; s !== outer; s = s.outer_scope_) {
      if (s.is_eval_scope()) return this.is_sloppy(s.language_mode());
      if (s.is_catch_scope()) continue;
      if (s.is_with_scope()) continue;
      return false;
    }
    return true;
  }
  FinalizeBlockScope() {
    if(this.variables_.occupancy() > 0 || (this.is_declaration_scope_ && calls_sloppy_eval())){
      return this;
    }
    this.outer_scope.RemoveInnerScope(this);
    // 重新设置作用域关系
    if(this.inner_scope_ !== null) {
      let scope = this.inner_scope_;
      scope.outer_scope_ = this.outer_scope_;
      while(scope.sibling_ !== null) {
        scope = scope.sibling_;
        scope.outer_scope_ = this.outer_scope_;
      }
      scope.sibling_ = this.outer_scope_.inner_scope_;
      this.outer_scope_.inner_scope_ = this.inner_scope_;
      this.inner_scope_ = null;
    }
    // 移动待处理变量
    if(this.unresolved_list_.length) {
      this.outer_scope_.unresolved_list_ = this.unresolved_list_;
      this.unresolved_list_.length = 0;
    }

    if(this.inner_scope_calls_eval_) this.outer_scope_.inner_scope_calls_eval_ = true;
    this.num_heap_slots_ = 0;
    
    return null;
  }
  // 这里形成一个作用域链
  GetDeclarationScope() {
    let scope = this;
    while (!scope.is_declaration_scope_) {
      scope = scope.outer_scope();
    }
    return scope;
  }
  // 从内到外获取第一个函数作用域
  GetClosureScope() {
    let scope = this;
    while(!scope.is_declaration_scope_ || scope.is_block_scope()) scope = scope.outer_scope_;
    return scope;
  }
  // 返回第一个有this的作用域
  GetReceiverScope() {
    let scope = this;
    while(!scope.is_declaration_scope_ || (!scope.is_script_scope() && !scope.has_this_declaration_)) scope = scope.outer_scope_;
    return scope;
  }
  HasSimpleParameters() {
    let scope = this.GetClosureScope();
    return !scope.is_function_scope() || scope.has_simple_parameters_;
  }
  LookupInScopeOrScopeInfo(name) {
    let variable = this.variables_.Lookup(name);
    if(variable !== null || this.scope_info_) return variable;
    // 这里逻辑太复杂 先简化处理
    return null;
    // return LookupInScopeInfo(name, this);
  }
  // LookupInScopeInfo() {
  //   let name_handle = name.literal_bytes_;
  //   let found = false;
  //   let location = CONTEXT;
  //   let index = 0;
  //   {
  //     index = ScopeInfo.ContextSlotIndex(this.scope_info_, name_handle, mode, )
  //   }
  // }
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
    if (mode === kVar && !this.is_declaration_scope_) {
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
    if (was_added) this.locals_.push(variable);
    return { was_added, variable };
  }
  /**
   * JS新出的Map类 has仅仅返回true、false
   * 所以需要对返回值做一些处理
   */
  LookupLocal(name) {
    return this.variables_.Lookup(name);
  }
  num_var() { return this.variables_.occupancy(); }

  AddUnresolved(proxy) {
    this.unresolved_list_.push(proxy);
  }

  DeclareDefaultFunctionVariables(ast_value_factory) {
    // 生成this变量
    this.DeclareThis(ast_value_factory);
    // 生成.new.target变量
    this.new_target_ = this.Declare(null, ast_value_factory.GetOneByteStringInternal(ast_value_factory.new_target_string()), kConst, NORMAL_VARIABLE, kCreatedInitialized, kNotAssigned, false).variable;
    if (IsConciseMethod(this.function_kind_) || IsClassConstructor(this.function_kind_) || IsAccessorFunction(this.function_kind_)) {
      this.EnsureRareData().this_function = this.Declare(null, ast_value_factory.GetOneByteStringInternal(ast_value_factory.this_function_string()), kConst, NORMAL_VARIABLE, kCreatedInitialized, kNotAssigned, false).variable;
    }
  }
  DeclareThis(ast_value_factory) {
    let derived_constructor = IsDerivedConstructor(this.function_kind_);
    let p1 = derived_constructor ? kConst : kVar;
    let p2 = derived_constructor ? kNeedsInitialization : kCreatedInitialized;
    this.receiver_ = new Variable(this, ast_value_factory.GetOneByteStringInternal(ast_value_factory.this_string()), p1, THIS_VARIABLE, p2, kNotAssigned);
  }
  EnsureRareData() {
    if (this.rare_data_ === null) this.rare_data_ = new RareData();
    return this.rare_data_;
  }
  MakeParametersNonSimple() {
    this.SetHasNonSimpleParameters();
    for(let p of this.variables_) {
      let variable = p.value;
      if (variable.is_parameter()) Variable.MakeParameterNonSimple();
    }
  }
  SetHasNonSimpleParameters() {
    this.has_simple_parameters_ = false;
  }
  SetMustUsePreparseData() {
    if(this.must_use_preparsed_scope_data_) return;
    this.must_use_preparsed_scope_data_ = true;
    if(this.outer_scope_) this.outer_scope_.SetMustUsePreparseData();
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
    if (mode === kTemporary) variable = NewTemporary(name);
    else variable = this.LookupLocal(name);
    this.has_rest_ = is_rest;
    variable.initializer_position_ = position;
    this.params_.push(variable);
    if (!is_rest) ++this.num_parameters_;
    if (name === ast_value_factory.arguments_string()) this.has_arguments_parameter_ = true;
    variable.set_is_used();
    return variable;
  }

  static DeclarationScope() {}
  NeedsContext() { return this.num_heap_slots_ > 0; }
  GetArgumentsType() {
    return this.is_sloppy(this.language_mode()) && this.has_simple_parameters_ ? kMappedArguments : kUnmappedArguments;
  }
  NewTemporary(name, maybe_assigned = kMaybeAssigned) {
    let scope = this.GetClosureScope();
    let variable = new Variable(scope, name, kTemporary, NORMAL_VARIABLE, kCreatedInitialized);
    scope.AddLocal(variable);
    if(maybe_assigned === kMaybeAssigned) variable.set_maybe_assigned();
    return variable;
  }
}

/**
 * 保留该类 但是不作为实例化对象
 */
class DeclarationScope extends Scope {
  constructor(zone, outer_scope = null, scope_type = SCRIPT_SCOPE) {
    super(zone, outer_scope, scope_type);
    this.sloppy_block_functions_ = [];
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
  AddLocal(variable) {
    this.locals_.push(variable);
  }
  parameter(index) {
    return this.params_[index];
  }
  DeclareGeneratorObjectVar(name) {
    let result = this.NewTemporary(name, kNotAssigned);
    this.EnsureRareData().generator_object = result;
    return result; 
  }
  DeclareDynamicGlobal(name, kind, cache) {
    return cache.variables_.Declare(null, this, name, kDynamicGlobal, kind, kCreatedInitialized, kNotAssigned, false);
  }
  calls_sloppy_eval() {
    return !this.is_script_scope() && this.scope_calls_eval_ && is_sloppy(this.language_mode());
  }
  DeclareFunctionVar(name, cache = null) {
    if(cache === null) cache = this;
    let kind = is_sloppy(this.language_mode()) ? SLOPPY_FUNCTION_NAME_VARIABLE : NORMAL_VARIABLE;
    this.function_ = new Variable(this, name, kConst, kind, kCreatedInitialized);
    if(this.calls_sloppy_eval()) cache.NonLocal(name, kDynamic);
    else cache.variables_.push(this.function_);
    return this.function_;
  }
  DeclareSloppyBlockFunction(sloppy_block_function) {
    this.sloppy_block_functions_.push(sloppy_block_function);
  }
  /**
   * 这个提升说白了就是函数名查重
   * @param {AstNodeFactory*} factory 工厂方法
   */
  HoistSloppyBlockFunctions(factory) {
    if(!this.sloppy_block_functions_.length) return;
    let parameter_scope = this.HasSimpleParameters() ? this : this.outer_scope_;
    let decl_scope = this;
    while(decl_scope.is_eval_scope()) decl_scope = decl_scope.outer_scope_.GetDeclarationScope();

    let outer_scope = decl_scope.outer_scope_;
    for(let sloppy_block_function of this.sloppy_block_functions_) {
      let name = sloppy_block_function.name();
      /**
       * 检测函数名是否与参数名冲突
       * function a(a) {console.log(a)}; a(1); 此时会优先形参，函数名会被过滤掉
       */
      let maybe_parameter = parameter_scope.LookupLocal(name);
      if(maybe_parameter !== null && maybe_parameter.is_parameter()) continue;

      /**
       * 检测函数名是否与某个let、const声明的变量名冲突
       * function a() { let a = 1; } 此时在函数内部 函数名会被锁死无法获取
       */
      let query_scope = sloppy_block_function.scope().outer_scope_;
      let variable = null;
      let should_hoist = true;
      do {
        variable = query_scope.LookupInScopeOrScopeInfo(name);
        /**
         * 当作用域出现一个var声明类型的变量时 提升取消
         * var a = 1与var a = function(){}均会覆盖后面的function a(){}
         * 函数a会被解析 但是不会进入外部作用域变量池
         */
        if(variable !== null && IsLexicalVariableMode(variable.mode())) {
          should_hoist = false;
          break;
        }
        query_scope = query_scope.outer_scope_;
      } while(query_scope !== outer_scope);

      if(!should_hoist) continue;
      /**
       * @description 
       * 以下是函数声明提升的核心原理
       * 将当前函数名作为变量 插入到外部作用域的变量池中
       * 走一套完整的赋值流程 function fn(){}等于var fn = function() {}
       */
      if(factory) {
        let pos = sloppy_block_function.position_;
        let declaration = factory.NewVariableDeclaration(pos);
        let variable = this.DeclareVariable(declaration, name, pos, kVar, NORMAL_VARIABLE,
          Variable.DefaultInitializationFlag(kVar), false/* &was_added */, null, true/* &ok */);
        let source = factory.NewVariableProxy(sloppy_block_function.var_);
        let target = factory.NewVariableProxy(variable);
        let assignment = factory.NewAssignment(sloppy_block_function.init(), target, source, pos);
        let statement = factory.NewExpressionStatement(assignment, pos);
        sloppy_block_function.statement_ = statement;
      } else {
        let variable = this.DeclareVariableName(name, kVar, false);
        if(sloppy_block_function.init() === TokenEnumList.indexOf('Token::ASSIGN')) variable.set_maybe_assigned();
      }
    }
  }
}

export class FunctionDeclarationScope extends DeclarationScope {
  constructor(zone = null, outer_scope, scope_type, function_kind = kNormalFunction) {
    super(zone, outer_scope, scope_type);
    this.function_kind_ = function_kind;
    this.num_parameters_ = 0;
    this.params_ = [];
    this.SetDefaults();
  }
  /**
   * 由于arguments参数仅出现在function中
   * 所以这个方法可以不用放到Scope上
   */
  DeclareArguments(ast_value_factory) {
    let { was_added, variable: arguments_ } = this.Declare(null, ast_value_factory.arguments_string(), kVar,
    NORMAL_VARIABLE, kCreatedInitialized, kNotAssigned, false);
    /**
     * 若arguments变量已经被定义 且是通过let、const声明 此时默认的arguments变量为null => function fn(){let arguments = 1;}
     * 但是如果是通过var定义arguments 此时会依然生成该变量
     */
    if(!was_added && IsLexicalVariableMode(arguments_.mode())) arguments_ = null;
  }
}

export class ScriptDeclarationScope extends DeclarationScope {
  constructor(zone, ast_value_factory) {
    super(zone);
    this.function_kind_ = kNormalFunction;
    this.params_ = [];
    this.SetDefaults();
    this.receiver_ = this.DeclareDynamicGlobal(ast_value_factory.GetOneByteStringInternal(ast_value_factory.this_string()), THIS_VARIABLE, this);
  }
}

export class ClassScope extends Scope {
  constructor(zone = null, outer_scope) {
    super(zone, outer_scope, CLASS_SCOPE);
    this.set_language_mode(kStrict);
  }
  ResolvePrivateNamesPartially() {

  }
  DeclareBrandVariable() {
    
  }
}

class RareData extends ZoneObject {
  constructor() {
    super();
    this.this_function = null;
    this.generator_object = null;
  }
}


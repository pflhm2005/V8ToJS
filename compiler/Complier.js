import Parsing from "../parsing/Parsing";
import ParseInfo from "./ParseInfo";
import Interpreter from "./Interpreter";
import { FLAG_stress_lazy_source_positions } from "./Flag";
import { FLAG_use_strict } from "./Flag";
import { 
  kEagerCompile, 
  kConsumeCodeCache, 
  CompilationJob_FAILED, 
  CompilationJob_SUCCEEDED, 
  CodeEventListener_EVAL_TAG, 
  CodeEventListener_SCRIPT_TAG, 
  CodeEventListener_LAZY_COMPILE_TAG, 
  CodeEventListener_FUNCTION_TAG, 
  BailoutReason_kNoReason,
} from "../enum";
import Rewriter from "./Rewriter";
import { DeclarationScope } from "../parsing/Scope";

export default class Compiler {
  /**
   * 
   * @param {Isolate*} isolate 
   * @param {String} source 源字符串
   * @param {ScriptDetails} script_details 默认构造
   * @param {ScriptOriginOptions} origin_options 默认构造
   * @param {Extension*} extension null
   * @param {ScriptData} cached_data 默认构造
   * @param {CompileOptions} compile_options kNoCompileOptions
   * @param {NoCacheReason} no_cache_reason kNoCacheNoReason
   * @param {NativesFlag} natives NOT_NATIVES_CODE
   */
  static GetSharedFunctionInfoForScript(isolate, source, script_details, origin_options, extension,
    cached_data, compile_options, no_cache_reason, natives) {
    let compile_timer = new ScriptCompileTimerScope(isolate, no_cache_reason);

    let source_length = source.length;
    isolate.async_counters_.total_load_size_ += source_length;
    isolate.async_counters_.total_compile_size_ += source_length;

    let language_mode = FLAG_use_strict;
    let compilation_cache = isolate.compilation_cache_;

    let maybe_result = null;
    let is_compiled_scope = new IsCompiledScope();
    if (extension === null) {
      let can_consume_code_cache = compile_options === kConsumeCodeCache;
      if (can_consume_code_cache) compile_timer.set_consuming_code_cache();
      maybe_result = compilation_cache.LookupScript(source, script_details.name_obj, script_details.line_offset,
        script_details.column_offset, origin_options, isolate.native_context(), language_mode);
      if (maybe_result) compile_timer.set_hit_isolate_cache();
      else if (can_consume_code_cache) {
        compile_timer.set_consuming_code_cache();
        // more
      }
    }
    if (maybe_result === null) {
      let parse_info = new ParseInfo(isolate);
      NewScript(isolate, parse_info, source, script_details, origin_options, natives);
      if (origin_options.IsModule()) parse_info.set_module();
      parse_info.extension_ = extension;
      parse_info.set_eager(compile_options === kEagerCompile);
      parse_info.set_language_mode(language_mode);
      maybe_result = CompileToplevel(parse_info, isolate, is_compiled_scope);
      
      if (extension === null) compilation_cache.PutScript(source, isolate.native_context(), language_mode, maybe_result);
    }
    return maybe_result;
  }
  static Analyze(parse_info) {
    if (!Rewriter.Rewrite(parse_info)) return false;
    if (!DeclarationScope.Analyze(parse_info)) return false;
    return true;
  }
  static GetSharedFunctionInfo(literal, script, isolate) {
    /**
     * 从缓存中寻找指定字面量的编译信息
     * 理论上第一次是找不到的
     * 但是在xcode上编译了好多次 现在默认有了
     */
    let maybe_existing = script.FindSharedFunctionInfo(isolate, literal);
    if (maybe_existing) {
      // TODO
      return null;
    }
    return null;
    // return isolate.factory_.NewSharedFunctionInfoForLiteral(literal, script, false);
  }
}

class IsCompiledScope {
  constructor() {
    this.retain_bytecode_=  null;
    this.is_compiled_ = false;
  }
}

class ScriptCompileTimerScope {
  set_hit_isolate_cache() {

  }
  set_consuming_code_cache() {

  }
}

function NewScript(isolate, parse_info, source, script_details, origin_options, natives) {
  let script = parse_info.CreateScript(isolate, source, origin_options, natives);
  // TODO
  return script;
}

// 太复杂了 只展示主要步骤
function CompileToplevel(parse_info, isolate, is_compiled_scope) {
  // TODO
  // 前面这部分设定了一个timer 用来记录编译时间
  if (parse_info.literal_ === null && !Parsing.ParseProgram(parse_info, isolate)) return null;
  // TODO
  // 这部分打了一个log
  let shared_info = GenerateUnoptimizedCodeForToplevel(isolate, parse_info, null, is_compiled_scope);
  FinalizeScriptCompilation(isolate, parse_info);
  return shared_info;
}

/**
 * 生成顶层作用域
 * @param {Isolate*} isolate 
 * @param {ParseInfo*} parse_info 
 * @param {AccountingAllocator*} allocator 内存相关的东西全部弄成null
 * @param {IsCompiledScope*} is_compiled_scope 
 */
function GenerateUnoptimizedCodeForToplevel(isolate, parse_info, allocator, is_compiled_scope) {
  // EnsureSharedFunctionInfosArrayOnScript(parse_info, isolate);
  parse_info.ast_value_factory_.Internalize(isolate);

  if (!Compiler.Analyze(parse_info)) return null;
  // DeclarationScope::AllocateScopeInfos(parse_info, isolate);

  let script = parse_info.script_;
  // let tope_level = isolate.factory_.NewSharedFunctionInfoForLiteral(parse_info.literal_, script, true);

  // 不知道这个while的意义 可能是多线程吧
  let functions_to_compile = [];
  functions_to_compile.push(parse_info.literal_);
  while(functions_to_compile.length) {
    let literal = functions_to_compile.pop();
    let shared_info = Compiler.GetSharedFunctionInfo(literal, script, isolate);
    // if (shared_info.is_compiled()) continue;
    // 处理asm
    // if (UseAsmWasm(literal, parse_info.is_asm_wasm_broken())) {}

    let job = Interpreter.NewCompilationJob(parse_info, literal, allocator, functions_to_compile);
    if (job.ExecuteJob() === CompilationJob_FAILED ||
      FinalizeUnoptimizedCompilationJob(job, shared_info, isolate) === CompilationJob_FAILED) {
      return null;
    }

    // if (FLAG_stress_lazy_source_positions) {}
    
    // if (shared_info.is_identical_to(tope_level)) {
    //   is_compiled_scope = shared_info.is_compiled_scope();
    // }
  }
  parse_info.ResetCharacterStream();
  return tope_level;
}

function FinalizeUnoptimizedCompilationJob(job, shared_info, isolate) {
  let compilation_info = job.compilation_info_;
  let parse_info = job.parse_info_;

  SetSharedFunctionFlagsFromLiteral(compilation_info.literal_, shared_info);

  let status = job.FinalizeJob(shared_info, isolate);
  if (status === CompilationJob_SUCCEEDED) {
    // InstallUnoptimizedCode(compilation_info, shared_info, parse_info, isolate);
    // let log_tag = null;
    // if (parse_info.is_toplevel()) {
    //   log_tag = compilation_info.is_eval() ? CodeEventListener_EVAL_TAG : CodeEventListener_SCRIPT_TAG;
    // } else {
    //   log_tag = parse_info.lazy_compile() ? CodeEventListener_LAZY_COMPILE_TAG : CodeEventListener_FUNCTION_TAG;
    // }
    // job.RecordFunctionCompilation(log_tag, shared_info, isolate);
    // job.RecordCompilationStats(isolate);
  }
  return status;
}

function SetSharedFunctionFlagsFromLiteral(literal, shared_info) {
  return null;
  shared_info.set_has_duplicate_parameters(literal.has_duplicate_parameters());
  shared_info.set_is_oneshot_iife(literal.is_oneshot_iife());
  shared_info.UpdateAndFinalizeExpectedNofPropertiesFromEstimate(literal);
  if (literal.dont_optimize_reason() !== BailoutReason_kNoReason) {
    shared_info.DisableOptimization(literal.dont_optimize_reason());
  }
  shared_info.set_is_safe_to_skip_arguments_adaptor(literal.SafeToSkipArgumentsAdaptor());
}

function InstallUnoptimizedCode() {

}

function FinalizeScriptCompilation() {

}

function EnsureSharedFunctionInfosArrayOnScript(parse_info, isolate){}

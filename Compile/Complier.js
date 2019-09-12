import Parsing from "./Parsing";
import ParseInfo from "./ParseInfo";
import Scope from "../Parsing/Scope";
import Interpreter from "./Interpreter";
import { FLAG_stress_lazy_source_positions } from "./Flag";
import { FLAG_use_strict } from "./Flag";
import { kEagerCompile } from "../enum";

export const SUCCEEDED = 0;
export const FAILED = 0;

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

  }
  static GetSharedFunctionInfo() {}
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
  // more
  return script;
}

// 太复杂了 只展示主要步骤
function CompileToplevel(parse_info, isolate, is_compiled_scope) {
  // more
  if (parse_info.literal_ === null && Parsing.ParseProgram(parse_info, isolate)) return;
  // more
  let shared_info = GenerateUnoptimizedCodeForToplevel(isolate, parse_info, null, is_compiled_scope);
  FinalizeScriptCompilation(isolate, parse_info);
  return shared_info;
}

/**
 * 编译顶层作用域
 * @param {Isolate*} isolate 
 * @param {ParseInfo*} parse_info 
 * @param {AccountingAllocator*} allocator 内存相关的东西全部弄成null
 * @param {IsCompiledScope*} is_compiled_scope 
 */
function GenerateUnoptimizedCodeForToplevel(isolate, parse_info, allocator, is_compiled_scope) {
  EnsureSharedFunctionInfosArrayOnScript(parse_info, isolate);
  parse_info.ast_value_factory_.Internalize(isolate);

  if (!Compiler.Analyze(parse_info)) return null;
  Scope.DeclarationScope(parse_info, isolate);

  let script = parse_info.script_;
  let tope_level = isolate.factory_.NewSharedFunctionInfoForLiteral(parse_info.literal_, script, true);

  // 不知道这个while的意义 可能是多线程吧
  // let functions_to_compile = [];
  // functions_to_compile.push(parse_info.literal_);
  // while(functions_to_compile.length) {
  //   let literal = functions_to_compile.pop();
  //   // more...
  // }
  let literal = parse_info.literal_;
  let shared_info = Compiler.GetSharedFunctionInfo(literal, script, isolate);
  // if (shared_info.is_compiled()) 
  // 处理asm
  // if (UseAsmWasm(literal, parse_info.is_asm_wasm_broken())) {}

  let job = Interpreter.NewCompilationJob(parse_info, literal, allocator, null);
  if (job.ExecuteJob() === FAILED) return null;

  // if (FLAG_stress_lazy_source_positions) ...
  
  if (shared_info.is_identical_to(tope_level)) is_compiled_scope = shared_info.is_compiled_scope();

  parse_info.ResetCharacterStream();
  return tope_level;
}

function FinalizeScriptCompilation() {

}
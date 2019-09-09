import { 
  kNoCompileOptions, 
  kNoCacheNoReason,
  kConsumeCodeCache,
  NOT_NATIVES_CODE,
  kIsSharedCrossOrigin,
  kIsWasm,
  kIsOpaque,
  kIsModule,
  kEagerCompile,
  TYPE_NORMAL,
} from "../enum";
import ParseInfo from "./ParseInfo";
import { FLAG_use_strict } from "./Flag";
import Parsing from "./Parsing";

function NewScript(isolate, parse_info, source, script_details, origin_options, natives) {
  let script = parse_info.CreateScript(isolate, source, origin_options, natives);
  // more
  return script;
}

function CompileToplevel(parse_info, isolate, is_compiled_scope) {
  // more
  if(parse_info.literal_ === null && Parsing.ParseProgram(parse_info, isolate)) return;
  // more
} 

class Compiler {
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
    if(extension === null) {
      let can_consume_code_cache = compile_options === kConsumeCodeCache;
      if(can_consume_code_cache) compile_timer.set_consuming_code_cache();
      maybe_result = compilation_cache.LookupScript(source, script_details.name_obj, script_details.line_offset,
        script_details.column_offset, origin_options, isolate.native_context(), language_mode);
      if(maybe_result) compile_timer.set_hit_isolate_cache();
      else if(can_consume_code_cache) {
        compile_timer.set_consuming_code_cache();
        // more
      }
    }
    if(maybe_result === null) {
      let parse_info = new ParseInfo(isolate);
      NewScript(isolate, parse_info, source, script_details, origin_options, natives);
      if(origin_options.IsModule()) parse_info.set_module();
      parse_info.extension_ = extension;
      parse_info.set_eager(compile_options === kEagerCompile);

      parse_info.set_language_mode(language_mode);
      maybe_result = CompileToplevel(parse_info, isolate, is_compiled_scope);
      // more
    }
  }
}

function GetScriptDetails(isolate, resource_name, resource_line_offset, resource_column_offset, source_map_url, host_defined_options) {
  let script_details = new ScriptDetails();
  if(resource_name) script_details.name_obj = resource_name;
  if(resource_line_offset) script_details.line_offset = resource_line_offset;
  if(resource_column_offset) script_details.column_offset = resource_column_offset;

  script_details.host_defined_options = isolate.factory_.empty_fixed_array();
  if(host_defined_options) script_details.host_defined_options = host_defined_options;
  if(source_map_url) script_details.source_map_url = source_map_url;
  return script_details;
}

class ScriptCompiler {
  static Compile(context, source, options = kNoCompileOptions, no_cache_reason = kNoCacheNoReason) {
    let isolate = context.GetIsolate();
    let maybe = this.CompileUnboundInternal(isolate, source, options, no_cache_reason);
    // more
  }
  static CompileUnboundInternal(isolate, source, options, no_cache_reason) {
    let script_data = new ScriptData();
    if(options === kConsumeCodeCache) script_data = new ScriptData(source.cached_data.data, source.cached_data.length);
    let script_details = GetScriptDetails(isolate, source.resource_name, source.resource_line_offset,
      source.resource_column_offset, source.source_map_url, source.host_defined_options);
    let maybe_function_info = Compiler.GetSharedFunctionInfoForScript(isolate, source.source_string, script_details,
      source.resource_options, null, script_data, options, no_cache_reason, NOT_NATIVES_CODE);
    // more
  }
}

class ScriptData {
  constructor(data = '', length = 0) {
    this.data_ = data;
    this.length_ = length;
    this.owns_data_ = true;
    this.rejected_ = true;
  }
}

class ScriptDetails {
  constructor() {
    this.line_offset = 0;
    this.column_offset = 0;

    this.name_obj = null;
    this.source_map_url = null;
    this.host_defined_options = null;
  }
}

class Source {
  constructor(source_string, data = null) {
    this.source_string = source_string;
    this.cached_data = data;

    this.resource_name = '';
    this.resource_line_offset = 0;
    this.resource_column_offset = 0;
    this.resource_options = new ScriptOriginOptions();
    this.source_map_url = '';
    this.host_defined_options = null;
  }
}

class ScriptOriginOptions {
  constructor(is_shared_cross_origin = false, is_opaque = false, is_wasm = false, is_module = false) {
    this.flags_ = (is_shared_cross_origin ? kIsSharedCrossOrigin : 0) | 
    (is_wasm ? kIsWasm : 0) | (is_opaque ? kIsOpaque : 0) | (is_module ? kIsModule : 0);
  }
  IsSharedCrossOrigin() { return (this.flags_ & kIsSharedCrossOrigin) !== 0; }
  IsOpaque() { return (this.flags_ & kIsOpaque) !== 0; }
  IsWasm() { return (this.flags_ & kIsWasm) !== 0; }
  IsModule() { return (this.flags_ & kIsModule) !== 0; }

  Flags() { return this.flags_; }
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

export default class Script {
  constructor(type) {
    this.type_ = type;
  }
  IsUserJavaScript() {
    return this.type_ === TYPE_NORMAL;
  }
  // TODO
  is_wrapped() {
    return false;
  }
  static Compile(context, source, origin = null) {
    if(origin) {
      let script_source = new Source(source, origin);
      return ScriptCompiler.Compile(context, script_source);
    }
    let script_source = new Source(source);
    return ScriptCompiler.Compile(context, script_source);
  }
}
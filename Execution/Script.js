import { 
  kNoCompileOptions, 
  kNoCacheNoReason,
  kConsumeCodeCache,
  NOT_NATIVES_CODE,
  kIsSharedCrossOrigin,
  kIsWasm,
  kIsOpaque,
  kIsModule,
  TYPE_NORMAL,
} from "../enum";

import Compiler from "../Compile/Complier";

function GetScriptDetails(isolate, resource_name, resource_line_offset, resource_column_offset, source_map_url, host_defined_options) {
  let script_details = new ScriptDetails();
  if (resource_name) script_details.name_obj = resource_name;
  if (resource_line_offset) script_details.line_offset = resource_line_offset;
  if (resource_column_offset) script_details.column_offset = resource_column_offset;

  script_details.host_defined_options = isolate.factory_.empty_fixed_array();
  if (host_defined_options) script_details.host_defined_options = host_defined_options;
  if (source_map_url) script_details.source_map_url = source_map_url;
  return script_details;
}

class ScriptCompiler {
  static Compile(context, source, options = kNoCompileOptions, no_cache_reason = kNoCacheNoReason) {
    let isolate = context.GetIsolate();
    let maybe = this.CompileUnboundInternal(isolate, source, options, no_cache_reason);

    // v8::Context::Scope scope(context);
    return maybe.BindToCurrentContext();
  }
  static CompileUnboundInternal(isolate, source, options, no_cache_reason) {
    let script_data = new ScriptData();
    if (options === kConsumeCodeCache) script_data = new ScriptData(source.cached_data.data, source.cached_data.length);
    let script_details = GetScriptDetails(isolate, source.resource_name, source.resource_line_offset,
      source.resource_column_offset, source.source_map_url, source.host_defined_options);
    let maybe_function_info = Compiler.GetSharedFunctionInfoForScript(isolate, source.source_string, script_details,
      source.resource_options, null, script_data, options, no_cache_reason, NOT_NATIVES_CODE);
    
    // if (options === kConsumeCodeCache) 
    return new UnboundScript(maybe_function_info);
  }
}

class UnboundScript{}

class ScriptData {
  constructor(data = '', length = 0) {
    this.data_ = data;
    this.length_ = length;
    this.owns_data_ = true;
    this.rejected_ = true;
  }
}

export class ScriptDetails {
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

export class ScriptOriginOptions {
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
  FindSharedFunctionInfo(isolate, fun) {}
  static Compile(context, source, origin = null) {
    if (origin) {
      let script_source = new Source(source, origin);
      return ScriptCompiler.Compile(context, script_source);
    }
    let script_source = new Source(source);
    return ScriptCompiler.Compile(context, script_source);
  }
}
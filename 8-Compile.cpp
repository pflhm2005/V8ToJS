/**
 * v8sample中的编译代码
 */
v8::Local<v8::Script> script = v8::Script::Compile(context, source).ToLocalChecked();
MaybeLocal<Script> Script::Compile(Local<Context> context, Local<String> source,
                                   ScriptOrigin* origin) {
  if (origin) {
    ScriptCompiler::Source script_source(source, *origin);
    return ScriptCompiler::Compile(context, &script_source);
  }
  ScriptCompiler::Source script_source(source);
  return ScriptCompiler::Compile(context, &script_source);
}
static V8_WARN_UNUSED_RESULT MaybeLocal<Script> Compile(
      Local<Context> context, Source* source,
      CompileOptions options = kNoCompileOptions,
      NoCacheReason no_cache_reason = kNoCacheNoReason);

// 1
MaybeLocal<Script> ScriptCompiler::Compile(Local<Context> context,
                                           Source* source,
                                           CompileOptions options,
                                           NoCacheReason no_cache_reason) {\
  auto isolate = context->GetIsolate();
  // 入口
  auto maybe = CompileUnboundInternal(isolate, source, options, no_cache_reason);
  Local<UnboundScript> result;
  if (!maybe.ToLocal(&result)) return MaybeLocal<Script>();
  v8::Context::Scope scope(context);
  return result->BindToCurrentContext();
} 
// 2
MaybeLocal<UnboundScript> ScriptCompiler::CompileUnboundInternal(
    Isolate* v8_isolate, Source* source, CompileOptions options,
    NoCacheReason no_cache_reason) {
  auto isolate = reinterpret_cast<i::Isolate*>(v8_isolate);
  TRACE_EVENT_CALL_STATS_SCOPED(isolate, "v8", "V8.ScriptCompiler");
  ENTER_V8_NO_SCRIPT(isolate, v8_isolate->GetCurrentContext(), ScriptCompiler,
                     CompileUnbound, MaybeLocal<UnboundScript>(),
                     InternalEscapableScope);

  i::ScriptData* script_data = nullptr;

  i::Handle<i::String> str = Utils::OpenHandle(*(source->source_string));
  i::Handle<i::SharedFunctionInfo> result;
  // 默认对象
  i::Compiler::ScriptDetails script_details = GetScriptDetails(
      isolate, source->resource_name, source->resource_line_offset,
      source->resource_column_offset, source->source_map_url,
      source->host_defined_options);
  // 入口
  i::MaybeHandle<i::SharedFunctionInfo> maybe_function_info =
      i::Compiler::GetSharedFunctionInfoForScript(
          isolate, str, script_details, source->resource_options, nullptr,
          script_data, options, no_cache_reason, i::NOT_NATIVES_CODE);

  delete script_data;
  has_pending_exception = !maybe_function_info.ToHandle(&result);
  RETURN_ON_FAILED_EXECUTION(UnboundScript);
  RETURN_ESCAPED(ToApiHandle<UnboundScript>(result));
}
// 3
/**
 * 参数过多 整理如下
 * isolate 略
 * source => 编译源码字符串
 * script_details => 编译描述对象
 * origin_options => 编译参数对象 is_shared_cross_origin、is_opaque、is_wasm、is_module全是false
 * extension => null
 * cached_data => null
 * compile_options => kNoCompileOptions
 * no_cache_reason => kNoCacheNoReason
 * natives => i::NOT_NATIVES_CODE
 */
MaybeHandle<SharedFunctionInfo> Compiler::GetSharedFunctionInfoForScript(
    Isolate* isolate, Handle<String> source,
    const Compiler::ScriptDetails& script_details,
    ScriptOriginOptions origin_options, v8::Extension* extension,
    ScriptData* cached_data, ScriptCompiler::CompileOptions compile_options,
    ScriptCompiler::NoCacheReason no_cache_reason, NativesFlag natives) {
  ScriptCompileTimerScope compile_timer(isolate, no_cache_reason);

  int source_length = source->length();
  isolate->counters()->total_load_size()->Increment(source_length);
  isolate->counters()->total_compile_size()->Increment(source_length);

  LanguageMode language_mode = construct_language_mode(FLAG_use_strict);
  CompilationCache* compilation_cache = isolate->compilation_cache();

  MaybeHandle<SharedFunctionInfo> maybe_result;
  IsCompiledScope is_compiled_scope;

  if (maybe_result.is_null()) {
    // tag
    ParseInfo parse_info(isolate);
    NewScript(isolate, &parse_info, source, script_details, origin_options,
              natives);

    if (origin_options.IsModule()) parse_info.set_module();
    parse_info.set_extension(extension);
    parse_info.set_eager(compile_options == ScriptCompiler::kEagerCompile);

    parse_info.set_language_mode(
        stricter_language_mode(parse_info.language_mode(), language_mode));

    // 入口   
    maybe_result = CompileToplevel(&parse_info, isolate, &is_compiled_scope);
    Handle<SharedFunctionInfo> result;
    if (extension == nullptr && maybe_result.ToHandle(&result)) {
      DCHECK(is_compiled_scope.is_compiled());
      compilation_cache->PutScript(source, isolate->native_context(),
                                   language_mode, result);
    } else if (maybe_result.is_null() && natives != EXTENSION_CODE) {
      isolate->ReportPendingMessages();
    }
  }

  return maybe_result;
}
// 4
MaybeHandle<SharedFunctionInfo> CompileToplevel(
    ParseInfo* parse_info, Isolate* isolate,
    IsCompiledScope* is_compiled_scope) {
  TimerEventScope<TimerEventCompileCode> top_level_timer(isolate);
  TRACE_EVENT0(TRACE_DISABLED_BY_DEFAULT("v8.compile"), "V8.CompileCode");
  DCHECK_EQ(ThreadId::Current(), isolate->thread_id());

  PostponeInterruptsScope postpone(isolate);
  DCHECK(!isolate->native_context().is_null());
  RuntimeCallTimerScope runtimeTimer(
      isolate, parse_info->is_eval() ? RuntimeCallCounterId::kCompileEval
                                     : RuntimeCallCounterId::kCompileScript);
  VMState<BYTECODE_COMPILER> state(isolate);
  if (parse_info->literal() == nullptr &&
      !parsing::ParseProgram(parse_info, isolate)) {
    return MaybeHandle<SharedFunctionInfo>();
  }
  // Measure how long it takes to do the compilation; only take the
  // rest of the function into account to avoid overlap with the
  // parsing statistics.
  HistogramTimer* rate = parse_info->is_eval()
                             ? isolate->counters()->compile_eval()
                             : isolate->counters()->compile();
  HistogramTimerScope timer(rate);
  TRACE_EVENT0(TRACE_DISABLED_BY_DEFAULT("v8.compile"),
               parse_info->is_eval() ? "V8.CompileEval" : "V8.Compile");

  // Generate the unoptimized bytecode or asm-js data.
  // 入口 生成字节码或者机器码
  // 5
  MaybeHandle<SharedFunctionInfo> shared_info =
      GenerateUnoptimizedCodeForToplevel(
          isolate, parse_info, isolate->allocator(), is_compiled_scope);
  if (shared_info.is_null()) {
    FailWithPendingException(isolate, parse_info,
                             Compiler::ClearExceptionFlag::KEEP_EXCEPTION);
    return MaybeHandle<SharedFunctionInfo>();
  }

  FinalizeScriptCompilation(isolate, parse_info);
  return shared_info;
}
// 5
MaybeHandle<SharedFunctionInfo> GenerateUnoptimizedCodeForToplevel(
    Isolate* isolate, ParseInfo* parse_info, AccountingAllocator* allocator,
    IsCompiledScope* is_compiled_scope) {
  EnsureSharedFunctionInfosArrayOnScript(parse_info, isolate);
  parse_info->ast_value_factory()->Internalize(isolate);

  if (!Compiler::Analyze(parse_info)) return MaybeHandle<SharedFunctionInfo>();
  DeclarationScope::AllocateScopeInfos(parse_info, isolate);

  // Prepare and execute compilation of the outer-most function.
  // Create the SharedFunctionInfo and add it to the script's list.
  Handle<Script> script = parse_info->script();
  Handle<SharedFunctionInfo> top_level =
      isolate->factory()->NewSharedFunctionInfoForLiteral(parse_info->literal(),
                                                          script, true);

  std::vector<FunctionLiteral*> functions_to_compile;
  functions_to_compile.push_back(parse_info->literal());

  while (!functions_to_compile.empty()) {
    FunctionLiteral* literal = functions_to_compile.back();
    functions_to_compile.pop_back();
    Handle<SharedFunctionInfo> shared_info =
        Compiler::GetSharedFunctionInfo(literal, script, isolate);
    if (shared_info->is_compiled()) continue;
    if (UseAsmWasm(literal, parse_info->is_asm_wasm_broken())) {
      std::unique_ptr<UnoptimizedCompilationJob> asm_job(
          AsmJs::NewCompilationJob(parse_info, literal, allocator));
      if (asm_job->ExecuteJob() == CompilationJob::SUCCEEDED &&
          FinalizeUnoptimizedCompilationJob(asm_job.get(), shared_info,
                                            isolate) ==
              CompilationJob::SUCCEEDED) {
        continue;
      }
      // asm.js validation failed, fall through to standard unoptimized compile.
      // Note: we rely on the fact that AsmJs jobs have done all validation in
      // the PrepareJob and ExecuteJob phases and can't fail in FinalizeJob with
      // with a validation error or another error that could be solve by falling
      // through to standard unoptimized compile.
    }

    std::unique_ptr<UnoptimizedCompilationJob> job(
        interpreter::Interpreter::NewCompilationJob(
            parse_info, literal, allocator, &functions_to_compile));

    if (job->ExecuteJob() == CompilationJob::FAILED ||
        FinalizeUnoptimizedCompilationJob(job.get(), shared_info, isolate) ==
            CompilationJob::FAILED) {
      return MaybeHandle<SharedFunctionInfo>();
    }

    if (shared_info.is_identical_to(top_level)) {
      // Ensure that the top level function is retained.
      *is_compiled_scope = shared_info->is_compiled_scope();
      DCHECK(is_compiled_scope->is_compiled());
    }
  }

  // Character stream shouldn't be used again.
  parse_info->ResetCharacterStream();

  return top_level;
}
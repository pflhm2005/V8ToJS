if (UseAsmWasm(literal, parse_info->is_asm_wasm_broken())) {
  // 静态方法 专门生成UnoptimizedCompilationJob实例
  std::unique_ptr<UnoptimizedCompilationJob> asm_job(AsmJs::NewCompilationJob(parse_info, literal, allocator));
  /**
   * 这里的2步对应下面的注释
   */
  if (asm_job->ExecuteJob() == CompilationJob::SUCCEEDED &&
      FinalizeUnoptimizedCompilationJob(asm_job.get(), shared_info, isolate) == CompilationJob::SUCCEEDED) {
    continue;
  }
}

UnoptimizedCompilationJob* AsmJs::NewCompilationJob(
    ParseInfo* parse_info, FunctionLiteral* literal,
    AccountingAllocator* allocator) {
  return new AsmJsCompilationJob(parse_info, literal, allocator);
}

// The compilation of asm.js modules is split into two distinct steps:
//  [1] ExecuteJobImpl: The asm.js module source is parsed, validated, and
//      translated to a valid WebAssembly module. The result are two vectors
//      representing the encoded module as well as encoded source position
//      information and a StdlibSet bit set.
//  [2] FinalizeJobImpl: The module is handed to WebAssembly which decodes it
//      into an internal representation and eventually compiles it to machine
//      code.
class AsmJsCompilationJob final : public UnoptimizedCompilationJob {
 public:
  explicit AsmJsCompilationJob(ParseInfo* parse_info, FunctionLiteral* literal,
                               AccountingAllocator* allocator)
      : UnoptimizedCompilationJob(parse_info->stack_limit(), parse_info,
                                  &compilation_info_),
        allocator_(allocator),
        zone_(allocator, ZONE_NAME),
        compilation_info_(&zone_, parse_info, literal),
        module_(nullptr),
        asm_offsets_(nullptr),
        translate_time_(0),
        compile_time_(0),
        module_source_size_(0),
        translate_time_micro_(0),
        translate_zone_size_(0) {}
}

CompilationJob::Status OptimizedCompilationJob::ExecuteJob() {
  DisallowHeapAccess no_heap_access;
  // Delegate to the underlying implementation.
  DCHECK_EQ(state(), State::kReadyToExecute);
  ScopedTimer t(&time_taken_to_execute_);
  return UpdateState(ExecuteJobImpl(), State::kReadyToFinalize);
}

UnoptimizedCompilationJob::Status AsmJsCompilationJob::ExecuteJobImpl() {
  // Step 1: Translate asm.js module to WebAssembly module.
  size_t compile_zone_start = compilation_info()->zone()->allocation_size();
  base::ElapsedTimer translate_timer;
  translate_timer.Start();

  Zone* compile_zone = compilation_info()->zone();
  Zone translate_zone(allocator_, ZONE_NAME);

  Utf16CharacterStream* stream = parse_info()->character_stream();
  base::Optional<AllowHandleDereference> allow_deref;
  if (stream->can_access_heap()) {
    allow_deref.emplace();
  }
  stream->Seek(compilation_info()->literal()->start_position());
  /**
   * 初始化一个parser对象
   * Run方法负责解析
   */
  wasm::AsmJsParser parser(&translate_zone, stack_limit(), stream);
  if (!parser.Run()) {
    if (!FLAG_suppress_asm_messages) {
      ReportCompilationFailure(parse_info(), parser.failure_location(),
                               parser.failure_message());
    }
    return FAILED;
  }
  module_ = new (compile_zone) wasm::ZoneBuffer(compile_zone);
  parser.module_builder()->WriteTo(*module_);
  asm_offsets_ = new (compile_zone) wasm::ZoneBuffer(compile_zone);
  parser.module_builder()->WriteAsmJsOffsetTable(*asm_offsets_);
  stdlib_uses_ = *parser.stdlib_uses();

  size_t compile_zone_size =
      compilation_info()->zone()->allocation_size() - compile_zone_start;
  translate_zone_size_ = translate_zone.allocation_size();
  translate_time_ = translate_timer.Elapsed().InMillisecondsF();
  translate_time_micro_ = translate_timer.Elapsed().InMicroseconds();
  module_source_size_ = compilation_info()->literal()->end_position() -
                        compilation_info()->literal()->start_position();
  if (FLAG_trace_asm_parser) {
    PrintF(
        "[asm.js translation successful: time=%0.3fms, "
        "translate_zone=%zuKB, compile_zone+=%zuKB]\n",
        translate_time_, translate_zone_size_ / KB, compile_zone_size / KB);
  }
  return SUCCEEDED;
}

// A custom parser + validator + wasm converter for asm.js:
// http://asmjs.org/spec/latest/
// This parser intentionally avoids the portion of JavaScript parsing
// that are not required to determine if code is valid asm.js code.
// * It is mostly one pass.
// * It bails out on unexpected input.
// * It assumes strict ordering insofar as permitted by asm.js validation rules.
// * It relies on a custom scanner that provides de-duped identifiers in two
//   scopes (local + module wide).
class AsmJsParser {}
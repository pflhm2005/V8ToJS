namespace v8 {
namespace interval {

// A container for the inputs, configuration options, and outputs of parsing.
/**
 * 有5个构造函数和大量私有属性
 */
class ParseInfo {
  public:
    explicit ParseInfo(AccountingAllocator* zone_allocator);
    explicit ParseInfo(Isolate*);
    ParseInfo(Isolate*, AccountingAllocator* zone_allocator);
    ParseInfo(Isolate* isolate, Handle<Script> script);
    ParseInfo(Isolate* isolate, Handle<SharedFunctionInfo> shared);
  private:
    // Various configuration flags for parsing.
    enum Flag {
      kToplevel = 1 << 0,
      kEager = 1 << 1,
      kEval = 1 << 2,
      kStrictMode = 1 << 3,
      kNative = 1 << 4,
      // ...more
    };
    unsigned flags_;
    void SetFlag(Flag f) { flags_ |= f; }
    void SetFlag(Flag f, bool v) { flags_ = v ? flags_ | f : flags_ & ~f; }
    bool GetFlag(Flag f) const { return (flags_ & f) != 0; }
};

/**
 * 编译时的声明
 */
ParseInfo parse_info(isolate);

/**
 * 调用第二个构造函数
 * 初始化script_id_
 */
ParseInfo::ParseInfo(Isolate* isolate) : ParseInfo(isolate, isolate->allocator()) {
  script_id_ = isolate->heap()->NextScriptId();
  LOG(isolate, ScriptEvent(Logger::ScriptEventType::kReserveId, script_id_));
}

/**
 * 调用第三个构造函数
 * 初始化大量私有属性
 */
ParseInfo::ParseInfo(Isolate* isolate, AccountingAllocator* zone_allocator) : ParseInfo(zone_allocator) {
  set_hash_seed(HashSeed(isolate));
  set_stack_limit(isolate->stack_guard()->real_climit());
  set_runtime_call_stats(isolate->counters()->runtime_call_stats());
  set_logger(isolate->logger());
  set_ast_string_constants(isolate->ast_string_constants());
  set_collect_source_positions(!FLAG_enable_lazy_source_positions ||
                               isolate->NeedsDetailedOptimizedCodeLineInfo());
  if (!isolate->is_best_effort_code_coverage()) set_coverage_enabled();
  if (isolate->is_block_code_coverage()) set_block_coverage_enabled();
  if (isolate->is_collecting_type_profile()) set_collect_type_profile();
  if (isolate->compiler_dispatcher()->IsEnabled()) {
    parallel_tasks_.reset(new ParallelTasks(isolate->compiler_dispatcher()));
  }
  set_might_always_opt(FLAG_always_opt || FLAG_prepare_always_opt);
  set_allow_lazy_compile(FLAG_lazy);
  set_allow_natives_syntax(FLAG_allow_natives_syntax);
  set_allow_harmony_dynamic_import(FLAG_harmony_dynamic_import);
  set_allow_harmony_import_meta(FLAG_harmony_import_meta);
  set_allow_harmony_numeric_separator(FLAG_harmony_numeric_separator);
  set_allow_harmony_private_methods(FLAG_harmony_private_methods);
}

/**
 * 最后一个构造函数 初始化又一坨属性
 */
ParseInfo::ParseInfo(AccountingAllocator* zone_allocator)
  : zone_(base::make_unique<Zone>(zone_allocator, ZONE_NAME)),
    flags_(0),
    extension_(nullptr),
    script_scope_(nullptr),
    stack_limit_(0),
    hash_seed_(0),
    function_kind_(FunctionKind::kNormalFunction),
    script_id_(-1),
    start_position_(0),
    end_position_(0),
    parameters_end_pos_(kNoSourcePosition),
    function_literal_id_(kFunctionLiteralIdInvalid),
    max_function_literal_id_(kFunctionLiteralIdInvalid),
    character_stream_(nullptr),
    ast_value_factory_(nullptr),
    ast_string_constants_(nullptr),
    function_name_(nullptr),
    runtime_call_stats_(nullptr),
    source_range_map_(nullptr),
    literal_(nullptr) {}

}
}

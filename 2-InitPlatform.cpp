// statement
v8::V8::InitializePlatform(platform.get());

v8::Platform* V8::platform_ = nullptr;

// get是智能指针的api
void V8::InitializePlatform(v8::Platform* platform) {
  CHECK(!platform_);
  CHECK(platform);
  // 转移 从v8::
  platform_ = platform;
  // 1-1
  v8::base::SetPrintStackTrace(platform_->GetStackTracePrinter());
  // 1-2
  v8::tracing::TracingCategoryObserver::SetUp();
}

// v8::platform
// 预定义
void PrintStackTrace() {
  v8::base::debug::StackTrace trace;
  trace.Print();
  // Avoid dumping duplicate stack trace on abort signal.
  v8::base::debug::DisableSignalStackDump();
}
// 返回的是一个函数指针
Platform::StackTracePrinter DefaultPlatform::GetStackTracePrinter() {
  return PrintStackTrace;
}

// v8::base
void (*g_print_stack_trace)() = nullptr;
void SetPrintStackTrace(void (*print_stack_trace)()) {
  g_print_stack_trace = print_stack_trace;
}

// v8::tracing
// 1-2
TracingCategoryObserver* TracingCategoryObserver::instance_ = nullptr;
void TracingCategoryObserver::SetUp() {
  // 1-3 
  // 生成一个新的Observer 这个类构造函数没什么特殊
  TracingCategoryObserver::instance_ = new TracingCategoryObserver();
  // 1-4
  // v8::platform::tracing
  i::V8::GetCurrentPlatform()->GetTracingController()->AddTraceStateObserver(TracingCategoryObserver::instance_);
}

// 1-4
void TracingController::AddTraceStateObserver(v8::TracingController::TraceStateObserver* observer) {
  {
    base::MutexGuard lock(mutex_.get());
    // TracingController的属性std::unordered_set<v8::TracingController::TraceStateObserver*> observers_;
    // insert是unordered_set的插入方法
    observers_.insert(observer);
    if (!recording_.load(std::memory_order_acquire)) return;
  }
  // 1-5
  // Fire the observer if recording is already in progress.
  observer->OnTraceEnabled();
}

// 1-3
class TracingCategoryObserver : public TracingController::TraceStateObserver {
 public:
  enum Mode {
    ENABLED_BY_NATIVE = 1 << 0,
    ENABLED_BY_TRACING = 1 << 1,
    ENABLED_BY_SAMPLING = 1 << 2,
  };

  static void SetUp();
  static void TearDown();

  // v8::TracingController::TraceStateObserver
  void OnTraceEnabled() final;
  void OnTraceDisabled() final;

 private:
  static TracingCategoryObserver* instance_;
};

// 1-4
void TracingController::AddTraceStateObserver(v8::TracingController::TraceStateObserver* observer) {
  {
    base::MutexGuard lock(mutex_.get());
    observers_.insert(observer);
    if (!recording_.load(std::memory_order_acquire)) return;
  }
  // 1-5
  // Fire the observer if recording is already in progress.
  observer->OnTraceEnabled();
}

// 1-5
void TracingCategoryObserver::OnTraceEnabled() {
  bool enabled = false;
  // 1-6
  TRACE_EVENT_CATEGORY_GROUP_ENABLED(
      // 1-7
      TRACE_DISABLED_BY_DEFAULT("v8.runtime_stats"), &enabled);
  if (enabled) {
    base::AsAtomic32::Relaxed_Store(
        &v8::internal::FLAG_runtime_stats,
        (v8::internal::FLAG_runtime_stats | ENABLED_BY_TRACING));
  }
  TRACE_EVENT_CATEGORY_GROUP_ENABLED(
      TRACE_DISABLED_BY_DEFAULT("v8.runtime_stats_sampling"), &enabled);
  if (enabled) {
    base::AsAtomic32::Relaxed_Store(
        &v8::internal::FLAG_runtime_stats,
        v8::internal::FLAG_runtime_stats | ENABLED_BY_SAMPLING);
  }
  TRACE_EVENT_CATEGORY_GROUP_ENABLED(TRACE_DISABLED_BY_DEFAULT("v8.gc_stats"),
                                     &enabled);
  if (enabled) {
    v8::internal::FLAG_gc_stats |= ENABLED_BY_TRACING;
  }
  TRACE_EVENT_CATEGORY_GROUP_ENABLED(TRACE_DISABLED_BY_DEFAULT("v8.ic_stats"),
                                     &enabled);
  if (enabled) {
    v8::internal::FLAG_ic_stats |= ENABLED_BY_TRACING;
  }
}
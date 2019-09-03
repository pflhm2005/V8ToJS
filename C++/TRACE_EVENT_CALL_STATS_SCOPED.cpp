TRACE_EVENT_CALL_STATS_SCOPED(isolate, "v8", "V8.NewContext");

#define TRACE_EVENT_CALL_STATS_SCOPED(isolate, category_group, name) \
  INTERNAL_TRACE_EVENT_CALL_STATS_SCOPED(isolate, category_group, name)

#define INTERNAL_TRACE_EVENT_CALL_STATS_SCOPED(isolate, category_group, name)  \
  INTERNAL_TRACE_EVENT_GET_CATEGORY_INFO(category_group);                      \
  v8::internal::tracing::CallStatsScopedTracer INTERNAL_TRACE_EVENT_UID(tracer);  \
  if (INTERNAL_TRACE_EVENT_CATEGORY_GROUP_ENABLED_FOR_RECORDING_MODE()) {      \
    INTERNAL_TRACE_EVENT_UID(tracer)                                           \
        .Initialize(isolate, INTERNAL_TRACE_EVENT_UID(category_group_enabled), \
                    name);                                                     \
  }

enum CategoryGroupEnabledFlags {
  // Category group enabled for the recording mode.
  kEnabledForRecording_CategoryGroupEnabledFlags = 1 << 0,
  // Category group enabled by SetEventCallbackEnabled().
  kEnabledForEventCallback_CategoryGroupEnabledFlags = 1 << 2,
  // Category group enabled to export events to ETW.
  kEnabledForETWExport_CategoryGroupEnabledFlags = 1 << 3,
};

// 宏翻译
{
  static v8::base::AtomicWord trace_event_unique_atomic79 = 0;
  const uint8_t* trace_event_unique_category_group_enabled_79;
  trace_event_unique_category_group_enabled_79 = reinterpret_cast<const uint8_t*>(v8::base::Relaxed_Load(&(trace_event_unique_atomic79)));
  if (!trace_event_unique_category_group_enabled_79) {
    trace_event_unique_category_group_enabled_79 = v8::internal::tracing::TraceEventHelper::GetTracingController()->GetCategoryGroupEnabled;
    v8::base::Relaxed_Store(&(trace_event_unique_atomic79), reinterpret_cast<v8::base::AtomicWord>(trace_event_unique_category_group_enabled_79));
  }

  v8::internal::tracing::CallStatsScopedTracer trace_event_unique_tracer79;
  if (v8::base::Relaxed_Load(reinterpret_cast<const v8::base::Atomic8*>(trace_event_unique_category_group_enabled_79)
  & (kEnabledForRecording_CategoryGroupEnabledFlags | kEnabledForEventCallback_CategoryGroupEnabledFlags)) {
    trace_event_unique_tracer79.Initialize(isolate, trace_event_unique_category_group_enabled_79, "V8.NewContext");
  }
}


/**
 * 1
 */
#define TRACE_EVENT_API_ATOMIC_WORD v8::base::AtomicWord
#define TRACE_EVENT_API_ATOMIC_LOAD(var) v8::base::Relaxed_Load(&(var))
#define TRACE_EVENT_API_ATOMIC_STORE(var, value) \
  v8::base::Relaxed_Store(&(var), (value))
#define TRACE_EVENT_API_LOAD_CATEGORY_GROUP_ENABLED()                \
  v8::base::Relaxed_Load(reinterpret_cast<const v8::base::Atomic8*>( \
      INTERNAL_TRACE_EVENT_UID(category_group_enabled)))

#define INTERNAL_TRACE_EVENT_UID3(a, b) trace_event_unique_##a##b
#define INTERNAL_TRACE_EVENT_UID2(a, b) INTERNAL_TRACE_EVENT_UID3(a, b)
#define INTERNAL_TRACE_EVENT_UID(name_prefix) \
  INTERNAL_TRACE_EVENT_UID2(name_prefix, __LINE__)

#define INTERNAL_TRACE_EVENT_GET_CATEGORY_INFO_CUSTOM_VARIABLES(category_group, atomic, category_group_enabled)                          \
  category_group_enabled = reinterpret_cast<const uint8_t*>(TRACE_EVENT_API_ATOMIC_LOAD(atomic)); \
  if (!category_group_enabled) {                                             \
    category_group_enabled = TRACE_EVENT_API_GET_CATEGORY_GROUP_ENABLED(category_group);          \
    TRACE_EVENT_API_ATOMIC_STORE(atomic, reinterpret_cast<TRACE_EVENT_API_ATOMIC_WORD>(category_group_enabled));                                \
  }

#define TRACE_EVENT_API_GET_CATEGORY_GROUP_ENABLED                \
  v8::internal::tracing::TraceEventHelper::GetTracingController() \
      ->GetCategoryGroupEnabled

#define INTERNAL_TRACE_EVENT_GET_CATEGORY_INFO(category_group)             \
  static TRACE_EVENT_API_ATOMIC_WORD INTERNAL_TRACE_EVENT_UID(atomic) = 0; \
  const uint8_t* INTERNAL_TRACE_EVENT_UID(category_group_enabled);         \
  INTERNAL_TRACE_EVENT_GET_CATEGORY_INFO_CUSTOM_VARIABLES(                 \
      category_group, INTERNAL_TRACE_EVENT_UID(atomic),                    \
      INTERNAL_TRACE_EVENT_UID(category_group_enabled));

/**
 * 2
 */
#define INTERNAL_TRACE_EVENT_CATEGORY_GROUP_ENABLED_FOR_RECORDING_MODE() \
  TRACE_EVENT_API_LOAD_CATEGORY_GROUP_ENABLED() &                        \
      (kEnabledForRecording_CategoryGroupEnabledFlags |                  \
       kEnabledForEventCallback_CategoryGroupEnabledFlags)

#define TRACE_EVENT_API_LOAD_CATEGORY_GROUP_ENABLED()                \
  v8::base::Relaxed_Load(reinterpret_cast<const v8::base::Atomic8*>( \
      INTERNAL_TRACE_EVENT_UID(category_group_enabled)))
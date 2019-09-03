/**
 * 根据指定options生成一个Isolate
 */
v8::Isolate* isolate = v8::Isolate::New(create_params);

/**
 * 1、生成Isolate类
 * 2、根据配置参数初始化
 */
Isolate* Isolate::New(const Isolate::CreateParams& params) {
  Isolate* isolate = Allocate();
  Initialize(isolate, params);
  return isolate;
}

/**
 * 调用内部internal::Isolate的New方法
 */
Isolate* Isolate::Allocate() {
  return reinterpret_cast<Isolate*>(i::Isolate::New());
}

/**
 * 暴露对外的Isolate类构造函数无法执行new操作
 * 只能通过内部Isolate来构建
 * 内部的Isolate支持特定的new操作
 */
namespace v8 {
  class Isolate {
    private:
      Isolate() = delete;
      void* operator new(size_t size) = delete;
      void* operator new[](size_t size) = delete;
  }
}
namespace internal{
  class Isolate final : private HiddenFactory {
    private:
      void* operator new(size_t, void* ptr) { return ptr; }
      void* operator new(size_t) = delete;
  }
}

/**
 * 暴露对外的v8::Isolate类的构造函数中
 */
static Isolate* New(IsolateAllocationMode mode = IsolateAllocationMode::kDefault);
Isolate* Isolate::New(IsolateAllocationMode mode) {
  /**
   * 注解[1]
   */
  std::unique_ptr<IsolateAllocator> isolate_allocator = base::make_unique<IsolateAllocator>(mode);
  // Construct Isolate object in the allocated memory.
  void* isolate_ptr = isolate_allocator->isolate_memory();
  /**
   * 注解[2]
   */
  Isolate* isolate = new (isolate_ptr) Isolate(std::move(isolate_allocator));

  return isolate;
}

/**
 * 注解[1]
 * 该类负责为Isolate对象分配内存
 * 构造函数根据不同mode以不同方式分配内存
 * 1、分配在C++堆上(禁用指针压缩)
 * 2、在一块V8内部的保留地址空间上(启用指针压缩)
 * 根据配置参数V8_COMPRESS_POINTERS决定默认初始化方式
 * 默认禁用压缩
 */
enum class IsolateAllocationMode {
  // Allocate Isolate in C++ heap using default new/delete operators.
  kInCppHeap,

  // Allocate Isolate in a committed region inside V8 heap reservation.
  kInV8Heap,

#ifdef V8_COMPRESS_POINTERS
  kDefault = kInV8Heap,
#else
  kDefault = kInCppHeap,
#endif
};
IsolateAllocator::IsolateAllocator(IsolateAllocationMode mode) {=
  if (mode == IsolateAllocationMode::kInV8Heap) {
    Address heap_reservation_address = InitReservation();
    CommitPagesForIsolate(heap_reservation_address);
    return;
  }

  // platform上的page_allocator_赋值到IsolateAllocator类上
  page_allocator_ = GetPlatformPageAllocator();
  // 使用原生的new操作符获取C++的堆内存
  isolate_memory_ = ::operator new(sizeof(Isolate));
}

/**
 * 注解[2]
 * std::atomic<int> isolate_counter{0} => A global counter for all generated Isolates, might overflow.
 */
Isolate::Isolate(std::unique_ptr<i::IsolateAllocator> isolate_allocator)
    : isolate_allocator_(std::move(isolate_allocator)),
      id_(isolate_counter.fetch_add(1, std::memory_order_relaxed)),
      stack_guard_(this),
      allocator_(FLAG_trace_zone_stats
                     ? new VerboseAccountingAllocator(&heap_, 256 * KB)
                     : new AccountingAllocator()),
      builtins_(this),
      rail_mode_(PERFORMANCE_ANIMATION),
      code_event_dispatcher_(new CodeEventDispatcher()),
      cancelable_task_manager_(new CancelableTaskManager()) {
  TRACE_ISOLATE(constructor);
  CheckIsolateLayout();

  // ThreadManager is initialized early to support locking an isolate
  // before it is entered.
  thread_manager_ = new ThreadManager(this);

  handle_scope_data_.Initialize();

#define ISOLATE_INIT_EXECUTE(type, name, initial_value)                        \
  name##_ = (initial_value);
  ISOLATE_INIT_LIST(ISOLATE_INIT_EXECUTE)
#undef ISOLATE_INIT_EXECUTE

#define ISOLATE_INIT_ARRAY_EXECUTE(type, name, length)                         \
  memset(name##_, 0, sizeof(type) * length);
  ISOLATE_INIT_ARRAY_LIST(ISOLATE_INIT_ARRAY_EXECUTE)
#undef ISOLATE_INIT_ARRAY_EXECUTE

  InitializeLoggingAndCounters();
  debug_ = new Debug(this);

  InitializeDefaultEmbeddedBlob();

  MicrotaskQueue::SetUpDefaultMicrotaskQueue(this);
}


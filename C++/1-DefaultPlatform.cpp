// statement
std::unique_ptr<v8::Platform> platform = v8::platform::NewDefaultPlatform();

// thread_pool_size => 0
// idle_task_support => kDisabled
// in_process_stack_dumping => kDisabled
// tracing_controller => NULL
std::unique_ptr<v8::Platform> NewDefaultPlatform(
    int thread_pool_size, IdleTaskSupport idle_task_support,
    InProcessStackDumping in_process_stack_dumping,
    std::unique_ptr<v8::TracingController> tracing_controller) {
  // 不会进这里
  // if (in_process_stack_dumping == InProcessStackDumping::kEnabled) {
  //   v8::base::debug::EnableInProcessStackDumping();
  // }

  // 构造函数见下1
  std::unique_ptr<DefaultPlatform> platform(new DefaultPlatform(idle_task_support, std::move(tracing_controller)));
  // 见2
  platform->SetThreadPoolSize(thread_pool_size);
  // 见3
  platform->EnsureBackgroundTaskRunnerInitialized();
  return std::move(platform);
}

/* ------------------------------------------------------------------------------------------------------------------ */

// 1
DefaultPlatform::DefaultPlatform(
    IdleTaskSupport idle_task_support,
    std::unique_ptr<v8::TracingController> tracing_controller)
    : thread_pool_size_(0),
      idle_task_support_(idle_task_support),
      tracing_controller_(std::move(tracing_controller)),
      // 1-1
      page_allocator_(new v8::base::PageAllocator()),
      time_function_for_testing_(nullptr) {
  if (!tracing_controller_) {
    // 1-2
    tracing::TracingController* controller = new tracing::TracingController();
    // 1-3
    controller->Initialize(nullptr);
    // 智能指针替换
    tracing_controller_.reset(controller);
  }
}

// 1-1
class V8_BASE_EXPORT PageAllocator : public NON_EXPORTED_BASE(::v8::PageAllocator) {
  private:
    const size_t allocate_page_size_;
    const size_t commit_page_size_;
}
PageAllocator::PageAllocator()
    : allocate_page_size_(base::OS::AllocatePageSize()),
      commit_page_size_(base::OS::CommitPageSize()) {}

// 4096
size_t OS::AllocatePageSize() {
  return static_cast<size_t>(sysconf(_SC_PAGESIZE));
}
// 4096
size_t OS::CommitPageSize() {
  static size_t page_size = getpagesize();
  return page_size;
}

// 1-2
class V8_PLATFORM_EXPORT TracingController  : public V8_PLATFORM_NON_EXPORTED_BASE(v8::TracingController) {
  // ...
}

// 1-3
void TracingController::Initialize(TraceBuffer* trace_buffer) {
  trace_buffer_.reset(trace_buffer);
  mutex_.reset(new base::Mutex());
}

/* ------------------------------------------------------------------------------------------------------------------ */

// 2
void DefaultPlatform::SetThreadPoolSize(int thread_pool_size) {
  base::MutexGuard guard(&lock_);
  DCHECK_GE(thread_pool_size, 0);
  if (thread_pool_size < 1) {
    // The number of processors currently online (available) => 4
    thread_pool_size = base::SysInfo::NumberOfProcessors() - 1;
  }
  // 1 ~ 8
  thread_pool_size_ = std::max(std::min(thread_pool_size, kMaxThreadPoolSize), 1);
}

/* ------------------------------------------------------------------------------------------------------------------ */

// 3
void DefaultPlatform::EnsureBackgroundTaskRunnerInitialized() {
  // 这里初始化DefaultPlatform的属性 需要加锁
  base::MutexGuard guard(&lock_);
  if (!worker_threads_task_runner_) {
    worker_threads_task_runner_ =
        // 3-2
        std::make_shared<DefaultWorkerThreadsTaskRunner>(
            thread_pool_size_, time_function_for_testing_
                                   ? time_function_for_testing_
                                  // 3-1
                                   : DefaultTimeFunction);
  }
}

// 3-1
double DefaultTimeFunction() {
  return base::TimeTicks::HighResolutionNow().ToInternalValue() /
         static_cast<double>(base::Time::kMicrosecondsPerSecond);
}

// 3-2
// queue_ => DelayedTaskQueue::DelayedTaskQueue(TimeFunction time_function) : time_function_(time_function) {}
DefaultWorkerThreadsTaskRunner::DefaultWorkerThreadsTaskRunner(
    uint32_t thread_pool_size, TimeFunction time_function)
    : queue_(time_function),
      time_function_(time_function),
      thread_pool_size_(thread_pool_size) {
  for (uint32_t i = 0; i < thread_pool_size; ++i) {
    // 3-3
    thread_pool_.push_back(base::make_unique<WorkerThread>(this));
  }
}

// 3-3
DefaultWorkerThreadsTaskRunner::WorkerThread::WorkerThread(DefaultWorkerThreadsTaskRunner* runner)
    // 这里调用父类构造函数
    : Thread(Options("V8 DefaultWorkerThreadsTaskRunner WorkerThread")),
    // 这里初始化当前类属性
      runner_(runner) {
  // 3-4
  Start();
}

// 3-4
void Thread::Start() {
  int result;
  // 线程对象
  pthread_attr_t attr;
  memset(&attr, 0, sizeof(attr));
  // 初始化线程对象
  result = pthread_attr_init(&attr);
  size_t stack_size = stack_size_;
  if (stack_size == 0) {
    stack_size = 1 * 1024 * 1024;
  }
  if (stack_size > 0) {
    // 设置线程对象属性
    result = pthread_attr_setstacksize(&attr, stack_size);
  }
  {
    // 创建一个新线程
    // 3-5
    result = pthread_create(&data_->thread_, &attr, ThreadEntry, this);
  }
  // 摧毁线程对象
  result = pthread_attr_destroy(&attr);
}

// 3-5
static void* ThreadEntry(void* arg) {
  Thread* thread = reinterpret_cast<Thread*>(arg);
  // We take the lock here to make sure that pthread_create finished first since
  // we don't know which thread will run first (the original thread or the new
  // one).
  { MutexGuard lock_guard(&thread->data()->thread_creation_mutex_); }
  // 3-6
  SetThreadName(thread->name());
  // 3-7
  thread->NotifyStartedAndRun();
  return nullptr;
}

// 3-6
static void SetThreadName(const char* name) {
  // pthread_setname_np is only available in 10.6 or later, so test
  // for it at runtime.
  int (*dynamic_pthread_setname_np)(const char*);
  // 读取动态链接库
  *reinterpret_cast<void**>(&dynamic_pthread_setname_np) =
    dlsym(RTLD_DEFAULT, "pthread_setname_np");
  if (dynamic_pthread_setname_np == nullptr) return;

  // Mac OS X does not expose the length limit of the name, so hardcode it.
  static const int kMaxNameLength = 63;
  // 从读取到的方法处理name
  dynamic_pthread_setname_np(name);
}

// 3-7
void NotifyStartedAndRun() {
  if (start_semaphore_) start_semaphore_->Signal();
  // 3-8
  Run();
}

// 3-8
void DefaultWorkerThreadsTaskRunner::WorkerThread::Run() {
  runner_->single_worker_thread_id_.store(base::OS::GetCurrentThreadId(), std::memory_order_relaxed);
  // 3-9
  while (std::unique_ptr<Task> task = runner_->GetNext()) {
    // 每一个task会实现自己的run函数
    task->Run();
  }
}

// 3-9
std::unique_ptr<Task> DefaultWorkerThreadsTaskRunner::GetNext() {
  // 3-10
  return queue_.GetNext();
}

// 3-10
std::unique_ptr<Task> DelayedTaskQueue::GetNext() {
  base::MutexGuard guard(&lock_);
  for (;;) {
    /**
     * 这一片内容完全可以参考libuv事件轮询的前两步
     * 1、从DelayQueue队列中依次取出超过指定时间的task
     * 2、将所有超时的task放到task_queue_队列中
     * 3、将task依次取出并返回
     * 4、外部会调用task的Run方法并重复调用该函数
    */
    double now = MonotonicallyIncreasingTime();
    std::unique_ptr<Task> task = PopTaskFromDelayedQueue(now);
    while (task) {
      task_queue_.push(std::move(task));
      task = PopTaskFromDelayedQueue(now);
    }
    if (!task_queue_.empty()) {
      std::unique_ptr<Task> result = std::move(task_queue_.front());
      task_queue_.pop();
      return result;
    }

    if (terminated_) {
      queues_condition_var_.NotifyAll();
      return nullptr;
    }
    /**
     * 1、当task_queue_队列没有task需要处理 但是delay_task_queue_有待处理task
     * 线程会计算当前队列中延迟task中最近的触发时间 等待对应的时间重新触发该函数
     * 2、当两个队列都没有需要的事件
     * 线程会直接休眠等待唤醒
    */
    if (task_queue_.empty() && !delayed_task_queue_.empty()) {
      double wait_in_seconds = delayed_task_queue_.begin()->first - now;
      base::TimeDelta wait_delta = base::TimeDelta::FromMicroseconds(base::TimeConstants::kMicrosecondsPerSecond * wait_in_seconds);

      bool notified = queues_condition_var_.WaitFor(&lock_, wait_delta);
      USE(notified);
    } else {
      queues_condition_var_.Wait(&lock_);
    }
  }
}

/* ------------------------------------------------------------------------------------------------------------------ */
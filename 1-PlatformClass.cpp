// platform相关虚函数类
class Platform {};
class PageAllocator {};
class TracingController {};

class DefaultPlatform : public Platform {
  public:
    explicit DefaultPlatform(
      IdleTaskSupport idle_task_support = IdleTaskSupport::kDisabled,
      std::unique_ptr<v8::TracingController> tracing_controller = {});
    ~DefaultPlatform() override;
    void SetThreadPoolSize(int thread_pool_size);
    void EnsureBackgroundTaskRunnerInitialized();
  private:
    static const int kMaxThreadPoolSize;

    int thread_pool_size_;
    IdleTaskSupport idle_task_support_;
    std::shared_ptr<DefaultWorkerThreadsTaskRunner> worker_threads_task_runner_;

    std::unique_ptr<TracingController> tracing_controller_;
    std::unique_ptr<PageAllocator> page_allocator_;

    TimeFunction time_function_for_testing_;
};

// Task相关
class Task {
 public:
  virtual ~Task() = default;
  virtual void Run() = 0;
};
class Thread {};
class TaskRunner {};
class DefaultWorkerThreadsTaskRunner : public TaskRunner {
  public:
    using TimeFunction = double (*)();
    DefaultWorkerThreadsTaskRunner(uint32_t thread_pool_size, TimeFunction time_function);
 private:
  class WorkerThread : public Thread {
   public:
    explicit WorkerThread(DefaultWorkerThreadsTaskRunner* runner);
    ~WorkerThread() override;

    // This thread attempts to get tasks in a loop from |runner_| and run them.
    void Run() override;
   private:
    DefaultWorkerThreadsTaskRunner* runner_;
  };

  std::unique_ptr<Task> GetNext();

  bool terminated_ = false;
  DelayedTaskQueue queue_;
  std::vector<std::unique_ptr<WorkerThread>> thread_pool_;
  TimeFunction time_function_;
  std::atomic_int single_worker_thread_id_{0};
  uint32_t thread_pool_size_;
};

class DelayedTaskQueue {
  public:
    using TimeFunction = double (*)();
    explicit DelayedTaskQueue(TimeFunction time_function);
    std::unique_ptr<Task> GetNext();
  private:
    base::ConditionVariable queues_condition_var_;
    std::queue<std::unique_ptr<Task>> task_queue_;
    bool terminated_ = false;
    TimeFunction time_function_;
};
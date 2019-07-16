/**
 * 进入指定Isolate的作用域
 */
v8::Isolate::Scope isolate_scope(isolate);

// Scope是Isolate的内部类
// 初始化后构造函数调用了Isolate的Enter方法
class V8_EXPORT Scope {
  public:
    explicit Scope(Isolate* isolate) : isolate_(isolate) {
      isolate->Enter();
    }
  // ...
}

// v8::Isolate是对外暴露的类
// i::Isolate是v8内部真正的实现类
void Isolate::Enter() {
  // 注:namespace i = v8::internal;
  i::Isolate* isolate = reinterpret_cast<i::Isolate*>(this);
  isolate->Enter();
}

// 真的麻烦
void Isolate::Enter() {
  Isolate* current_isolate = nullptr;
  /**
   * 注解1
   * 初始化时此处始终为nullptr 当前Isolate的内部Data
   */
  PerIsolateThreadData* current_data = CurrentPerIsolateThreadData();
  if (current_data != nullptr) {
    current_isolate = current_data->isolate_;
    if (current_isolate == this) {
      DCHECK(Current() == this);
      DCHECK_NOT_NULL(entry_stack_);
      DCHECK(entry_stack_->previous_thread_data == nullptr ||
             entry_stack_->previous_thread_data->thread_id() ==
                 ThreadId::Current());
      // Same thread re-enters the isolate, no need to re-init anything.
      entry_stack_->entry_count++;
      return;
    }
  }

  /**
   * 注解2
   * 搜索全局Isolate对应的Data
   */
  PerIsolateThreadData* data = FindOrAllocatePerThreadDataForThisThread();

  /**
   * 注解3
   * 设置Isolate的调用栈
   */
  EntryStackItem* item = new EntryStackItem(current_data, current_isolate, entry_stack_);
  entry_stack_ = item;
  SetIsolateThreadLocals(this, data);
  // In case it's the first time some thread enters the isolate.
  set_thread_id(data->thread_id());
}

/**
 * 注解[1]
 * PerIsolateThreadData => Isolate内部类
 */
static PerIsolateThreadData* CurrentPerIsolateThreadData() {
  return reinterpret_cast<PerIsolateThreadData*>(base::Thread::GetThreadLocal(per_isolate_thread_data_key_));
}

/**
 * Isolate的状态对象
 * 会以键值对的形式存在一个v8全局表中
 */
class PerIsolateThreadData {
  public:
    PerIsolateThreadData(Isolate* isolate, ThreadId thread_id)
        : isolate_(isolate),
          thread_id_(thread_id),
          stack_limit_(0),
          thread_state_(nullptr){}
    Isolate* isolate() const { return isolate_; }
    ThreadId thread_id() const { return thread_id_; }
  private:
    Isolate* isolate_;
    ThreadId thread_id_;
    uintptr_t stack_limit_;
    ThreadState* thread_state_;
}

/**
 * per_isolate_thread_data_key_ => 每一个Isolate类内部维护一个独立的pthread_key_tL类型变量
 * LocalStorageKey => pthread_key_t的一个别名 使用时和存储都会进行强转
 * 这里的方法根据key返回当前Isolate线程存储的数据
 * CreateThreadLocalKey方法返回一个初始化与强转后的pthread_key_t
 */
using LocalStorageKey = int32_t;
static base::Thread::LocalStorageKey per_isolate_thread_data_key_  = base::Thread::CreateThreadLocalKey();
Thread::LocalStorageKey Thread::CreateThreadLocalKey() {
  pthread_key_t key;
  int result = pthread_key_create(&key, nullptr);
  LocalStorageKey local_key = PthreadKeyToLocalKey(key);
  return local_key;
}
static Thread::LocalStorageKey PthreadKeyToLocalKey(pthread_key_t pthread_key) {
  return static_cast<Thread::LocalStorageKey>(pthread_key);
}
void* Thread::GetThreadLocal(LocalStorageKey key) {
  pthread_key_t pthread_key = LocalKeyToPthreadKey(key);
  return pthread_getspecific(pthread_key);
}

/**
 * 注解[2]
 * 获取当前线程的id 从表中查询返回对应的数据
 * 没有则插入一对数据
 * thread_data_table_是一个std::unordered_map类型的数据
 */
Isolate::PerIsolateThreadData* Isolate::FindOrAllocatePerThreadDataForThisThread() {
  ThreadId thread_id = ThreadId::Current();
  PerIsolateThreadData* per_thread = nullptr;
  {
    base::MutexGuard lock_guard(&thread_data_table_mutex_);
    per_thread = thread_data_table_.Lookup(thread_id);
    if (per_thread == nullptr) {
      base::OS::AdjustSchedulingParams();
      per_thread = new PerIsolateThreadData(this, thread_id);
      thread_data_table_.Insert(per_thread);
    }
  }
  return per_thread;
}

/**
 * 无参构造函数会将id设为一个不合法数
 * 此方法相当于默认初始化
 */
class ThreadId {
  public:
    static ThreadId Current() { return ThreadId(GetCurrentThreadId()); }
  private:
    int id_;
}

/**
 * GetThreadIdKey方法返回一个pthread_key_t变量
 * 如果为0说明该线程是第一次调用 会进行初始化
 * 不同线程调用GetThreadIdKey会返回同一个key
 * 由于每个线程有独立的存储区 所以返回的thread_id不一样 从1开始自增
 */
int ThreadId::GetCurrentThreadId() {
  auto key = *GetThreadIdKey();
  int thread_id = base::Thread::GetThreadLocalInt(key);
  if (thread_id == 0) {
    // std::atomic<int> next_thread_id{1};
    // 返回原有的值 然后加1
    // 相当于thread_id = next_thread_id++
    thread_id = next_thread_id.fetch_add(1);
    // 这里会将数字1强转为void*类型 所以get操作返回的value就是数字
    base::Thread::SetThreadLocalInt(key, thread_id);
  }
  return thread_id;
}

/**
 * 这个方法将key中存储的数据地址强转为int类型返回
 * 返回0代表没有进行过set操作
 */
class V8_BASE_EXPORT Thread {
  static int GetThreadLocalInt(LocalStorageKey key) {
    return static_cast<int>(reinterpret_cast<intptr_t>(GetThreadLocal(key)));
  }
}
void* Thread::GetThreadLocal(LocalStorageKey key) {
  pthread_key_t pthread_key = LocalKeyToPthreadKey(key);
  return pthread_getspecific(pthread_key);
}

/**
 * 注解[3]
 * EntryStackItem* entry_stack_ => Isolate类私有属性
 * 类负责管理线程进入和离开一个Isolate的调用栈
 * 当stack为空时代表Isolate没有使用 可以进行销毁
 * entry_count用来记录一个线程多次进入同一个Isolate
 */
class EntryStackItem {
  public:
    EntryStackItem(PerIsolateThreadData* previous_thread_data,
                    Isolate* previous_isolate,
                    EntryStackItem* previous_item)
        : entry_count(1),
          previous_thread_data(previous_thread_data),
          previous_isolate(previous_isolate),
          previous_item(previous_item) { }

    int entry_count;
    PerIsolateThreadData* previous_thread_data;
    Isolate* previous_isolate;
    EntryStackItem* previous_item;

  private:
    DISALLOW_COPY_AND_ASSIGN(EntryStackItem);
};

/**
 * isolate => 当前的Isolate对象
 * data => 全局map表中PerIsolateThreadData指针
 * 调用pthread_setspecific进行线程数据存储
 */
void Isolate::SetIsolateThreadLocals(Isolate* isolate, PerIsolateThreadData* data) {
  base::Thread::SetThreadLocal(isolate_key_, isolate);
  base::Thread::SetThreadLocal(per_isolate_thread_data_key_, data);
}

/**
 * 运算符优先级 . > &
 */
inline void set_thread_id(ThreadId v) { thread_local_top()->thread_id_ = v; }
ThreadLocalTop* thread_local_top() {
  return &isolate_data_.thread_local_top_;
}
// This class contains a collection of data accessible from both C++ runtime
// and compiled code (including assembly stubs, builtins, interpreter bytecode
// handlers and optimized code).
// In particular, it contains pointer to the V8 heap roots table, external
// reference table and builtins array.
// The compiled code accesses the isolate data fields indirectly via the root
// register.
class IsolateData final {}
IsolateData isolate_data_;


import Factory from "./Factory";
import Heap from './Heap';
import { 
  PERFORMANCE_ANIMATION,
  kNone, 
  HeapState_NOT_IN_GC,
} from "../enum";

let isolate_counter = 0;

export class Isolate {
  constructor() {
    this.isolate_allocator_ = null; // 内存地址
    // 堆
    this.heap_ = new Heap(this);
    this.id_ = ++isolate_counter;
    this.stack_guard_ = this;
    this.allocator_ = null;
    this.builtins_= this;
    this.rail_mode = PERFORMANCE_ANIMATION;
    this.code_event_dispatcher_ = new CodeEventDispatcher();
    this.cancelable_task_manager_ = new CancelableTaskManager();

    this.thread_manager_ = new ThreadManager(this);
    this.handle_scope_data_ = new HandleScopeData();
    // this.handle_scope_data_.Initialize(); 这一步操作已经在构造函数进行了处理
    // ISOLATE_INIT_LIST 这里有大量的初始化

    this.logger_ = null;
    this.async_counters_ = null;
    this.InitializeLoggingAndCounters();
    // this.InitializeDefaultEmbeddedBlob();
    this.default_microtask_queue_ = null;
    MicrotaskQueue.SetUpDefaultMicrotaskQueue(this);

    // 下面的是动态更新
    this.factory_ = new Factory(this);
    this.roots_table = [0];
    this.compilation_cache_ = new CompilationCache();

    this.scriptId = -1;
    this.type_profile_mode_ = kNone;

    this.use_counter_callback_ = null;
  }
  static New(params) {
    let isolate = new Isolate();
    this.Initialize(isolate, params);
    return isolate;
  }
  static Initialize() {

  }
  set_default_microtask_queue(value) {
    this.default_microtask_queue_ = value;
  }
  InitializeLoggingAndCounters() {
    if (this.logger_ === null) this.logger_ = new Logger(this);
    this.InitializeCounters();
  }
  InitializeCounters() {
    if (this.async_counters_) return false;
    this.async_counters_ = new Counters(this);
    return true;
  }
  native_context() {
    return null;
  }
  NextScriptId() {
    ++this.scriptId;
    return this.scriptId;
  }
  CountUsage(feature) {
    if (this.heap_.gc_state_ === HeapState_NOT_IN_GC) {
      if (this.use_counter_callback_) {
        // TODO
      }
    } else {
      this.heap_.IncrementDeferredCount(feature);
    }
  }
}

export class CreateParams {
  constructor() {
    this.code_event_handler = null;
    this.snapshot_blob = null;
    this.counter_lookup_callback = null;
    this.create_histogram_callback = null;
    this.add_histogram_sample_callback = null;
    this.array_buffer_allocator = null;
    this.external_references = null;
    this.allow_atomics_wait = null;
    this.only_terminate_in_safe_scope = null;
  }
}

class HandleScopeData {
  constructor() {
    this.next = null;
    this.limit = null;
    this.sealed_level = 0;
    this.level = 0;
    this.canonical_scope = null;
  }
}

class CompilationCache {
  LookupScript() {
    return null;
  }
  PutScript() {}
}

class Logger {

}

class Counters {
  constructor(isolate) {
    this.runtime_call_stats_ = null;
    this.worker_thread_runtime_call_stats_ = null;
    this.isolate_ = isolate;
    this.stats_table_ = this;

    this.total_load_size_ = 0;
    this.total_compile_size_ = 0;
    this.total_parse_size_ = 0;
  }
}

class MicrotaskQueue {
  constructor() {
    this.next_ = null;
    this.prev_ = null;
  }
  static SetUpDefaultMicrotaskQueue(isolate) {
    let microtask_queue = new MicrotaskQueue();
    microtask_queue.next_ = microtask_queue;
    microtask_queue.prev_ = microtask_queue;
    isolate.set_default_microtask_queue(microtask_queue);
  }
}

class CodeEventDispatcher {

}

class CancelableTaskManager {}
class ThreadManager {}

export default Isolate.New(new CreateParams());
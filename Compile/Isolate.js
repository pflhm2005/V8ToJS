import Factory from "./Factory";
import { PERFORMANCE_ANIMATION } from "../ParseStatementList/enum";

let isolate_counter = 0;

export default class Isolate {
  constructor() {
    this.isolate_allocator_ = null; // 内存地址
    this.id_ = ++isolate_counter;
    this.stack_guard_ = this;
    this.allocator_ = null;
    this.builtins_= this;
    this.rail_mode = PERFORMANCE_ANIMATION;
    this.code_event_dispatcher_ = new CodeEventDispatcher();
    this.cancelable_task_manager_ = new CancelableTaskManager();

    this.thread_manager_ = new ThreadManager(this);
    

    this.factory = new Factory(this);
    this.roots_table = [0];
    this.compilation_cache_ = new CompilationCache();

    this.scriptId = -1;
  }
  native_context() {
    return null;
  }
  NextScriptId() {
    ++this.scriptId;
    return this.scriptId;
  }
  static New(params) {
    let isolate = new Isolate();
    this.Initialize(isolate, params);
    return isolate;
  }
  static Initialize() {

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

class CompilationCache {
  LookupScript() {
    return null;
  }
}

class CodeEventDispatcher {

}

class CancelableTaskManager {}
class ThreadManager {}
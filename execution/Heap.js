import { 
  MemoryPressureLevel_kNone, 
  HeapState_NOT_IN_GC,
  UseCounterFeature_kUseCounterFeatureCount,
} from "../enum";

const kInitialFeedbackCapacity = 256;

export default class Heap {
  constructor(isolate) {
    this.isolate_ = isolate;
    this.memory_pressure_level_ = MemoryPressureLevel_kNone;
    this.global_pretenuring_feedback_ = kInitialFeedbackCapacity;
    this.external_string_table_ = this;

    this.set_native_contexts_list = null;
    this.set_allocation_sites_list = null;
    // RememberUnmappedPage(kNullAddress, false);

    this.gc_state_ = HeapState_NOT_IN_GC;
    this.deferred_counters_ = new Array(UseCounterFeature_kUseCounterFeatureCount).fill(0);
  }
  IncrementDeferredCount(feature) {
    this.deferred_counters_[feature]++;
  }
}
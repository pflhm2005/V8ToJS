import Factory from "./Factory";

export default class Isolate {
  constructor() {
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
}

class CompilationCache {
  LookupScript() {
    return null;
  }
}
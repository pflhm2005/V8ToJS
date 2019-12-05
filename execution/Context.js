export default class Context {
  constructor(isolate) {
    this.isolate = isolate;
  }
  GetIsolate() {
    return this.isolate;
  }
}
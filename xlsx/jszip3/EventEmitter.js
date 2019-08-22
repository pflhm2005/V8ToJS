export default class EventEmitter{
  constructor() {
    if(this._events === undefined) {
      this._events = Object.create(null);
    }
  };
  on(type, callback) {
    if (!this._events) {
      this._events = Object.create(null);
    }
    let existing = this._events[type];
    if (!existing) this._events[type] = callback;
    else {
      if (typeof existing === 'function') {
        this._events[type] = [existing, callback];
      } else{
        this._events[type].push(callback);
      }
    }
    this.emit('addEvent', type);
    return this;
  };
  emit(type, ...args) {
    const handles = this._events[type];
    if (!handles) return;
    if (typeof handles === 'function') {
      Reflect.apply(handles, this, args);
    } else {
      handles.forEach(v => {
        Reflect.apply(v, this, args);
      });
    }
  };
};
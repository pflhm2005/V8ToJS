import EventEmitter from './EventEmitter';

export default class GenericWorker extends EventEmitter {
  constructor(name) {
    super();
    this.name = name || 'default';
    this.streamInfo = {};
    this.generatedError = null;
    this.extraStreamInfo = {};
    this.isPaused = true;
    this.isFinished = false;
    this.isLocked = false;

    this.previous = null;
  }
  withStreamInfo(key, value) {
    this.extraStreamInfo[key] = value;
    Object.assign(this.streamInfo, this.extraStreamInfo);
    return this;
  }
  pipe(next) {
    return next.registerPrevious(this);
  }
  registerPrevious(previous) {
    this.streamInfo = previous.streamInfo;
    Object.assign(this.streamInfo, this.extraStreamInfo);
    this.previous = previous;
    previous.on('data', (chunk) => this.processChunk(chunk));
    previous.on('end', _ => this.end());
    previous.on('error', (e) => this.error(e));
    return this;
  }
  
  processChunk(chunk) {
    this.push(chunk);
  }
  push(chunk) {
    this.emit("data", chunk);
  }
  flush() {}
  cleanUp() {
    this.streamInfo = null;
    this.generatedError = null;
    this.extraStreamInfo = null;
  }
  end() {
    if(this.isFinished) return false;
    this.flush();
    this.emit('end');
    this.cleanUp();
    this.isFinished = true;
    return true;
  }

  /**
   * 从这里开始压缩
   */
  resume() {
    if(!this.isPaused || this.isFinished) return false;
    this.isPaused = false;
    if(this.previous) this.previous.resume();
    return true;
  }
}
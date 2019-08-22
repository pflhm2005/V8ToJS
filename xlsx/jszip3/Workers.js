import GenericWorker from './GenericWorker';
import { getTypeOf, transformTo } from './utils';

export class ConvertWorker extends GenericWorker {
  constructor(destType) {
    super(`ConvertWorker to ${destType}`);
    this.destType = destType;
  }
  processChunk(chunk) {
    this.push({
      data: transformTo(this.destType, chunk.data),
      meta: chunk.meta
    });
  }
}

export default class ZipFileWorker extends GenericWorker {
  /**
   * false,null,DOS,string2buf
   */
  constructor(streamFiles, comment, platform, encodeFileName) {
    super('ZipFileWorker');
    // 已写入的字节数
    this.bytesWritten = 0;
    this.zipComment = comment;
    this.zipPlatform = platform;
    this.encodeFileName = encodeFileName;
    this.streamFiles = streamFiles;

    this.accumulate = false;
    this.contentBuffer = [];
    // 文件夹记录
    this.dirRecords = [];
    // 偏移
    this.currentSourceOffset = 0;

    this.entriesCount = 0;
    // 当前处理的文件 null代表结束
    this.currentFile = null;

    this._sources = [];
  }
  prepareNextSource() {
    this.previous = this._sources.shift();
    this.openedSource(this.previous.streamInfo);
    if(this.isPaused) this.previous.pause();
    else this.previous.resume();
  }
  /**
   * 这里覆盖了父类的方法
   * @param {DataLengthProbe} previous pipe链 
   */
  registerPrevious(previous) {
    this._sources.push(previous);
    previous.on('data', chunk => this.processChunk(chunk));
    previous.on('end', _ => {
      this.closeSource(this.previous.streamInfo);
      if(this._sources.length) this.prepareNextSource();
      else this.end();
    });
  }
  resume() {
    if(!this.previous && this._sources.length) {
      this.prepareNextSource();
      return true;
    }
    if(!this.previous && !this._sources.length && !this.generatedError) {
      this.end();
      return true;
    }
  }
  push(chunk) {
    let currentFilePercent = chunk.meta.percent || 0;
    let entriesCount = this.entriesCount;
    let remainingFiles = this._sources.length;

    if(this.accumulate) this.contentBuffer.push(chunk);
    else {
      this.bytesWritten += chunk.data.length;
      super.push({
        data: chunk.data,
        meta: {
          currentFile: this.currentFile,
          percent: entriesCount ? (currentFilePercent + 100 * (entriesCount - remainingFiles - 1)) / entriesCount : 100
        }
      });
    }
  }
  /**
   * 开始跑压缩
   */
  openedSource(streamInfo) {
    this.currentSourceOffset = this.bytesWritten;
    this.currentFile = streamInfo.file.name;
    let streamedContent = this.streamFiles && !streamInfo.file.dir;

    if(streamedContent) {
      let record = generateZipParts(streamInfo, streamedContent, false, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
      this.push({ data: record.fileRecord, meta: { percent: 0 } });
    } else {
      this.accumulate = true;
    }
  }
  /**
   * 结束
   */
  closedSource(streamInfo) {
    this.accumulate = false;
    let streamedContent = this.streamFiles && !streamInfo.file.dir;
    let record = generateZipParts(streamInfo, streamedContent, true, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);

    this.dirRecords.push(record.dirRecord);
    if(streamedContent) this.push({ data: generateDataDescriptors(streamInfo), meta: { percent: 100 } });
    else {
      this.push({ data: record.fileRecord, meta: { percent: 0 } });
      while(this.contentBuffer.length) this.push(this.contentBuffer.shift());
    }
    this.currentFile = null;
  }
}

/**
 * compressedSize和uncompressedSize
 */
export class DataLengthProbe extends GenericWorker {
  constructor(propName) {
    super(`DataLengthProbe for ${propName}`);
    this.propName = propName;
    this.withStreamInfo(propName, 0);
  }
  processChunk(chunk) {
    if(chunk) {
      let len = this.streamInfo[this.propName] || 0;
      this.streamInfo[this.propName] = len + chunk.data.length;
    }
    super.processChunk(chunk);
  }
}

export class Crc32Probe extends GenericWorker {
  constructor() {
    super('Crc32Probe');
    this.withStreamInfo('crc32', 0);
  }
  processChunk(chunk) {
    this.streamInfo.crc32 = this.crc32(chunk.data, this.streamInfo.crc32 || 0);
    this.push(chunk);
  }
}

export class DateWorker extends GenericWorker {
  constructor(data) {
    super('DataWorker');
    this.DEFAULT_BLOCK_SIZE = 16 * 1024;
    this.index = 0;
    this.max = data && data.length || 0;
    this.data = data;
    this.type = getTypeOf(data);
    if(!this.isPaused) this._tickAndRepeat();

    this._tickScheduled = false;
  }
  cleanUp() {
    super.cleanUp();
    this.data = null;
  }
  resume() {
    if(!this._tickScheduled) {
      this._tickScheduled = true;
      this._tickAndRepeat();
    }
  }
  _tickAndRepeat() {
    this._tickScheduled = false;
    if(this.isPaused || this.isFinished) return false;
    this._tick();
    if(!this.isFinished) {
      this._tickAndRepeat();
      this._tickAndRepeat = true;
    }
  }
  _tick() {
    if(this.isPaused || this.isFinished) return false;
    // 每次处理这么多数据
    let size = DEFAULT_BLOCK_SIZE;
    let data = null;
    let nextIndex = Math.min(this.max, this.index + size);
    if(this.index >= this.max) return this.end();
    else {
      switch(this.type) {
        case 'string':
        case 'array':
          data = this.data.slice(this.index, nextIndex);
          break;
        case 'uint8array':
          data = this.data.subarray(this.index, nextIndex);
          break;
      }
      this.index = nextIndex;
      return this.push({ data, meta: { percent: this.max ? this.index / this.max * 100 : 0 } });
    }
  }
}

/**
 * 基本不会用到
 */
export class Utf8EncodeWorker extends GenericWorker {
  constructor(){
    super('utf-8 encode');
  }
}

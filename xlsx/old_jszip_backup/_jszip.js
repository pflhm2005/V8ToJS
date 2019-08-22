(function(){
  const getTypeOf = (input) => {
    if(typeof input === 'string') return 'string';
    if(Object.prototype.toString.call(input) === "[object Array]") return 'array';
    if(input instanceof Uint8Array) return "uint8array";
    if(input instanceof ArrayBuffer) return "arraybuffer";
  }
  
  const string2buf = (str) => {
    let l = str.length;
    let buf_len = 0;
    for(let i = 0;i < l;i++) {
      let c = str.charCodeAt(i);
      if((c & 0xfc00) === 0xd800 && (i + 1 < l)) {
        let c2 = str.charCodeAt(i + 1);
        if((c2 & 0xfc00) === 0xd800) {
          c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
          i++;
        }
      }
      buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
    }
    let buf = new Uint8Array(buf_len);
    for(let i = 0, j = 0;i < buf_len;j++) {
      let c = str.charCodeAt(j);
      if((c & 0xfc00) === 0xd800 && (j + 1 < l)) {
        c2 = str.charCodeAt(j + 1);
        if((c2 & 0xfc00) === 0xdc00) {
          c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
          j++;
        }
      }
      // 0 ~ 2^7 one byte
      if(c < 0x80) buf[i++] = c;
      // 2^7 ~ 2^11 two bytes
      else if(c < 0x800) {
        buf[i++] = 0xc0 | (c >>> 6);
        buf[i++] = 0x80 | (c & 0x3f);
      }
      // 2^11 ~ 2^16 three bytes
      else if(c < 0x10000) {
        buf[i++] = 0xe0 | (c >>> 12);
        buf[i++] = 0x80 | ((c >>> 6) & 0x3f);
        buf[i++] = 0x80 | (c & 0x3f);
      }
      // 2^16+ four bytes
      else {
        buf[i++] = 0xf0 | (c >>> 18);
        buf[i++] = 0x80 | ((c >>> 12) & 0x3f);
        buf[i++] = 0x80 | ((c >>> 6) & 0x3f);
        buf[i++] = 0x80 | (c & 0x3f);
      }
    }
    return buf;
  }
  
  const stringifyByChunk = (array, type, chunk) => {
    let result = [], k = 0, len = array.length;
    if(len <= chunk) String.fromCharCode.apply(null, array);
    while(k <= len) {
      if(type === 'array') result.push(String.fromCharCode.apply(null, array.slice(k, Math.min(k + chunk, len))));
      else result.push(String.fromCharCode.apply(null, array.subarray(k, Math.min(k + chunk, len))));
      k += chunk;
    }
    return result.join('');
  }
  
  const stringifyByChar = (array) => {
    let resultStr = '';
    for(let i = 0;i < array.length;i++) resultStr += String.fromCharCode(array[i]);
    return resultStr;
  }
  
  const blank = (input) => input;
  
  const stringToArrayBuffer = (str, ar) => {
    str.forEach((v, i) => ar[i] = str.charCodeAt(i) & 0xff);
    return ar;
  }
  
  const arrayBufferToString = (array) => {
    let chunk = 65536, type = getTypeOf(array), canUseApply = true;
    while(chunk > 1) {
      return stringifyByChunk(array, type, chunk);
    }
    return stringifyByChar(array);
  }
  
  const arrayBufferToArrayBuffer = (from, to) => {
    for(let i = 0;i < from.length;i++) to[i] = from[i];
    return to;
  }
  
  const generateUnixExternalFileAttr = (unixPermissions, isDir) => {
    let result = unixPermissions;
    if(!unixPermissions) result = isDir ? 0x41fd : 0x81b4;
    return (result & 0xffff) << 16;
  }
  
  const generateDosExternalFileAttr = (dosPermissions, isDir) => {
    return (dosPermissions || 0) & 0x3f;
  }
  
  const decToHex = (dec, bytes) => {
    let hex = '';
    for(let i = 0;i < bytes;i++) {
      hex += String.fromCharCode(dec & 0xff);
      dec >>>= 8;
    }
    return hex;
  }
  const signature = {
    LOCAL_FILE_HEADER: "PK\x03\x04",
    CENTRAL_FILE_HEADER: "PK\x01\x02",
    CENTRAL_DIRECTORY_END: "PK\x05\x06",
    ZIP64_CENTRAL_DIRECTORY_LOCATOR: "PK\x06\x07",
    ZIP64_CENTRAL_DIRECTORY_END: "PK\x06\x06",
    DATA_DESCRIPTOR: "PK\x07\x08",
  };
  
  const generateZipParts = (streamInfo, streamedContent, streamingEnded, offset, platform, encodeFileName) => {
    let file = streamInfo['file'];
    let compression = streamInfo['compression'];
    let dataInfo = {
      crc: 0,
      compressedSize: 0,
      uncompressedSize: 0,
    };
    let dir = file.dir;
    let date = file.date;
  
    let encodedFileName = transformTo('string', encodeFileName(file.name));
    let utfEncodedFileName = transformTo('string', string2buf(file.name));
    let useUTF8ForFileName = utfEncodedFileName.length !== file.name.length;
  
    
    // 文件夹或结束标记的走这个逻辑
    if(!streamedContent || streamingEnded) {
      dataInfo.crc32 = streamInfo['crc32'];
      dataInfo.compressedSize = streamInfo['compressedSize'];
      dataInfo.uncompressedSize = streamInfo['uncompressedSize'];
    }
    
    let bitflag = 0;
    if(streamedContent) bitflag |= 0x0008;
  
    let extFileAttr = 0;
    let versionMadeBy = 0;
    if(dir) extFileAttr |= 0x00010;
    if(platform === 'UNIX') {
      versionMadeBy = 0x031E;
      extFileAttr |= generateUnixExternalFileAttr(file.unixPermissions, dir);
    } else {
      versionMadeBy = 0x0014;
      extFileAttr |= generateDosExternalFileAttr(file.dosPermissions, dir);
    }
  
    let dosTime = date.getUTCHours();
    dosTime <<= 6;
    dosTime |= date.getUTCMinutes();
    dosTime <<= 5;
    dosTime |= (date.getUTCSeconds() / 2);
  
    let dosDate = date.getUTCFullYear() - 1980;
    dosDate <<= 4;
    dosDate |= (date.getUTCMonth() + 1);
    dosDate <<= 5;
    dosDate |= date.getUTCDate();
  
    let unicodePathExtraField = '';
    let extraFields = '';
    if(useUTF8ForFileName) {
      unicodePathExtraField = `${decToHex(1, 1)}${decToHex(crc32(encodedFileName), 4)}${utfEncodedFileName}`;
      extraFields += `\x75\x70${decToHex(unicodePathExtraField.length, 2)}${unicodePathExtraField}`;
    }
  
    let header = `\x0A\x00${decToHex(bitflag, 2)}${compression.magic}${decToHex(dosTime, 2)}${decToHex(dosDate, 2)}${decToHex(dataInfo.crc32, 4)}${decToHex(dataInfo.compressedSize, 4)}${decToHex(dataInfo.uncompressedSize, 4)}${decToHex(encodedFileName.length, 2)}${decToHex(extraFields.length, 2)}`;
  
    let fileRecord = `${signature.LOCAL_FILE_HEADER}${header}${encodedFileName}${extraFields}`;
    let dirRecord = [
      signature.CENTRAL_FILE_HEADER,
      decToHex(versionMadeBy, 2),
      header,
      '\x00\x00\x00\x00',
      decToHex(extFileAttr, 4),
      decToHex(offset, 4),
      encodedFileName,
      extraFields,
    ].join('');
    return { fileRecord, dirRecord };
  }
  
  const generateDataDescriptors = (streamInfo) => {
    return `${signature.DATA_DESCRIPTOR}${decToHex(streamInfo.crc32, 4)}${decToHex(streamInfo.compressedSize, 4)}${decToHex(streamInfo.uncompressedSize, 4)}`;
  }
  
  const generateCentralDirectoryEnd = (entriesCount, centralDirLength, localDirLength, comment, encodeFileName) => {
    return `${signature.CENTRAL_DIRECTORY_END}\x00\x00\x00\x00${decToHex(entriesCount, 2)}${decToHex(entriesCount, 2)}${decToHex(centralDirLength, 4)}${decToHex(localDirLength, 4)}`;
  }
  
  // a matrix containing functions to transform everything into everything.
  // 真几把厉害的方法
  let transform = {
    string: {
      string: blank,
      array(input) { return stringToArrayBuffer(input, new Array(input.length)); },
      arraybuffer(input) { return stringToArrayBuffer(input, new Uint8Array(input.length)); },
      uint8array(input) { return stringToArrayBuffer(input, new Uint8Array(input.length)); },
    },
    array: {
      string: arrayBufferToString,
      array: blank,
      arraybuffer(input) { return (new Uint8Array(input)).buffer; },
      uint8array(input) { return (new Uint8Array(input)).buffer; },
    },
    arraybuffer: {
      string(input) { return arrayBufferToString(new Uint8Array(input)); },
      array(input) { return arrayBufferToArrayBuffer(new Uint8Array(input), new Array(input.byteLength)) },
      arraybuffer: blank,
      uint8array(input) { return new Uint8Array(input) },
    },
    uint8array: {
      string: arrayBufferToString,
      array(input) { return arrayBufferToArrayBuffer(input, new Array(input.length)) },
      arraybuffer(input) { return input.buffer },
      uint8array: blank,
    }
  };
  const transformTo = (outputType, input = '') => {
    let inputType = getTypeOf(input);
    return transform[inputType][outputType](input);
  }
  
  // TODO
  const encode = (input) => input;
  
  class EventEmitter{
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
  
  class GenericWorker extends EventEmitter {
    constructor(name = 'default') {
      super();
      this.name = name;
      this.streamInfo = {};
      this.extraStreamInfo = {};
      this.isPaused = true;
      this.isFinished = false;
      this.isLocked = false;
      // 链表
      this.previous = null;
    }
    pipe(next) {
      return next.registerPrevious(this);
    }
    // 锁定后所有workder不可操作
    lock() {
      this.isLocked = true;
      if(this.previous) this.previous.lock();
    }
    mergeStreamInfo() {
      Object.keys(this.extraStreamInfo).forEach(v => this.streamInfo[v] = this.extraStreamInfo[v]);
    }
    registerPrevious(previous) {
      if(this.isLocked) { throw new Error("The stream '" + this + "' has already been used."); }
      this.streamInfo = previous.streamInfo;
      this.mergeStreamInfo();
      this.previous = previous;
      this.previous.on('data', (chunk) => this.processChunk(chunk));
      this.previous.on('end', () => this.end());
      return this;
    }
    push(chunk) {
      this.emit('data', chunk);
    }
    processChunk(chunk) {
      this.push(chunk);
    }
    withStreamInfo(key, value) {
      this.extraStreamInfo[key] = value;
      this.mergeStreamInfo();
      return this;
    }
    resume() {
      if(!this.isPaused || this.isFinished) return false;
      this.isPaused = false;
  
      if(this.previous) this.previous.resume();
      return true;
    }
    end() {
      if(this.isFinished) return false;
      this.flush();
      this.emit('end');
      this.cleanUp();
      this.isFinished = true;
      return true;
    }
    flush() {}
    cleanUp() {
      this.extraStreamInfo = null;
    }
  }
  
  const DEFAULT_BLOCK_SIZE = 16 * 1024;
  
  class DataWorker extends GenericWorker {
    constructor(dataP) {
      super("DataWorker");
      this.dataIsReady = false;
      this.index = 0;
      this.max = 0;
      this.data = null;
      this.type = "";
  
      this._tickScheduled = false;
  
      dataP.then(data => {
        this.data = data;
        this.dataIsReady = true;
        this.index = 0;
        this.max = data.length || 0;
        this.type = 'string';
        if(!this.isPaused) this._tickAndRepeat();
      })
      
    }
    resume() {
      if(!super.resume()) return false;
      if(!this._tickScheduled && this.dataIsReady) {
        this._tickScheduled = true;
        setTimeout(this._tickAndRepeat.bind(this), 0);
      }
      return true;
    }
    _tickAndRepeat() {
      this._tickScheduled = false;
      if(this.isPaused || this.isFinished) return;
      this._tick();
      if(!this.isFinished) {
        setTimeout(this._tickAndRepeat.bind(this), 0);
        setTimeout(this._tickAndRepeat.bind(this), 0);
        this._tickScheduled = true;
      }
    }
    _tick() {
      if(this.isPaused || this.isFinished) return;
      let size = DEFAULT_BLOCK_SIZE;
      let data = null, nextIndex = Math.min(this.max, this.index + size);
      if(this.index >= this.max) return this.end();
      else {
        data = this.data.slice(this.index, nextIndex);
        this.index = nextIndex;
        return this.push({
          data, meta: { percent: this.max ? this.index / this.max * 100 : 0 }
        });
      }
    }
  }
  
  class Utf8EncodeWorker extends GenericWorker {
    constructor(name) {
      super(name);
    }
    processChunk() {}
  }
  
  class Crc32Probe extends GenericWorker {
    constructor() {
      super('Crc32Probe');
      this.table = this.makeTable();
    }
    makeTable() {
      let table = [];
      for(let i = 0;i < 256; i++) {
        let c = i;
        for(let j = 0; j < 8; j++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        table.push(c);
      }
      return table;
    }
    crc32ar(crc, buf, len, pos) {
      let end = pos + len;
      crc = crc ^ (-1);
      for(let i = 0;i < end;i++) crc = (crc >>> 8) ^ this.table[(crc ^ buf[i]) & 0xFF];
      return (crc ^ (-1));
    }
    crc32str() {
      let end = pos + len;
      crc = crc ^ (-1);
      for(let i = 0;i < end;i++) crc = (crc >>> 8) ^ this.table[(crc ^ str.charCodeAt(i)) & 0xFF];
      return (crc ^ (-1));
    }
    crc32(input, crc) {
      if(typeof input !== 'string') return this.crc32ar(crc | 0, input, input.length, 0);
      return this.crc32str(crc | 0, input, input.length, 0);
    }
    processChunk(chunk) {
      this.streamInfo.crc32 = this.crc32(chunk.data, this.streamInfo.crc32 || 0);
      this.push(chunk);
    }
  }
  
  class ConvertWorker extends GenericWorker {
    constructor(destType) {
      super(`ConvertWorker to ${destType}`);
      this.destType = destType;
    }
    processChunk(chunk) {
      this.push({
        data: transformTo(this.destType, chunk.data),
        meta: chunk.meta,
      });
    }
  }
  
  class DataLengthProbe extends GenericWorker {
    constructor(propName) {
      super(`DataLengthProbe for ${propName}`);
      this.propName = propName;
      this.withStreamInfo(propName, 0);
    }
    processChunk(chunk) {
      if(chunk) {
        let length = this.streamInfo[this.propName] || 0;
        this.streamInfo[this.propName] = length + chunk.data.length;
      }
      super.processChunk(chunk);
    }
  }
  
  class ZipFileWorker extends GenericWorker {
    constructor(streamFiles, comment, platform, encodeFileName) {
      super('ZipFileWorker');
      this.bytesWritten = 0;
      this.zipComment = comment;
      this.zipPlatform = platform;
      this.encodeFileName = encodeFileName;
      this.streamFiles = streamFiles;
      this.accumulate = false;
      this.contentBuffer = [];
      this.dirRecords = [];
      this.currentSourceOffet = 0;
      this.entriesCount = 0;
      this.currentFile = null;
  
      this._sources = [];
    }
    openedSource(streamInfo) {
      this.currentSourceOffet = this.bytesWritten;
      this.currentFile = streamInfo['file'].name;
  
      let streamedContent = this.streamFiles && !streamInfo['file'].dir;
      // 不处理文件夹
      if(streamedContent) {
        let record = generateZipParts(streamInfo, streamedContent, false, this.currentSourceOffet, this.zipPlatform, this.encodeFileName);
        this.push({
          data: record.fileRecord,
          meta: { percent: 0 },
        });
      } else this.accumulate = true;
    }
    closedSource(streamInfo) {
      this.accumulate = false;
      let streamedContent = this.streamFiles && !this.streamInfo['file'].dir;
      let record = generateZipParts(streamInfo, streamedContent, true, this.currentSourceOffet, this.zipPlatform, this.encodeFileName);
  
      this.dirRecords.push(record.dirRecord);
      if(streamedContent) {
        this.push({
          data: generateDataDescriptors(streamInfo),
          meta: { percent: 100 },
        });
      } else {
        this.push({
          data: record.fileRecord,
          meta: { percent: 0 },
        });
        while(this.contentBuffer.length) this.push(this.contentBuffer.shift());
      }
      this.currentFile = null;
    }
    prepareNextSource() {
      this.previous = this._sources.shift();
      this.openedSource(this.previous.streamInfo);
      if(this.isPaused) this.previous.pause();
      else this.previous.resume();
    }
    registerPrevious(previous) {
      this._sources.push(previous);
      previous.on('data', (chunk) => this.processChunk(chunk));
      previous.on('end', () => {
        this.closedSource(this.previous.streamInfo);
        if(this._sources.length) this.prepareNextSource();
        else this.end();
      });
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
    flush() {
      let localDirLength = this.bytesWritten;
      for(let i = 0;i < this.dirRecords.length;i++) {
        this.push({
          data: this.dirRecords[i],
          meta: { percent: 100 },
        });
      }
      let centralDirLength = this.bytesWritten - localDirLength;
      let dirEnd = generateCentralDirectoryEnd(this.dirRecords.length, centralDirLength, localDirLength, this.zipComment, this.encodeFileName);
      this.push({
        data: dirEnd,
        meta: { percent: 100 },
      });
    }
    lock() {
      super.lock();
      let l = this._sources.length;
      for(let i = 0;i < l;i++) this._sources[i].lock();
    }
    resume() {
      if(!super.resume()) return false;
      if(!this.previous && this._sources.length) {
        this.prepareNextSource();
        return true;
      }
      if(!this.previous && !this._sources.length) {
        this.end();
        return true;
      }
    }
  }
  
  class CompressedObject {
    constructor() {
    }
    static createWorkerFrom(uncompressedWorker, compression, compressionOptions) {
      return uncompressedWorker
      .pipe(new Crc32Probe())
      .pipe(new DataLengthProbe("uncompressedSize"))
      .pipe(compression.compressWorker(compressionOptions))
      .pipe(new DataLengthProbe("compressedSize"))
      .withStreamInfo("compression", compression);
    }
  }
  
  class StreamHelper {
    constructor(worker, outputType, mimeType) {
      let typeMappig = {
        blob: 'uint8array',
        arraybuffer: 'uint8array',
        base64: 'string',
      }
      this._internalType = typeMappig[outputType] || outputType;
      this._outputType = outputType;
      this._mimeType = mimeType;
      this._worker = worker.pipe(new ConvertWorker(this._internalType));
      worker.lock();
    }
    on(eventName, callback) {
      if(eventName === 'data') {
        this._worker.on(eventName, (chunk) => {
          callback.call(this, chunk.data, chunk.meta);
        });
      } else {
        this._worker.on(eventName, () => {
          setTimeout(callback.bind(this), 0);
        });
      }
      return this;
    }
    resume() {
      setTimeout(this._worker.resume.bind(this._worker), 0);
      return this;
    }
    concat(type, dataArray) {
      let len = dataArray.length;
      let totalLength = 0;
      let res= null;
      let index = 0;
      for(let i = 0;i < len;i++) totalLength += dataArray[i].length;
      switch(type) {
        case 'string':
          return dataArray.join('');
        case 'array':
          return [].concat(dataArray);
        case 'uint8array':
          res = new Uint8Array(totalLength);
          for(let i = 0;i < l;i++) {
            res.set(dataArray[i], index);
            index += dataArray[i].length;
          }
          return res;
      }
    }
    transformZipOutput(type, content, mimeType) {
      switch(type) {
        case 'blob':
          return new Blob([transformTo('arraybuffer', content)], { type: mimeType });
        case 'base64':
          return encode(content);
        default:
          return transformTo(type, content);
      }
    }
    accumulate(updateCallback) {
      return new Promise((resolve, reject) => {
        let dataArray = [];
        let chunkType = this._internalType;
        let resultType = this._outputType;
        let mimeType = this._mimeType;
        this.on('data', (data, meta) => {
          dataArray.push(data);
          if(updateCallback) updateCallback(meta);
        }).on('end', () => {
          let result = this.transformZipOutput(resultType, this.concat(chunkType, dataArray), mimeType);
          resolve(result);
          dataArray = [];
        }).resume();
      })
    }
  }
  
  class ZipObject {
    constructor(name, data, opt) {
      this.name = name;
      this.dir = opt.dir;
      this.date = opt.date;
      this.comment = opt.comment;
      this.unixPermissions = opt.unixPermissions;
      this.dosPermissions = opt.dosPermissions;
  
      this._data = data;
      this._dataBinary = opt.binary;
  
      this.opts = {
        compression : opt.compression,
        compressionOptions : opt.compressionOptions
      };
    }
    _compressWorker(compression, compressionOptions) {
      let result = this._decompressWorker();
      // 这里默认跳过
      if(!this._dataBinary) result = result.pipe(new Utf8EncodeWorker());
      return CompressedObject.createWorkerFrom(result, compression, compressionOptions);
    }
    _decompressWorker() {
      return new DataWorker(this._data);
    }
  }
  
  const compressions = {
    STORE: {
      magic: '\x00\x00',
      compressWorker() {
        return new GenericWorker("STORE compression");
      },
      uncompressWorker() {
        return new GenericWorker("STORE decompression");
      }
    },
    DEFLATE: {}
  }
  
  /**
   * 模拟3.0的JSzip
   */
  class JSZip {
    constructor() {
      this.files = {};
      this.comment = null;
      this.root = '';
    }
    file(name, data, o = {}) {
      let dataType = getTypeOf(data);
      o = Object.assign({
        base64: false,
        binary: true,
        comment: null,
        compression: null,
        compressionOptions: null,
        createFolders: true,
        date: new Date(),
        dir: false,
        dosPermissions: null,
        unixPermissions: null,
      }, o);
      if(o.dir) name = this.forceTrailingSlash(name);
      if(o.createFolders) {
        let parent = this.parentFolder(name);
        if(parent) this.folderAdd(parent, true);
      }
  
      let isCompressedEmpty = (data instanceof CompressedObject) && data.uncompressedSize === 0;
      if(isCompressedEmpty || o.dir || !data || data.length === 0) {
        o.base64 = false;
        o.binary = true;
        data = "";
        o.compression = "STORE";
        dataType = "string";
      }
  
      /**
       * 3.0把内容封装成了Promise
       * 如果是纯字符串 其实没有什么区别
       */
      let zipObjectContent = null;
      if (data instanceof CompressedObject || data instanceof GenericWorker) {
        zipObjectContent = data;
      } else {
        zipObjectContent = this.prepareContent(name, data, o.binary, o.optimizedBinaryString, o.base64);
      }
  
      let object = new ZipObject(name, zipObjectContent, o);
      this.files[name] = object;
    }
  
    base64Decode() {}
    string2binary(str) {
      let l = str.length;
      let result = new Uint8Array(l);
      for(let i = 0;i < l;i++) {
        result[i] = str.charCodeAt(i) & 0xff;
      }
      return result;
    }
    prepareContent(name, inputData, isBinary, isOptimizedBinaryString, isBase64) {
      let promise = Promise.resolve(inputData).then(data => {
        let isBlob = (data instanceof Blob || ['[object File]', '[object Blob]'].indexOf(Object.prototype.toString.call(data)) !== -1);
        if(isBlob) {
          return new Promise((resolve) => {
            let reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsArrayBuffer(data);
          });
        }
        else return data;
      });
      return promise.then(data => {
        let type = getTypeOf(data);
        if(type === 'arraybuffer') return transformTo("uint8array", data);
        else if(type === 'string') {
          if(isBase64) return this.base64Decode(data);
          else if(isBinary && !isOptimizedBinaryString) return this.string2binary(data);
        }
        return data;
      })
    }
    parentFolder(path) {
      if(path.slice(-1) === '/') path = path.substring(0, path.length - 1);
      let lastSlash = path.lastIndexOf('/');
      return (lastSlash > 0) ? path.substring(0, lastSlash) : '';
    }
    forceTrailingSlash(path) {
      if(path.slice(-1) !== '/') path += '/';
      return path;
    }
    folderAdd(name, createFolders) {
      name = this.forceTrailingSlash(name);
      if(!this.files[name]) this.file(name, null, {
        dir: true,
        createFolders,
      });
      return this.file[name];
    }
  
    generateAsync(opts, onUpdate = null) {
      return this.generateInternalStream(opts).accumulate(onUpdate);
    }
    generateInternalStream(opts) {
      opts = Object.assign({
        streamFiles: false,
        compression: "STORE",
        compressionOptions : null,
        type: "",
        platform: "DOS",
        comment: "",
        mimeType: 'application/zip',
        encodeFileName: string2buf,
      }, opts);
      let comment = opts.comment || this.comment || '';
      let worker = this.generateWorker(opts, comment);
      return new StreamHelper(worker, opts.type, opts.mimeType);
    }
    getCompression(fileCompression = "STORE", zipCompression = "STORE") {
      let compressionName = fileCompression || zipCompression;
      return compressions[compressionName];
    }
    generateWorker(opts, comments) {
      let zipFileWorker = new ZipFileWorker(opts.streamFiles, comments, opts.platform, opts.encodeFileName);
      Object.keys(this.files).forEach(name => {
        let file = this.files[name];
        let compression = this.getCompression(file.opts.compression, opts.compression);
        let compressionOptions = {};
        let dir = file.dir, date = file.date;
        /**
         * file的类型是ZipObject
         */
        file._compressWorker(compression, compressionOptions).withStreamInfo('file', {
          name, dir, date,
          comment: file.comment || '',
          unixPermissions: file.unixPermissions,
          dosPermissions: file.dosPermissions,
        }).pipe(zipFileWorker);
      });
      zipFileWorker.entriesCount = Object.keys(this.files).length;
      console.log(zipFileWorker);
      return zipFileWorker;
    }
  }
  
  window.JSZip2 = JSZip;
  })(window)
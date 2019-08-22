const LOCAL_FILE_HEADER = "PK\x03\x04";
const CENTRAL_FILE_HEADER = "PK\x01\x02";
const CENTRAL_DIRECTORY_END = "PK\x05\x06";
const ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x06\x07";
const ZIP64_CENTRAL_DIRECTORY_END = "PK\x06\x06";
const DATA_DESCRIPTOR = "PK\x07\x08";

/**
 * 服务下面面的映射
 */
const strToAr = (str, ar) => {
  for(let i = 0;i < str.length;i++) ar[i] = str.charCodeAt(i) & 0xff;
  return ar;
}
const arToString = (ar) => {
  let chunk = 65536;
  let result = [];
  let len = ar.length;
  let type = this.getTypeOf(ar);
  let k = 0;

  while(k < len) {
    let nextIndex = k + chunk;
    if(type === 'array') result.push(String.fromCharCode.apply(null, ar.slice(k, Math.min(nextIndex, len))));
    else result.push(String.fromCharCode.apply(null, ar.subarray(k, Math.min(nextIndex, len))));
    k = nextIndex;
  }
  return result.join('');
}
const arToAr = (from, to) => {
  for(let i = 0;i < from.length;i++) to[i] = from[i];
  return to;
}

let transformTo = {
  string: {
    array(input) { return this.strToAr(input, new Array(input.length)); },
    arratbuffer(input) { return this.strToAr(input, new Uint8Array(input.length)); },
    uint8array(input) { return this.strToAr(input, new Uint8Array(input.length)); }
  },
  array: {
    string: arToString,
    arraybuffer(input) { return (new Uint8Array(input)).buffer; },
    uint8array(input) { return new Uint8Array(input); }
  },
  arraybuffer: {
    string(input) { return arToString(new Uint8Array(input)); },
    array(input) { return arToAr(new Uint8Array(input), new Array(input.byteLength)); },
    uint8array(input) { return new Uint8Array(input); }
  },
  uint8array: {
    string: arToString,
    array(input) { return arToAr(input, new Array(input.length)); },
    arraybuffer(input) { return input.buffer; },
  }
}

const transform = (outputType, input) => {
  if(!outputType) return '';
  let inputType = this.getTypeOf(input);
  if(inputType === outputType) return input;
  return transformTo[inputType][outputType](input);
}

class ZipObject {
  constructor(name, data, options) {
    this.name = name;
    this.dir = options.dir;
    this.data = options.data;
    this.comment = options.comment;
    this.unixPermissions = options.unixPermissions;
    this.dosPermissions = options.dosPermissions;

    this._data = data;
    this.options = options;

    this._initialMetadata = {
      dir : options.dir,
      date : options.date
    };
  }
}

class JSZip {
  constructor(data, options = {}) {
    this.files = {};
    this.comment = null;
    this.root = '';
  }
  file(name, data) {
    let type = this.getTypeOf(data);
    let o = {
      base64: false,
      binary: true,
      dir: false,
      createFolders: false,
      date: new Date(),
      compression: null,
      compressionOptions: null,
      comment: null,
      unixPermissions: null,
      dosPermissions: null,
    };
    
    this.files[name] = new ZipObject(name, data, o);
  }
  /**
   * Transform an integer into a string in hexadecimal.
   * @param {number} dec the number to convert.
   * @param {number} bytes the number of bytes to generate.
   * @returns {string} the result.
   */
  decToHex(dec, bytes) {
    let hex = '';
    for(let i = 0;i < bytes;i++){
      hex += String.fromCharCode(dec & 0xff);
      dec >>>= 8;
    }
    return hex;
  }
  getTypeOf = (input) => {
    if(typeof input === 'string') return 'string';
    else if(Array.isArray(input)) return 'array';
    else if(input instanceof Uint8Array) return 'uint8array';
    else if(input instanceof ArrayBuffer) return 'arraybuffer';
  }
  generate(options) {
    options = Object.assign({
      base64: true,
      compression: "STORE",
      compressionOptions : null,
      type: "base64",
      platform: "DOS",
      comment: null,
      mimeType: 'application/zip',
      encodeFileName: string2buf
    }, options);
    let zipData = [];
    let localDirLength = 0;
    let centralDirLength = 0;

    Object.keys(this.files).forEach(name => {
      let file = this.files[name];
      let compressionObject = this.generateCompressedObjectFrom(file, compression, compressionOptions);

      let zipPart = this.generateZipParts(name, file, compressionObject, localDirLength, options.platform, options.encodeFileName);
      localDirLength += zipPart.fileRecord.length + compressionObject.compressedSize;
      centralDirLength += zipPart.dirRecord.length;
      zipData.push(zipPart);
    });

    let dirEnd = [
      CENTRAL_DIRECTORY_END,
      "\x00\x00",
      "\x00\x00",
      this.decToHex(zipData.length, 2),
      this.decToHex(zipData.length, 2),
      this.decToHex(centralDirLength, 4),
      this.decToHex(localDirLength, 4),
    ].join('');

    let totalLength = localDirLength + centralDirLength + dirEnd.length;
    let writer = new Writer(options.type === 'string' ? null : totalLength);
    let len = zipData.length;
    for(let i = 0;i < len;i++) {
      writer.append(zipData[i].fileRecord);
      writer.append(zipData[i].compressedObject.compressedContent);
    }
    for(let i = 0;i < len;i++) {
      writer.append(zipData[i].dirRecord);
    }
    writer.append(dirEnd);

    return writer.finalize();
  }
  generateCompressedObjectFrom(file) {
    let result = {
      compressedSize: 0,
      uncompressedSize: 0,
      crc32: 0,
      compressionMethod: null,
      compressedContent: null,
    };
    let content = file._data;
    if(!content || content.length === 0 || file.dir) {
      result.compressedContent = "";
      result.crc32 = 0;
    }
    result.uncompressedSize = content.length;
    result.crc32 = crc32(content);
    result.compressedContent = content;

    result.compressedSize = result.compressedContent.length;
    result.compressionMethod = "\x00\x00";
    return result;
  }
  // {
  //   base64: false,
  //   binary: true,
  //   dir: false,
  //   createFolders: false,
  //   date: new Date(),
  //   compression: null,
  //   compressionOptions: null,
  //   comment: null,
  //   unixPermissions: null,
  //   dosPermissions: null,
  // }
  generateZipParts(file, compressedObject, offset, platform, encodeFileName) {
    let dir = file.dir;
    let extFileAttr = 0;
    let versionMadeBy = 0x0014;
    let date = file.date;
  }
}

class Writer {
  constructor(len = null) {
    this.isString = len === null;
    if(this.isString) this.data = [];
    else {
      this.index = 0;
      this.data = new Uint8ArrayWriter(len);
    }
  }
  append(input) {
    if(this.isString) {
      this.data.push(transform('string', input));
    } else{
      input = transform('uint8array', input);
      this.data.set(input, this.index);
      this.index += input.length;
    }
  }
  finalize() {
    return this.isString ? this.data.join('') : this.data;
  }
}
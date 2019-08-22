import ZipObject from './ZipObject';
import StreamHelper from './StreamHelper';
import ZipFileWorker from './Workers';

import {
  getTypeOf,
  prepareContent,
  string2buf,
} from './utils';

class JSZip {
  constructor() {
    /**
     * @key filename
     * @value file
     */
    this.files = {};
    this.comment = null;
    this.root = '';
  }
  /**
   * 加文件夹
   */
  folderAdd(name) {
    if(name.slice(-1) !== '/') name += '/';
    if(!this.files.hasOwnProperty(name)) this.file(name, null, { dir: true });
    return this.files[name];
  }
  file(name, data, opt = {}) {
    // let type = getTypeOf(data);
    let o = Object.assign({
      base64: false,
      binary: true,
      dir: false,
      createFolders: true,
      date: new Date(),
      compression: null,
      compressionOptions: null,
      unixPermissions: null,
      disPermissions: null,
    }, opt);
    
    // let isUnicodeString = type === 'string' && !o.binary && !o.base64;
    // o.binary = !isUnicodeString;

    let isCompressedEmpty = (data instanceof CompressedObject) && data.uncompressedSize === 0;
    if(isCompressedEmpty || o.dir || !data || data.length === 0) {
      o.base64 = false;
      o.binary = true;
      data = '';
      o.compression = "STORE";
      type = 'string';
    }

    let zipObjectContent = null;
    /**
     * 区分是否已压缩
     */
    if(data instanceof CompressedObject || data instanceof GenericWorker) zipObjectContent = data;
    else zipObjectContent = prepareContent(name, data, o.binary, o.optimizedBinaryString, o.base64);

    this.files[name] = new ZipObject(name, zipObjectContent, o);
  }
  /**
   * 生成压缩文件
   * @param {Object} opt 选项 { type: string }
   * @param {Function} onUpdate 回调函数
   * @return {StreamHelper}
   */
  generate(opt, onUpdate) {
    return this.generateInternalStream(opt).accumulate(onUpdate);
  }
  generateInternalStream(opt) {
    let o = Object.assign({
      streamFiles: false,
      compression: "STORE",
      compressionOptions : null,
      type: "",
      platform: "DOS",
      comment: null,
      mimeType: 'application/zip',
      encodeFileName: string2buf
    }, opt);

    let worker = this.generateWorker(o, '');
    return new StreamHelper(worker, opt.type, opts.mimeType);
  }
  generateWorker(o, comment) {
    let zipFileWorker = new ZipFileWorker(o.streamFiles, comment, o.platform, o.encodeFileName);

    Object.keys(this.files).forEach(filename => {
      let file = this.files[filename];
      let compression = {
        magic: '\x00\x00',
        compressWorker() { return new GenericWorker('STORE compression'); },
        uncompressWorker() { return new GenericWorker('STORE decompression'); }
      }
      /**
       * 这里是一个链式对象 顺序如下
       * zipFileWorker => DataLengthProbe => GenericWorker => DataLengthProbe => Crc32Probe => DateWork
       */
      file._compressWorker(compression, {}).withStreamInfo('file', {
        name: filename,
        dir: file.dir,
        date: file.date,
        comment: file.comment || '',
        unixPermissions : file.unixPermissions,
        dosPermissions : file.dosPermissions
      }).pipe(zipFileWorker);
    });
    zipFileWorker.entriesCount = this.files.length;

    return zipFileWorker;
  }
}
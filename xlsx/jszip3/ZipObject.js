import CompressedObject from './CompressedObject';
import GenericWorker from './GenericWorker';
import {
  Utf8EncodeWorker,
} from './Worker';

export default class ZipObject {
  constructor(name, data, o) {
    this.name = name;
    this.dir = o.dir;
    this.date = o.date;
    this.comment = o.comment;
    this.unixPermissions = o.unixPermissions;
    this.dosPermissions = o.dosPermissions;

    this._data = data;
    this._dataBinary = o.binary;

    this.options = {
      compression: o.compression,
      compressionOptions: o.compressionOptions
    };
  }
  /**
   * 返回一个链式对象
   * @param {Object} compression 包含compressWorker、uncompressWorker
   * @param {Object} compressionOptions 空对象
   * @returns {GenericWorker}
   */
  _compressWorker(compression, compressionOptions) {
    if(this._data instanceof CompressedObject &&this._data.compression.magic === compression.magic) {
      return this._data.getCompressedWorker();
    } else {
      let result = this._decompressWorker();
      if(!this._dataBinary) result.pipe(new Utf8EncodeWorker());
      return result.pipe(new Crc32Probe())
      .pipe(new DataLengthProbe('uncompressedSize'))
      .pipe(new GenericWorker('STORE compression'))
      .pipe(new DataLengthProbe('compressedSize'))
      .withStreamInfo('compression', compression);
    }
  }
  /**
   * 一般这里的data都是Uint8Array 见s2ab
   * @returns {DateWork}
   */
  _decompressWorker() {
    if(this._data instanceof CompressedObject) return this._data.getContentWorker();
    else if(this._data instanceof GenericWorker) return this._data;
    else return new DateWork(this._data);
  }
}
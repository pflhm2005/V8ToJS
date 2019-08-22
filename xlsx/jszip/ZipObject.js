import CompressedObject from './CompressedObject';
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
  _compressWorker(compression, compressionOptions) {
    if(this._data instanceof CompressedObject &&this._data.compression.magic === compression.magic) {
      return this._data.getCompressedWorker();
    } else {
      let result = this._decompressWorker();
      if(!this._dataBinary) result.pipe(new Utf8EncodeWorker());
      return CompressedObject.createWorkerFrom(result, compression, compressionOptions);
    }
  }
}
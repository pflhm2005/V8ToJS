import EventEmitter from './EventEmitter';

import {
  transformTo,
  encode,
} from './utils';

export default class StreamHelper extends EventEmitter {
  /**
   * ZipFileWorker
   * string
   * application/zip
   */
  constructor(worker, outputType, mimeType) {
    super();
    this.internalType = outputType;
    switch(outputType) {
      case 'blob':
      case 'arraybuffer':
        this.internalType = 'uint8array';
        break;
      case 'base64':
        this.internalType = 'string';
        break;
    }
    this.outputType = outputType;
    this.mimeType = mimeType;

    this._worker = worker.pipe(new ConvertWorker(internalType));

    worker.lock();
  }
  transformZipOutput(type, content, mimeType) {
    switch(type) {
      case 'blob':
        return new Blob([transformTo("arraybuffer", content)], { type: mimeType });
      case 'base64':
        return encode(content);
      default:
        return transformTo(type, content);
    }
  }
  concat(dataArray) {
    let len = dataArray.length, totalLength = 0;
    for(let i = 0;i < len;i++) totalLength += dataArray[i].length;
    switch(this.internalType) {
      case "string":
        return dataArray.join('');
      case 'array':
        return [].concat(dataArray);
      case 'unit8array':
        let result = new Uint8Array(totalLength);
        let index = 0;
        for(let i = 0;i < len;i++) {
          result.set(dataArray[i], index);
          index += dataArray[i].length;
        }
        return result;
    }
  }
  accumulate(updateCallback = null) {
    return new Promise((resolve, reject) => {
      let dataArray = [];
      this.on('data', (data, meta) => {
        dataArray.push(data);
        if(updateCallback) updateCallback(meta);
      }).on('error', (err) => {
        dataArray = [];
        reject(err);
      }).on('end', () => {
        let result = this.transformZipOutput(this.outputType, this.concat(dataArray), this.mimeType);
        resolve(result);
        dataArray = [];
      }).resume();
    });
  }
  resume(){
    this._worker.resume();
  }
}
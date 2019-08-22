import GenericWorker from './GenericWorker';

export class Utf8EncodeWorker extends GenericWorker {
  constructor(){
    super('utf-8 encode');
  }
}

export class Crc32Probe extends GenericWorker {
  constructor() {
    super('Crc32Probe');
    this.withStreamInfo('crc32', 0);
  }
}

export class DataLengthProbe extends GenericWorker {
  constructor(propName) {
    super(`DataLengthProbe for ${propName}`);
    this.propName = propName;
    this.withStreamInfo(propName, 0);
  }
}
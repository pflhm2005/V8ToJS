export default class CompressedObject {
  constructor(compressedSize, uncompressedSize, crc32, compression, data) {
    this.compressedSize = compressedSize;
    this.uncompressedSize = uncompressedSize;
    this.crc32 = crc32;
    this.compression = compression;
    this.compressedContent = data;
  }
  static createWorkerFrom(uncompressedWorker, compression, compressionOptions) {
    return uncompressedWorker
    .pipe(new Crc32Probe())
    .pipe(new DataLengthProbe('uncompressedSize'))
    .pipe(compression.compressWorker(compressionOptions))
    .pipe(new DataLengthProbe('compressedSize'))
    .withStreamInfo('compression', compression);
  }
};
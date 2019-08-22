import {
  Crc32Probe,
  DataLengthProbe,
} from './Workers';

export default class CompressedObject {
  constructor(compressedSize, uncompressedSize, crc32, compression, data) {
    this.compressedSize = compressedSize;
    this.uncompressedSize = uncompressedSize;
    this.crc32 = crc32;
    this.compression = compression;
    this.compressedContent = data;
  }
};
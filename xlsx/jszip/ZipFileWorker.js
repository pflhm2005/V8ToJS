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
}
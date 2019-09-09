import Parser from '../ParseStatementList/parse/Parser';
import Stream from '../ParseStatementList/scanner/Stream';

export default class Parsing {
  static ParseProgram(info, isolate) {
    // more
    let source = info.script_.source_;
    isolate.async_counters_.total_parse_size_ += source.length;
    console.log(info.character_stream_);
    let stream = new Stream(source);
    info.character_stream_ = stream;

    let parser = new Parser(info);

    let result = parser.ParseProgram(isolate, info);
    // if(result === null) throw new Error('pending_error');
    // else {
    //   // info.set_language_mode(info.literal_.language_mode_);
    // }
    // info.literal_ = result;
    return result !== null;
  }
}
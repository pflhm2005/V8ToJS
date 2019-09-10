import Parser from '../Parsing/Parser';
import Scanner from '../Parsing/scanner/Scanner';
import Stream from '../Parsing/scanner/Stream';

export default class Parsing {
  static ParseProgram(info, isolate, mode = kYes) {
    // more
    let source = info.script_.source_;
    isolate.async_counters_.total_parse_size_ += source.length;
    let stream = new Stream(source);
    info.character_stream_ = stream;
    info.scanner_ = new Scanner(info.character_stream_, info.is_module());
    let parser = new Parser(info);

    let result = parser.ParseProgram(isolate, info);
    info.literal_ = result;
    if(result) {
      info.set_language_mode(info.literal_.language_mode());
      if(info.is_eval()) info.set_allow_eval_cache(parser.allow_eval_cache_);
    }
    
    if(mode === kYes) {
      // if(result === null) 
      parser.UpdateStatistics(isolate, info.script_);
    }
    return result !== null;
  }
}
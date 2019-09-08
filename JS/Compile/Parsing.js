import Parser from '../ParseStatementList/parse/Parser';

export default class Parsing {
  static ParseProgram(info, isolate) {
    // more
    info.set_character_stream(info.script_.source_);
    let parser = new Parser(info);
    let result = parser.ParseProgram(isolate, info);
    if(result === null) throw new Error('pending_error');
    else {
      // info.set_language_mode(info.literal_.language_mode_);
    }
    info.literal_ = result;
    return result !== null;
  }
}
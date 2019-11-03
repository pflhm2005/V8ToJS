/**
 * 普通node模式不支持import语法
 * 需安装babel-node工具
 */
import Parsing from './Compile/Parsing';
import isolate from './Compile/Isolate';
import ParseInfo from './Compile/ParseInfo';
import { ScriptOriginOptions } from './Compile/Script';
function foo() { console.log('a'); }
function foo() { console.log('b'); }
// 在这里设置待编译字符串
const source = `a = 5`;

let parse_info = new ParseInfo(isolate);
parse_info.CreateScript(isolate, source, new ScriptOriginOptions(), false);
Parsing.ParseProgram(parse_info, isolate);

let AstBody = parse_info.literal_.body_;
for(let statement of AstBody) {
  console.log(statement);
}
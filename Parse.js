/**
 * 普通node模式不支持import语法
 * 需安装babel-node工具
 */
import Parsing from './Compile/Parsing';
import isolate from './Execution/Isolate';
import ParseInfo from './Compile/ParseInfo';
import { ScriptOriginOptions } from './Compile/Script';
// 在这里设置待编译字符串
const source = `
function fn(a, b, c){
  let v = 1;
  if(true) log(123);
}
class cls {
  constructor() {
    this.a = 1;
  }
  fnc() {}
}
`;

let parse_info = new ParseInfo(isolate);
parse_info.CreateScript(isolate, source, new ScriptOriginOptions(), false);
Parsing.ParseProgram(parse_info, isolate);

let AstBody = parse_info.literal_.body_;
/**
 * 需要注意 普通函数声明不会出现在语法树中 而是存在作用域变量池里
 */
for(let statement of AstBody) {
  console.log(statement);
}
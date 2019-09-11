// import Scanner from './Parsing/scanner/Scanner';
// // import Parser from './Parsing/parse/Parser';
// /**
//  * 普通node模式不支持import语法
//  * 需安装babel-node工具
//  */
const source_code = "let a = 1;";
// let scanner = new Scanner(source_code);
// // 启动扫描器
// scanner.Initialize();
// // 扫描下一个Token
// scanner.Next();

import Isolate, { CreateParams } from './Compile/Isolate';
import Context from './Compile/Context';
import Script from './Compile/Script';

let create_params = new CreateParams();
let isolate = Isolate.New(create_params);
let context = new Context(isolate);

Script.Compile(context, source_code);
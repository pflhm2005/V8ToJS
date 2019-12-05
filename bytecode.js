/**
 * 这个文件负责解析字节码
 * 包含完整的Token => Expression => Statement => FunctionLiteral => ByteCode过程
 */
const source_code = "let a = 1;";

import { Isolate, CreateParams } from './Execution/Isolate';
import Context from './Execution/Context';
import Script from './Execution/Script';

let create_params = new CreateParams();
let isolate = Isolate.New(create_params);
let context = new Context(isolate);

Script._Compile(context, source_code);
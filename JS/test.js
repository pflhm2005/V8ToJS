import Scanner from './AST/Scanner';
/**
 * 普通node模式不支持import语法
 * 需安装babel-node工具
 */
const source_code = "'Hello World'";
let scanner = new Scanner(source_code);
scanner.Initialize();
console.log(scanner)
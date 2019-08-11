import Scanner from './AST/Scanner';
import Parser from './AST/Parser';
/**
 * 普通node模式不支持import语法
 * 需安装babel-node工具
 */
const source_code = "let a = 1";
let scanner = new Scanner(source_code);
let parser = new Parser(scanner);
parser.ParseStatementListItem();

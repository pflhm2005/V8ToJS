import Scanner from './ParseStatementList/scanner/Scanner';
import Parser from './ParseStatementList/parse/Parser';
/**
 * 普通node模式不支持import语法
 * 需安装babel-node工具
 */
const source_code = "function fn(a, b ,c) {}";
let scanner = new Scanner(source_code);
scanner.Initialize();
let parser = new Parser(scanner);
parser.ParseStatementListItem();

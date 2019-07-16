# #1 JavaScript源字符串=>AST过程



## 涉及模块

> 所有模块均位于/src/parsing文件夹内

| 涉及模块                  | 简介                                                         |
| ------------------------- | ------------------------------------------------------------ |
| ParseInfo                 | 作为编译信息的描述文件，包含源字符串与一些配置参数           |
| Parsing                   | 此模块仅仅是命名空间，非常规类，包含ParseProgram、ParseFunction、ParseAny三个入口方法a |
| Scanner-character-streams | 负责将Handle<String>转换为(Un)BufferedCharacterStream类型，该类继承于scanner模块的Utf16CharacterStream，包含Advance步进、peek返回当前、AdvanceUntil条件步进等方法 |
| Scanner                   | 可以一步一步的解析源字符串，Initialize方法只会进行一次步进解析，同时会初始化所有必要属性，以便后续的转换 |
| Token                     | 抽象语法树的枚举类型类，包含所有关键词、符号、运算符等等     |
| Parser                    | 核心类，负责完整的解析与转换，返回结果交给asm模块编译        |



## 类的继承关系树

![AST类](/Users/feilongpang/Downloads/AST类.png)



麻烦的一批
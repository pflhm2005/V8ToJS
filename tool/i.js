/**
 * 随便写写的工具函数
 * 不关注性能 node真快
 */
const fs = require('fs');

function readAndWrite(readCallback) {
  fs.readFile('./source.js', 'utf8', (err, str) => {
    let result = [];
    readCallback(result, str);
    fs.writeFile('./result.js', result.join(''), (err) => {});
  });
}


/***
 * 处理export xxx = ;
 * 加索引
 */
function setIndex() {
  readAndWrite((ar, str) => {
    let l = str.length;
    let idx = 0;
    for (let i = 0; i < l; ++i) {
      let char = str[i];
      ar.push(char);
      if (char === '=') ar.push(` ${idx++}`);
    }
  });
}

setIndex();

/**
 * 转换V8枚举
 * 输入形式类似于
 * #define XXXX(V)  \
 *  V(AsyncFunctionAwaitCaught, async_function_await_caught, 2)        \
 *  ...
 *  V(ToObject, to_object, 1)
 * 需要将第一个参数转换为枚举值
 * export const xxx_kAsyncFunctionAwaitCaught = 0;
 * ...
 * @param {String} key 宏内部调用的字母 如V、F等等
 * @param {String} prefix 枚举值前缀 一般是类名
 */
function transformV8MacroToEnum(key, prefix) {
  readAndWrite((ar, str) => {
    let flag = false;
    let l = str.length;
    let idx = 0;
    for (let i = 0; i < l; ++i) {
      let char = str[i];
      // 理论上不会出现
      if (i === l - 1) break;
      if (char === key && str[i + 1] === '(') {
        ar.push(`export const ${prefix}`);
        flag = true;
        i++;
        continue;
      }
      if (flag && (char === ',' || char === ')')) {
        flag = false;
        ar.push(` = ${idx++};\n`);
      }
      if (flag) ar.push(char);
    }
  });
}

// transformV8MacroToEnum('V', 'IntrinsicId_k');

/**
 * 考虑写一个函数处理C++的宏
 */

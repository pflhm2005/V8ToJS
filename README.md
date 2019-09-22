# V8record
记录阅读v8源码过程的笔记，尝试用JavaScript翻译V8引擎

支持所有Token的解析，完成了`let a = 1;let b = {a : 1};function fn(a,b,c){}`简单字面量的解析

~~目前C++部分比较杂乱 没有时间整理，也没啥看头(已移除)~~

~~看JS文件夹里的内容吧~~

文件分类跟源码不太一致，逻辑上基本按照源码进行了复现，注释极其详细

依次运行
```
npm install babel-cli -g
npm install babel-preset-env -D
```

启动解析 运行对应的测试文件
```
babel-node --presets env xxx
```

目前仅有对Token的全解析 可以自行修改待编译字符串并查看打印结果

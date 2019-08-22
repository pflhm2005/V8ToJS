export const getTypeOf = (input) => {
  if(typeof input === 'string') return 'string';
  else if(Object.prototype.toString.call(input) === '[object Array]') return 'array';
  else if (input instanceof Uint8Array) return 'unit8array';
  else if (input instanceof ArrayBuffer) return 'arraybuffer';
}

const noop = () => {};

const stringToArrayLike = (str, ar) => {
  for(let i = 0;i < str.length;i++) ar[i] = str.charCodeAt(i) & 0xff;
  return ar;
}
const string2binary = (str) => {
  let len = str.length;
  let result = new Uint8Array(len);
  for(let i = 0;i < len;i++) result[i] = str.charCodeAt(i) & 0xff;
  return result;
}

/**
 * 返回指定格式的数据
 * 3.0版本由于添加了Blob类型的处理 所以做了异步 我不需要
 * @param {String} name 文件名
 * @param {Any} data 数据源
 * @param {Boolean} isBinary 二进制标记
 * @param {Boolean} isOptimizedBinaryString 已压缩标记
 * @param {Boolean} isBase64 base64标记
 */
export const prepareContent = (name, data, isBinary, isOptimizedBinaryString, isBase64) => {
  // return new Promise((resolve, reject) => {
  //   if(data instanceof Blob) {
  //     let reader = new FileReader();
  //     reader.onload = (e) => resolve(e.target.result);
  //     reader.onerror = (e) => reject(e.target.error);
  //     reader.readAsArrayBuffer(data);
  //   } else {
  //     resolve(data);
  //   }
  // }).then(data => {
  //   let type = getTypeOf(data);
  //   if(type === 'arraybuffer') data = transformTo('unit8array', data);
  //   else if(type === 'string'){
  //     if(isBase64) data = decode(data);
  //     /**
  //      * 基本上走这个分支
  //      */
  //     else if(isBinary && !isOptimizedBinaryString) data = string2binary(data);
  //   }
  //   return data;
  // });
  let type = getTypeOf(data);
  if(type === 'arraybuffer') data = transformTo('unit8array', data);
  else if(type === 'string'){
    if(isBase64) data = decode(data);
    /**
     * 基本上走这个分支
     */
    else if(isBinary && !isOptimizedBinaryString) data = string2binary(data);
  }
  return data;
}

export const encode = noop;
export const decode = noop;

export const string2buf = noop;

export const transformTo = noop;
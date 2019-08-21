import { CTYPE_DEFAULTS_ARRAY } from './const';

const wxt_helper = (obj = null) => {
  if(!obj) return '';
  return Object.keys(obj).map(v => ` ${v}="${obj[v]}"`).join('');
}
export const writextag = (tagName, space = null, obj = null) => {
  let tail = '/>';
  let wtregex = /(^\s|\s$|\n)/;
  if(space) {
    if(space.match(wtregex)) tail = ` xml:space="preserve"></${tagName}>`;
    else tail = `>${space}</${tagName}>`;
  }
  return `<${tagName}${wxt_helper(obj)}${tail}`;
}

export const safe_decode_range = (range) => {
  let o = { s: { c: 0, r: 0 }, e: { c: 0, r: 0 } };
  let idx = 0, i = 0, cc = 0;
  let len = range.length;
  for (idx = 0; i < len; ++i) {
    if ((cc = range.charCodeAt(i) - 64) < 1 || cc > 26) break;
    idx = 26 * idx + cc;
  }
  o.s.c = --idx;

  for (idx = 0; i < len; ++i) {
    if ((cc = range.charCodeAt(i) - 48) < 0 || cc > 9) break;
    idx = 10 * idx + cc;
  }
  o.s.r = --idx;

  if (i === len || range.charCodeAt(++i) === 58) {
    o.e.c = o.s.c;
    o.e.r = o.s.r;
    return o;
  }

  for (idx = 0; i != len; ++i) {
    if ((cc = range.charCodeAt(i) - 64) < 1 || cc > 26) break;
    idx = 26 * idx + cc;
  }
  o.e.c = --idx;

  for (idx = 0; i != len; ++i) {
    if ((cc = range.charCodeAt(i) - 48) < 0 || cc > 9) break;
    idx = 10 * idx + cc;
  }
  o.e.r = --idx;
  return o;
}

function evert(obj) {
	let o = ([]), K = Object.keys(obj);
	for(let i = 0; i !== K.length; ++i) o[obj[K[i]]] = K[i];
	return o;
}
let encodings = {
	'&quot;': '"',
	'&apos;': "'",
	'&gt;': '>',
	'&lt;': '<',
	'&amp;': '&'
};
let rencoding = evert(encodings);
let decregex=/[&<>'"]/g;
let charegex = /[\u0000-\u0008\u000b-\u001f]/g;
export const escapexml = (text) => {
	let s = text + '';
	return s.replace(decregex, function(y) { return rencoding[y]; }).replace(charegex,function(s) { return "_x" + ("000"+s.charCodeAt(0).toString(16)).slice(-4) + "_";});
}

export const CTYPE_DEFAULTS = CTYPE_DEFAULTS_ARRAY.map(v => writextag("Default", null, { Extension: v[0], ContentType: v[1] }));
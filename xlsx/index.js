import { escapexml, writextag, safe_decode_range, CTYPE_DEFAULTS } from './utils';
import {
  XML_HEADER,
  RELS_CORE_PROPS,
  RELS_EXT_PROPS,
  RELS_WS,
  RELS,
  WS_XML_ROOT,
  CORE_ROOT,
  WB_XML_ROOT,
  RELS_ROOT,
  CTYPE_XML_ROOT,
  EXT_PROPS,
  THEME,
  STYLE,
  type2ct,
  EXT_PROPS_XML_ROOT,
  CT_LIST,
} from './const';

import JSZip from 'jszip';

// const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

// const RELS_CORE_PROPS = 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties';
// const RELS_EXT_PROPS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties';
// const RELS_WS = [
//   "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
//   "http://purl.oclc.org/ooxml/officeDocument/relationships/worksheet"
// ];
// const RELS = {
//   WB: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
//   SHEET: "http://sheetjs.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
//   HLINK: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
//   VML: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing",
//   VBA: "http://schemas.microsoft.com/office/2006/relationships/vbaProject",
//   THEME: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
//   STY: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
// };

// const WS_XML_ROOT = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
// const CORE_ROOT = '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>';
// const WB_XML_ROOT = '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
// const STYLES_XML_ROOT = '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">';
// const EXT_PROPS_XML_ROOT = '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">';
// const RELS_ROOT = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
// const CTYPE_XML_ROOT = '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">';

// const EXT_PROPS = [
//   ["Application", "Application", "string"],
//   ["AppVersion", "AppVersion", "string"],
//   ["Company", "Company", "string"],
//   ["DocSecurity", "DocSecurity", "string"],
//   ["Manager", "Manager", "string"],
//   ["HyperlinksChanged", "HyperlinksChanged", "bool"],
//   ["SharedDoc", "SharedDoc", "bool"],
//   ["LinksUpToDate", "LinksUpToDate", "bool"],
//   ["ScaleCrop", "ScaleCrop", "bool"],
//   ["HeadingPairs", "HeadingPairs", "raw"],
//   ["TitlesOfParts", "TitlesOfParts", "raw"]
// ];

// const THEME = [
//   XML_HEADER,
//   '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">',
//   '<a:themeElements>',
//   '<a:clrScheme name="Office">',
//   '<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>',
//   '<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>',
//   '<a:dk2><a:srgbClr val="1F497D"/></a:dk2>',
//   '<a:lt2><a:srgbClr val="EEECE1"/></a:lt2>',
//   '<a:accent1><a:srgbClr val="4F81BD"/></a:accent1>',
//   '<a:accent2><a:srgbClr val="C0504D"/></a:accent2>',
//   '<a:accent3><a:srgbClr val="9BBB59"/></a:accent3>',
//   '<a:accent4><a:srgbClr val="8064A2"/></a:accent4>',
//   '<a:accent5><a:srgbClr val="4BACC6"/></a:accent5>',
//   '<a:accent6><a:srgbClr val="F79646"/></a:accent6>',
//   '<a:hlink><a:srgbClr val="0000FF"/></a:hlink>',
//   '<a:folHlink><a:srgbClr val="800080"/></a:folHlink>',
//   '</a:clrScheme>',
//   '<a:fontScheme name="Office">',
//   '<a:majorFont>',
//   '<a:latin typeface="Cambria"/>',
//   '<a:ea typeface=""/>',
//   '<a:cs typeface=""/>',
//   '<a:font script="Jpan" typeface="ＭＳ Ｐゴシック"/>',
//   '<a:font script="Hang" typeface="맑은 고딕"/>',
//   '<a:font script="Hans" typeface="宋体"/>',
//   '<a:font script="Hant" typeface="新細明體"/>',
//   '<a:font script="Arab" typeface="Times New Roman"/>',
//   '<a:font script="Hebr" typeface="Times New Roman"/>',
//   '<a:font script="Thai" typeface="Tahoma"/>',
//   '<a:font script="Ethi" typeface="Nyala"/>',
//   '<a:font script="Beng" typeface="Vrinda"/>',
//   '<a:font script="Gujr" typeface="Shruti"/>',
//   '<a:font script="Khmr" typeface="MoolBoran"/>',
//   '<a:font script="Knda" typeface="Tunga"/>',
//   '<a:font script="Guru" typeface="Raavi"/>',
//   '<a:font script="Cans" typeface="Euphemia"/>',
//   '<a:font script="Cher" typeface="Plantagenet Cherokee"/>',
//   '<a:font script="Yiii" typeface="Microsoft Yi Baiti"/>',
//   '<a:font script="Tibt" typeface="Microsoft Himalaya"/>',
//   '<a:font script="Thaa" typeface="MV Boli"/>',
//   '<a:font script="Deva" typeface="Mangal"/>',
//   '<a:font script="Telu" typeface="Gautami"/>',
//   '<a:font script="Taml" typeface="Latha"/>',
//   '<a:font script="Syrc" typeface="Estrangelo Edessa"/>',
//   '<a:font script="Orya" typeface="Kalinga"/>',
//   '<a:font script="Mlym" typeface="Kartika"/>',
//   '<a:font script="Laoo" typeface="DokChampa"/>',
//   '<a:font script="Sinh" typeface="Iskoola Pota"/>',
//   '<a:font script="Mong" typeface="Mongolian Baiti"/>',
//   '<a:font script="Viet" typeface="Times New Roman"/>',
//   '<a:font script="Uigh" typeface="Microsoft Uighur"/>',
//   '<a:font script="Geor" typeface="Sylfaen"/>',
//   '</a:majorFont>',
//   '<a:minorFont>',
//   '<a:latin typeface="Calibri"/>',
//   '<a:ea typeface=""/>',
//   '<a:cs typeface=""/>',
//   '<a:font script="Jpan" typeface="ＭＳ Ｐゴシック"/>',
//   '<a:font script="Hang" typeface="맑은 고딕"/>',
//   '<a:font script="Hans" typeface="宋体"/>',
//   '<a:font script="Hant" typeface="新細明體"/>',
//   '<a:font script="Arab" typeface="Arial"/>',
//   '<a:font script="Hebr" typeface="Arial"/>',
//   '<a:font script="Thai" typeface="Tahoma"/>',
//   '<a:font script="Ethi" typeface="Nyala"/>',
//   '<a:font script="Beng" typeface="Vrinda"/>',
//   '<a:font script="Gujr" typeface="Shruti"/>',
//   '<a:font script="Khmr" typeface="DaunPenh"/>',
//   '<a:font script="Knda" typeface="Tunga"/>',
//   '<a:font script="Guru" typeface="Raavi"/>',
//   '<a:font script="Cans" typeface="Euphemia"/>',
//   '<a:font script="Cher" typeface="Plantagenet Cherokee"/>',
//   '<a:font script="Yiii" typeface="Microsoft Yi Baiti"/>',
//   '<a:font script="Tibt" typeface="Microsoft Himalaya"/>',
//   '<a:font script="Thaa" typeface="MV Boli"/>',
//   '<a:font script="Deva" typeface="Mangal"/>',
//   '<a:font script="Telu" typeface="Gautami"/>',
//   '<a:font script="Taml" typeface="Latha"/>',
//   '<a:font script="Syrc" typeface="Estrangelo Edessa"/>',
//   '<a:font script="Orya" typeface="Kalinga"/>',
//   '<a:font script="Mlym" typeface="Kartika"/>',
//   '<a:font script="Laoo" typeface="DokChampa"/>',
//   '<a:font script="Sinh" typeface="Iskoola Pota"/>',
//   '<a:font script="Mong" typeface="Mongolian Baiti"/>',
//   '<a:font script="Viet" typeface="Arial"/>',
//   '<a:font script="Uigh" typeface="Microsoft Uighur"/>',
//   '<a:font script="Geor" typeface="Sylfaen"/>',
//   '</a:minorFont>',
//   '</a:fontScheme>',
//   '<a:fmtScheme name="Office">',
//   '<a:fillStyleLst>',
//   '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>',
//   '<a:gradFill rotWithShape="1">',
//   '<a:gsLst>',
//   '<a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/><a:satMod val="300000"/></a:schemeClr></a:gs>',
//   '<a:gs pos="35000"><a:schemeClr val="phClr"><a:tint val="37000"/><a:satMod val="300000"/></a:schemeClr></a:gs>',
//   '<a:gs pos="100000"><a:schemeClr val="phClr"><a:tint val="15000"/><a:satMod val="350000"/></a:schemeClr></a:gs>',
//   '</a:gsLst>',
//   '<a:lin ang="16200000" scaled="1"/>',
//   '</a:gradFill>',
//   '<a:gradFill rotWithShape="1">',
//   '<a:gsLst>',
//   '<a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="100000"/><a:shade val="100000"/><a:satMod val="130000"/></a:schemeClr></a:gs>',
//   '<a:gs pos="100000"><a:schemeClr val="phClr"><a:tint val="50000"/><a:shade val="100000"/><a:satMod val="350000"/></a:schemeClr></a:gs>',
//   '</a:gsLst>',
//   '<a:lin ang="16200000" scaled="0"/>',
//   '</a:gradFill>',
//   '</a:fillStyleLst>',
//   '<a:lnStyleLst>',
//   '<a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"><a:shade val="95000"/><a:satMod val="105000"/></a:schemeClr></a:solidFill><a:prstDash val="solid"/></a:ln>',
//   '<a:ln w="25400" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>',
//   '<a:ln w="38100" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>',
//   '</a:lnStyleLst>',
//   '<a:effectStyleLst>',
//   '<a:effectStyle>',
//   '<a:effectLst>',
//   '<a:outerShdw blurRad="40000" dist="20000" dir="5400000" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="38000"/></a:srgbClr></a:outerShdw>',
//   '</a:effectLst>',
//   '</a:effectStyle>',
//   '<a:effectStyle>',
//   '<a:effectLst>',
//   '<a:outerShdw blurRad="40000" dist="23000" dir="5400000" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="35000"/></a:srgbClr></a:outerShdw>',
//   '</a:effectLst>',
//   '</a:effectStyle>',
//   '<a:effectStyle>',
//   '<a:effectLst>',
//   '<a:outerShdw blurRad="40000" dist="23000" dir="5400000" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="35000"/></a:srgbClr></a:outerShdw>',
//   '</a:effectLst>',
//   '<a:scene3d><a:camera prst="orthographicFront"><a:rot lat="0" lon="0" rev="0"/></a:camera><a:lightRig rig="threePt" dir="t"><a:rot lat="0" lon="0" rev="1200000"/></a:lightRig></a:scene3d>',
//   '<a:sp3d><a:bevelT w="63500" h="25400"/></a:sp3d>',
//   '</a:effectStyle>',
//   '</a:effectStyleLst>',
//   '<a:bgFillStyleLst>',
//   '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>',
//   '<a:gradFill rotWithShape="1">',
//   '<a:gsLst>',
//   '<a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="40000"/><a:satMod val="350000"/></a:schemeClr></a:gs>',
//   '<a:gs pos="40000"><a:schemeClr val="phClr"><a:tint val="45000"/><a:shade val="99000"/><a:satMod val="350000"/></a:schemeClr></a:gs>',
//   '<a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="20000"/><a:satMod val="255000"/></a:schemeClr></a:gs>',
//   '</a:gsLst>',
//   '<a:path path="circle"><a:fillToRect l="50000" t="-80000" r="50000" b="180000"/></a:path>',
//   '</a:gradFill>',
//   '<a:gradFill rotWithShape="1">',
//   '<a:gsLst>',
//   '<a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="80000"/><a:satMod val="300000"/></a:schemeClr></a:gs>',
//   '<a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="30000"/><a:satMod val="200000"/></a:schemeClr></a:gs>',
//   '</a:gsLst>',
//   '<a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path>',
//   '</a:gradFill>',
//   '</a:bgFillStyleLst>',
//   '</a:fmtScheme>',
//   '</a:themeElements>',
//   '<a:objectDefaults>',
//   '<a:spDef>',
//   '<a:spPr/><a:bodyPr/><a:lstStyle/><a:style><a:lnRef idx="1"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="2"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></a:style>',
//   '</a:spDef>',
//   '<a:lnDef>',
//   '<a:spPr/><a:bodyPr/><a:lstStyle/><a:style><a:lnRef idx="2"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="0"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="1"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="tx1"/></a:fontRef></a:style>',
//   '</a:lnDef>',
//   '</a:objectDefaults>',
//   '<a:extraClrSchemeLst/>',
//   '</a:theme>',
// ].join("");

// const STYLE = [
//   XML_HEADER,
//   STYLES_XML_ROOT,
//   '<numFmts count="1"><numFmt numFmtId="56" formatCode="&quot;上午/下午 &quot;hh&quot;時&quot;mm&quot;分&quot;ss&quot;秒 &quot;"/></numFmts>',
//   '<fonts count="1"><font><sz val="12"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font></fonts>',
//   '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>',
//   '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>',
//   '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
//   '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyAlignment="1"><alignment horizontal="center"/></xf></cellXfs>',
//   '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/>',
//   '<tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleMedium4"/></styleSheet>',
// ].join('');

// const type2ct = {
//   rels: "application/vnd.openxmlformats-package.relationships+xml",
//   themes: "application/vnd.openxmlformats-officedocument.theme+xml",
//   coreprops: "application/vnd.openxmlformats-package.core-properties+xml",
//   extprops: "application/vnd.openxmlformats-officedocument.extended-properties+xml",
// };

// const CTYPE_DEFAULTS_ARRAY = [
//   ["xml", "application/xml"],
//   ["bin", "application/vnd.ms-excel.sheet.binary.macroEnabled.main"],
//   ["vml", "application/vnd.openxmlformats-officedocument.vmlDrawing"],
//   /* from test files */
//   ["bmp", "image/bmp"],
//   ["png", "image/png"],
//   ["gif", "image/gif"],
//   ["emf", "image/x-emf"],
//   ["wmf", "image/x-wmf"],
//   ["jpg", "image/jpeg"],
//   ["jpeg", "image/jpeg"],
//   ["tif", "image/tiff"],
//   ["tiff", "image/tiff"],
//   ["pdf", "application/pdf"],
//   ["rels", type2ct.rels]
// ];

// const CT_LIST = {
//   "workbooks": {
//     "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
//     "xlsm": "application/vnd.ms-excel.sheet.macroEnabled.main+xml",
//     "xlsb": "application/vnd.ms-excel.sheet.binary.macroEnabled.main",
//     "xlam": "application/vnd.ms-excel.addin.macroEnabled.main+xml",
//     "xltx": "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml"
//   }, 
//   "strs": {
//     "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml",
//     "xlsb": "application/vnd.ms-excel.sharedStrings",
//     "xlsm": "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml",
//     "xlam": "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"
//   }, 
//   "comments": {
//     "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml",
//     "xlsb": "application/vnd.ms-excel.comments",
//     "xlsm": "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml",
//     "xlam": "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml"
//   }, 
//   "sheets": {
//     "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
//     "xlsb": "application/vnd.ms-excel.worksheet",
//     "xlsm": "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
//     "xlam": "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"
//   }, 
//   "charts": {
//     "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml",
//     "xlsb": "application/vnd.ms-excel.chartsheet",
//     "xlsm": "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml",
//     "xlam": "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml"
//   }, 
//   "dialogs": {
//     "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml",
//     "xlsb": "application/vnd.ms-excel.dialogsheet",
//     "xlsm": "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml",
//     "xlam": "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml"
//   },
//   "macros": {
//     "xlsx": "application/vnd.ms-excel.macrosheet+xml",
//     "xlsb": "application/vnd.ms-excel.macrosheet",
//     "xlsm": "application/vnd.ms-excel.macrosheet+xml",
//     "xlam": "application/vnd.ms-excel.macrosheet+xml"
//   },
//   "styles": {
//     "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
//     "xlsb": "application/vnd.ms-excel.styles",
//     "xlsm": "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml", 
//     "xlam": "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"
//   }
// };

// const wxt_helper = (obj = null) => {
//   if(!obj) return '';
//   return Object.keys(obj).map(v => ` ${v}="${obj[v]}"`).join('');
// }
// const writextag = (tagName, space = null, obj = null) => {
//   let tail = '/>';
//   let wtregex = /(^\s|\s$|\n)/;
//   if(space) {
//     if(space.match(wtregex)) tail = ` xml:space="preserve"></${tagName}>`;
//     else tail = `>${space}</${tagName}>`;
//   }
//   return `<${tagName}${wxt_helper(obj)}${tail}`;
// }

// const s2ab = (str) => {
//   let len = str.length;
//   let buf = new ArrayBuffer(len);
//   let view = new Uint8Array(buf);
//   for(let i = 0;i < len;i++) view[i] = str.charCodeAt(i) & 0xff;
//   return buf;
// }

// const safe_decode_range = (range) => {
//   let o = { s: { c: 0, r: 0 }, e: { c: 0, r: 0 } };
//   let idx = 0, i = 0, cc = 0;
//   let len = range.length;
//   for (idx = 0; i < len; ++i) {
//     if ((cc = range.charCodeAt(i) - 64) < 1 || cc > 26) break;
//     idx = 26 * idx + cc;
//   }
//   o.s.c = --idx;

//   for (idx = 0; i < len; ++i) {
//     if ((cc = range.charCodeAt(i) - 48) < 0 || cc > 9) break;
//     idx = 10 * idx + cc;
//   }
//   o.s.r = --idx;

//   if (i === len || range.charCodeAt(++i) === 58) {
//     o.e.c = o.s.c;
//     o.e.r = o.s.r;
//     return o;
//   }

//   for (idx = 0; i != len; ++i) {
//     if ((cc = range.charCodeAt(i) - 64) < 1 || cc > 26) break;
//     idx = 26 * idx + cc;
//   }
//   o.e.c = --idx;

//   for (idx = 0; i != len; ++i) {
//     if ((cc = range.charCodeAt(i) - 48) < 0 || cc > 9) break;
//     idx = 10 * idx + cc;
//   }
//   o.e.r = --idx;
//   return o;
// }

// function evert(obj) {
// 	let o = ([]), K = Object.keys(obj);
// 	for(let i = 0; i !== K.length; ++i) o[obj[K[i]]] = K[i];
// 	return o;
// }
// let encodings = {
// 	'&quot;': '"',
// 	'&apos;': "'",
// 	'&gt;': '>',
// 	'&lt;': '<',
// 	'&amp;': '&'
// };
// let rencoding = evert(encodings);
// let decregex=/[&<>'"]/g;
// let charegex = /[\u0000-\u0008\u000b-\u001f]/g;
// const escapexml = (text) => {
// 	let s = text + '';
// 	return s.replace(decregex, function(y) { return rencoding[y]; }).replace(charegex,function(s) { return "_x" + ("000"+s.charCodeAt(0).toString(16)).slice(-4) + "_";});
// }

// const CTYPE_DEFAULTS = CTYPE_DEFAULTS_ARRAY.map(v => writextag("Default", null, { Extension: v[0], ContentType: v[1] }));

// (function() {
/**
 * excel导出类
 */
class XLSX {
  constructor() {}
  check(wb) {
    if (!wb || !wb.SheetNames || !wb.Sheets) throw new Error("Invalid Workbook");
    if (!wb.SheetNames.length) throw new Error("Workbook is empty");
  }
  write(wb, opt = {}){
    this.check(wb);
    return this.write_zip_type(wb, opt);
  }
  write_zip_type(wb, opt) {
    let zip = this.write_zip(wb, opt);
    return zip.generateAsync({ type: 'string' }).then(s2ab);
  }
  write_zip(wb, opts) {
    opts = Object.assign(opts, {
      rels: {},
      wbrels: {},
      c: [],
      Strings: {
        Count: 0,
        Unique: 0,
      },
      revStrings: new Map(),
      bookType: 'xlsx', 
      bookSST: false,
      type: 'binary'
    });

    let wbext = "xml";
    let ct = {
      workbooks:[], 
      sheets:[], 
      charts:[], 
      dialogs:[], 
      macros:[],
      rels:[], 
      strs:[], 
      comments:[], 
      links:[],
      coreprops:[], 
      extprops:[], 
      custprops:[], 
      themes:[], 
      styles:[],
      calcchains:[], 
      vba: [], 
      drawings: [],
      TODO:[], 
      xmlns: ""
    };
    let zip = new JSZip();

    // 生成core.xml
    let core = "docProps/core.xml";
    zip.file(core, `${XML_HEADER}${CORE_ROOT}`);
    ct.coreprops.push(core);
    this.add_rels(opts.rels, 2, core, RELS_CORE_PROPS);

    // 生成app.xml
    let app = "docProps/app.xml";
    wb.Props.SheetNames = wb.SheetNames;
    wb.Props.Worksheets = wb.SheetNames.length;
    wb.Props.Application = "SheetJS";
    zip.file(app, this.write_ext_props(wb.Props));
    ct.extprops.push(app);
    this.add_rels(opts.rels, 3, app, RELS_EXT_PROPS);

    // 生成sheet.xml
    for(let rId = 0; rId < wb.SheetNames.length; rId++) {
      let wsrels = { '!id': {} };
      let sheet = `xl/worksheets/sheet${rId + 1}.${wbext}`;
      zip.file(sheet, this.write_ws_xml(rId, opts, wb, wsrels));
      ct.sheets.push(sheet);
      this.add_rels(opts.wbrels, -1, `worksheets/sheet${rId + 1}.${wbext}`, RELS_WS[0])
    }

    // 生成workbook.xml
    let workbook = `xl/workbook.${wbext}`;
    zip.file(workbook, this.write_wb_xml(wb));
    ct.workbooks.push(workbook);
    this.add_rels(opts.rels, 1, workbook, RELS.WB);

    // 生成theme.xml
    let theme = "xl/theme/theme1.xml";
    zip.file(theme, THEME);
    ct.themes.push(theme);
    this.add_rels(opts.wbrels, -1, "theme/theme1.xml", RELS.THEME);

    // 生成style.xml
    let style = `xl/styles.${wbext}`;
    zip.file(style, STYLE);
    ct.styles.push(style);
    this.add_rels(opts.wbrels, -1, `styles.${wbext}`, RELS.STY);

    // 生成其他xml文件
    zip.file('[Content_Types].xml', this.write_ct(ct, opts));
    zip.file('_rels/.rels', this.write_rels(opts.rels));
    zip.file(`xl/_rels/workbook.${wbext}.rels`, this.write_rels(opts.wbrels));

    return zip;
  }
  add_rels(rels, rId, target, type, relobj = {}) {
    if(!rels['!id']) rels['!id'] = {};
    if(rId < 0) for(rId = 1; rels['!id']['rId' + rId]; ++rId);
    relobj.Id = `rId${rId}`;
    relobj.Type = type;
    relobj.Target = target;
    rels['!id'][relobj.Id] = relobj;
    rels[`/${target}`] = relobj;
  }
  write_ext_props(cp) {
    return [ 
      XML_HEADER,
      EXT_PROPS_XML_ROOT,
      '<Application>SheetJS</Application>',
      '<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs>',
      '<TitlesOfParts><vt:vector size="1" baseType="lpstr">',
      cp.SheetNames.map(v => `<vt:lpstr>${escapexml(v)}</vt:lpstr>`),
      '</vt:vector></TitlesOfParts></Properties>',
    ].join('');
  }
  write_ws_xml(idx, opts, wb, rels) {
    let o = [XML_HEADER, WS_XML_ROOT];
    let sheet = wb.SheetNames[idx], sidx = 0, rdata = '';
    let workSheet = wb.Sheets[sheet];
    let ref = workSheet['!ref'];
    // let range = safe_decode_range(ref);
    workSheet['!comments'] = [];
    workSheet['!drawing'] = [];
    o.push(writextag('dimension', null, { 'ref': ref }));
    o.push(writextag('sheetViews', writextag('sheetView', null, { workbookViewId: "0" }), {}));
    
    // if(ws['!cols'] != null && ws['!cols'].length > 0) (write_ws_xml_cols(ws, ws['!cols']));
    workSheet['!links'] = [];
    sidx = o.length;
    o.push('<sheetData>');
    o.push(this.write_ws_xml_data(workSheet, opts, idx, wb, rels));
    o.push('</sheetData>');

    if(ws['!merges'] && ws['!merges'].length > 0) o.push(this.write_ws_xml_merges(ws['!merges']));
    o.push('');
    o.push(writextag("ignoredErrors", writextag("ignoredError", null, { numberStoredAsText: 1, sqref: ref })));
    o.push('</worksheet>');

    return o.join('');
  }
  write_ws_xml_data(ws, opts, idx, wb) {
    let o = [], cols = [], range = safe_decode_range(ws['!ref']);
    let startColumn = range.s.c, endColumn = range.e.c;
    let startRow = range.s.r, endRow = range.e.r;
    
    for(let i = startColumn; i <= endColumn; i++) cols.push(this.encode_col(i));
    for(let i = startRow; i <= endRow; i++) {
      let r = [];
      let rr = this.encode_row(i);
      for(let j = startColumn; j <= endColumn; j++) {
        let ref = cols[j] + rr;
        let cell = ws[ref];
        if(!cell) continue;
        r.push(this.write_ws_xml_cell(cell, ref, ws, opts));
      }
      if(r.length) o.push(writextag('row', r.join(''), { r: rr }));
    }
    return o.join('');
  }
  write_ws_xml_cell(cell, ref, ws, opts) {
    if ((cell.v === undefined && cell.f === undefined) || cell.t === "z") return '';
    // 处理类型格式化
    let v = writextag('v', escapexml(cell.v));
    // if (cell.l) ws["!links"].push([ref, cell.l]);
    // if (cell.c) ws["!comments"].push([ref, cell.c]);
    return writextag('c', v, {
      r: ref,
      t: 'str',
      s: '2',
    });
  }
  write_ws_xml_merges(merges) {
    return [`<mergeCells count="${merges.length}">`,
      merges.map(v => `<mergeCell ref="${this.encode_range(v.s, v.e)}"/>`).join(''),
      '</mergeCells>',
    ].join('');
  }
  // get_cell_style(styles, cell, opts) {
  //   let z = 0, len = styles.length;
  //   styles = [{
  //     numFmtId: z,
  //     fontId: 0,
  //     fillId: 0,
  //     borderId: 0,
  //     xfId: 0,
  //     applyNumberFormat: 1
  //   }];
  // }
  write_wb_xml(wb) {
    let o = [XML_HEADER, WB_XML_ROOT];
    o.push(writextag("workbookPr", null, { codeName: "ThisWorkbook" }));
    o.push('<sheets>');
    for(let i = 0; i < wb.SheetNames.length; i++) {
      let sht = {
        name: escapexml(wb.SheetNames[i].slice(0, 31)),
        sheetId: i + 1,
        ["r:id"]: `rId${i + 1}`,
      }
      o.push(writextag('sheet', null, sht));
    }
    o.push('</sheets>');
    o.push('</workbook>');
    return o.join('');
  }
  write_ct(ct) {
    let o = [XML_HEADER, CTYPE_XML_ROOT];
    o = o.concat(CTYPE_DEFAULTS);
    ['workbooks', 'sheets', 'styles'].forEach(v => o.push(writextag('Override', null, {
      PartName: `/${ct[v][0]}`,
      ContentType: CT_LIST[v].xlsx,
    })));
    ['themes', 'coreprops', 'extprops'].forEach(v => o.push(writextag('Override', null, {
      PartName: `/${ct[v][0]}`,
      ContentType: type2ct[v],
    })));
    o.push('</Types>');
    return o.join('');
  }
  write_rels(rels) {
    return [
      XML_HEADER, 
      RELS_ROOT, 
      ...Object.keys(rels['!id']).map(rId => writextag("Relationship", null, rels['!id'][rId])),
      '</Relationships>',
    ].join('');
  }

  /**
   * 格式转换相关工具
   */
  encode_col(i) {
    let s = '';
    for(++i;i;i = Math.floor((i - 1) / 26)) s = String.fromCharCode((i - 1) % 26 + 65) + s;
    return s;
  }
  encode_row(i) {
    return String(i + 1);
  }
  encode_cell(cell) {
    return this.encode_col(cell.c) + this.encode_row(cell.r);
  }
  encode_range(s, e) {
    let cs = this.encode_cell(s);
    let ce = this.encode_cell(e);
    return cs === ce ? cs : `${cs}:${ce}`;
  }
  book_new() {
    return { SheetNames: [], Sheets: {}, Props: {} };
  }
  aoa_to_sheet(data, opts = {}) {
    let ws = {};
    let range = {
      s: { c: 1000000, r: 1000000 },
      e: { c: 0, r: 0 },
    };
    let l = data.length;
    for(let i = 0;i < l; i++) {
      let l2 = data[i].length;
      for(let j = 0;j < l2; j++) {
        let cell = { v: data[i][j] };
        // 设置边界
        if(range.s.r > i) range.s.r = i;
        if(range.s.c > j) range.s.c = j;
        if(range.e.r < i) range.e.r = i;
        if(range.e.c < j) range.e.c = j;
        // 设置类型
        if(cell.v === null) continue;
        else if(typeof cell.v === 'number') cell.t = 'n';
        else if(typeof cell.v === 'boolean') cell.t = 'b';
        else cell.t = 's';

        ws[this.encode_cell({ c: j, r: i})] = cell;
      }
    }
    if(range.s.c < 10000000) ws['!ref'] = this.encode_range(range.s, range.e);
    return ws;
  }
  book_append_sheet(wb, ws, name) {
    wb.SheetNames.push(name);
    wb.Sheets[name] = ws;
  }
}
// window.XLSX2 = new XLSX();
// }(window))

export default new XLSX();
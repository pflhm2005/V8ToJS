import { wxt_helper, escapexml, writextag, safe_decode_range, CTYPE_DEFAULTS } from './utils';
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

/**
 * excel导出类
 */
class XLSX {
  constructor() {
  }
  check(wb) {
    if (!wb || !wb.SheetNames || !wb.Sheets) throw new Error("Invalid Workbook");
    if (!wb.SheetNames.length) throw new Error("Workbook is empty");
  }
  write(wb, opt){
    this.check(wb);
    return this.write_zip_type(wb, opt);
  }
  write_zip_type(wb, opt) {
    let zip = this.write_zip(wb, opt);
    return zip.generate({ type: 'string' });
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

    // if(ws['!merges'] != null && ws['!merges'].length > 0) (write_ws_xml_merges(ws['!merges']));
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
    });
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

export default new XLSX();
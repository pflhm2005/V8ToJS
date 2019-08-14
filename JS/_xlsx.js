let coreString = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>';

let RELS_CORE_PROPS = 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties';
let RELS_EXT_PROPS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties';
let RELS_WS = [
	"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
	"http://purl.oclc.org/ooxml/officeDocument/relationships/worksheet"
];
let RELS = {
	WB: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
	SHEET: "http://sheetjs.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
	HLINK: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
	VML: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing",
	VBA: "http://schemas.microsoft.com/office/2006/relationships/vbaProject"
};

let XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
let WS_XML_ROOT = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>';
let EXT_PROPS_XML_ROOT = '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"/>';

let EXT_PROPS = [
	["Application", "Application", "string"],
	["AppVersion", "AppVersion", "string"],
	["Company", "Company", "string"],
	["DocSecurity", "DocSecurity", "string"],
	["Manager", "Manager", "string"],
	["HyperlinksChanged", "HyperlinksChanged", "bool"],
	["SharedDoc", "SharedDoc", "bool"],
	["LinksUpToDate", "LinksUpToDate", "bool"],
	["ScaleCrop", "ScaleCrop", "bool"],
	["HeadingPairs", "HeadingPairs", "raw"],
	["TitlesOfParts", "TitlesOfParts", "raw"]
];

class XLSX {
  constructor() {

  }
  check() {}
  write(wb, opt) {
    this.check(wb);
    let zip = this.writeZip(wb, opt);
    return zip.generate({ type: 'string' });
  }
  writeZip() {
    let opt = Object.assign(opt, {
      rels: {},
      wbrels: {},
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
    let zip = new Zip();

    // 生成core.xml
    let core = "docProps/core.xml";
    zip.file(core, coreString);
    ct.coreprops.push(core);
    this.add_rels(opts.rels, 2, core, RELS_CORE_PROPS);

    // 生成app.xml
    let app = "docProps/app.xml";
    wb.Props.SheetNames = wb.SheetNames;
    wb.Props.Worksheets = wb.SheetNames.length;
    zip.file(app, this.write_ext_props(wb.Props));
    ct.extprops.push(app);
    this.add_rels(opt.rels, 3, app, RELS_EXT_PROPS);

    // 生成sheet.xml
    for(let i = 0; i < wb.SheetNames.length; i++) {
      let wsrels = { '!id': {} };
      let sheet = `xl/worksheets/sheet${rId + 1}.${wbext}`;
      zip.file(sheet, this.write_ws_xml(i, opts, wb, wsrels));
      ct.sheets.push(sheet);
      this.add_rels(opts.wbrels, -1, `${worksheets/sheet}${rId + 1}.${wbext}`, RELS_WS[0])
    }

    // 生成workbook.xml
    let workbook = `xl/workbook.${wbext}`;
    zip.file(workbook, this.write_wb(wb, workbook, opts));
    ct.workbooks.push(workbook);
    this.add_rels(opts.rels, 1, workbook, RELS.WB);

    // 
  }
  add_rels(rels, rId, target, type, relobj = {}) {
    if(!rels['!id']) rels['!id'] = {};
    relobj.Id = `rId${rId}`;
    relobj.Type = type;
    relobj.Target = target;
    rels['!id'][relobj.Id] = relobj;
    rels[`/${target}`] = relobj;
  }
  write_ext_props(cp) {
    cp.Application = "SheetJS";
    let o = [
      XML_HEADER,
      EXT_PROPS_XML_ROOT,
      '<Application>SheetJS</Application>',
      '<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs>',
      '<TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>sheet</vt:lpstr></vt:vector></TitlesOfParts>',
      '</Properties>'
    ];
    o[1].replace('/>', '>');
    return o.join('');
  }
  write_ws_xml(idx, opts, wb, rels) {
    let o = [XML_HEADER, WS_XML_ROOT];
    let sheet = wb.SheetNames[idx], sidx = 0, rdata = '';
    let workSheet = wb.Sheets[s];
    let ref = workSheet['!ref'];
    let range = this.safe_decode_range(ref);
    workSheet['!comments'] = [];
    workSheet['!drawing'] = [];
  }
  safe_decode_range(range) {
    return {
      s: { r: 0, c: 0 },
      e: { r: 1, c: 2 },
    };
  }
}

class ZipObject {
  constructor(name, data, opt) {
    this.name = name;
    this.dir = opt.dir;
    this.date = opt.date;
    this.comment = opt.comment;

    this._data = data;
    this.opt = opt;
  }
}

class Zip {
  constructor() {
    this.files = {};
    this.comment = null;
    this.root = '';
  }
  file(name, data, o = {}) {
    name = this.root + name;
    this.fileAdd(name, data, o);
  }
  fileAdd(name, data, o) {
    let opt = Object.assign({
      base64: false,
      binary: false,
      comment: null,
      compression: null,
      createFolders: false,
      date: new Date(),
      dir: false,
    }, o);
    let object = new ZipObject(name, data, o);
    this.files[name] = object;
  }
}
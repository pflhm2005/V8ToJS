let wb = {
  SheetNames: ["sheet"],
  Sheets: {
    sheet: {
      "!ref": "A1:C2",
      A1: { v: 1, t: "n" },
      A2: { v: 1, t: "n" },
      B1: { v: 2, t: "n" },
      B2: { v: 2, t: "n" },
      C1: { v: 3, t: "n" },
      C2: { v: 3, t: "n" }
    }
  }
};

let opt = {
  bookType: "xlsx",
  bookSST: false,
  type: "binary"
};

XLSX.write(wb, opt);

function writeSync(wb, opts) {
  // 检查workbook
  check_wb(wb);
  let z = write_zip(wb, opts);
  let out = z.generate({
    type: "string"
  });
  return out;
}

function write_zip(wb, opts) {
  _shapeid = 1024;
  // if (wb && !wb.SSF) {
  //   wb.SSF = SSF.get_table();
  // }
  // if (wb && wb.SSF) {
  //   make_ssf(SSF); SSF.load_table(wb.SSF);
  //   // $FlowIgnore
  //   opts.revssf = evert_num(wb.SSF); opts.revssf[wb.SSF[65535]] = 0;
  //   opts.ssf = wb.SSF;
  // }
  opts.rels = {};
  opts.wbrels = {};
  opts.c = [];
  opts.Strings.Count = 0;
  opts.Strings.Unique = 0;
  opts.revStrings = new Map();
  let wbext = "xml";

  let ct = {
    workbooks: [],
    sheets: [],
    charts: [],
    dialogs: [],
    macros: [],
    rels: [],
    strs: [],
    comments: [],
    links: [],
    coreprops: [],
    extprops: [],
    custprops: [],
    themes: [],
    styles: [],
    calcchains: [],
    vba: [],
    drawings: [],
    TODO: [],
    xmlns: ""
  };
  // fix_write_opts(opts = opts || {});
  let zip = new jszip();
  let f = "",
    rId = 0;

  // opts.cellXfs = [];
  // get_cell_style(opts.cellXfs, {}, { revssf: { "General": 0 } });

  wb.Props = {};
  // <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  // <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>
  f = "docProps/core.xml";
  zip.file(f, write_core_props(wb.Props, opts));
  ct.coreprops.push(f);
  add_rels(opts.rels, 2, f, RELS.CORE_PROPS);

  f = "docProps/app.xml";
  wb.Props.SheetNames = wb.SheetNames;
  wb.Props.Worksheets = wb.Props.SheetNames.length;
  zip.file(f, write_ext_props(wb.Props, opts));
  ct.extprops.push(f);
  add_rels(opts.rels, 3, f, RELS.EXT_PROPS);

  for (rId = 1; rId <= wb.SheetNames.length; ++rId) {
    var wsrels = { "!id": {} };
    f = "xl/worksheets/sheet" + rId + "." + wbext;
    zip.file(f, write_ws(rId - 1, f, opts, wb, wsrels));
    ct.sheets.push(f);
    add_rels(
      opts.wbrels,
      -1,
      "worksheets/sheet" + rId + "." + wbext,
      RELS.WS[0]
    );
  }

  f = "xl/workbook." + wbext;
  zip.file(f, write_wb(wb, f, opts));
  ct.workbooks.push(f);
  add_rels(opts.rels, 1, f, RELS.WB);

  /* TODO: something more intelligent with themes */

  f = "xl/theme/theme1.xml";
  zip.file(f, write_theme(wb.Themes, opts));
  ct.themes.push(f);
  add_rels(opts.wbrels, -1, "theme/theme1.xml", RELS.THEME);

  /* TODO: something more intelligent with styles */

  f = "xl/styles." + wbext;
  zip.file(f, write_sty(wb, f, opts));
  ct.styles.push(f);
  add_rels(opts.wbrels, -1, "styles." + wbext, RELS.STY);

  zip.file("[Content_Types].xml", write_ct(ct, opts));
  zip.file("_rels/.rels", write_rels(opts.rels));
  zip.file("xl/_rels/workbook." + wbext + ".rels", write_rels(opts.wbrels));

  return zip;
}

function encode_col(col) {
  var s = "";
  for (++col; col; col = Math.floor((col - 1) / 26))
    s = String.fromCharCode(((col - 1) % 26) + 65) + s;
  return s;
}

function get_cell_style(styles, cell, opts) {
  var z = opts.revssf[cell.z != null ? cell.z : "General"];
  var len = styles.length;
  styles[len] = {
    numFmtId: z,
    fontId: 0,
    fillId: 0,
    borderId: 0,
    xfId: 0,
    applyNumberFormat: 1
  };
  return len;
}

function write_ws_xml_cell(cell, ref, ws, opts) {
  if ((cell.v === undefined && cell.f === undefined) || cell.t === "z")
    return "";
  var vv = "";
  var oldt = cell.t,
    oldv = cell.v;
  switch (cell.t) {
    case "b":
      vv = cell.v ? "1" : "0";
      break;
    case "n":
      vv = "" + cell.v;
      break;
    case "e":
      vv = BErr[cell.v];
      break;
    case "d":
      if (opts.cellDates) vv = parseDate(cell.v, -1).toISOString();
      else {
        cell = dup(cell);
        cell.t = "n";
        vv = "" + (cell.v = datenum(parseDate(cell.v)));
      }
      if (typeof cell.z === "undefined") cell.z = SSF._table[14];
      break;
    default:
      vv = cell.v;
      break;
  }
  var v = writetag("v", escapexml(vv)),
    o = { r: ref };
  /* TODO: cell style */
  var os = get_cell_style(opts.cellXfs, cell, opts);
  if (os !== 0) o.s = os;
  switch (cell.t) {
    case "n":
      break;
    case "d":
      o.t = "d";
      break;
    case "b":
      o.t = "b";
      break;
    case "e":
      o.t = "e";
      break;
    default:
      if (cell.v == null) {
        delete cell.t;
        break;
      }
      if (opts.bookSST) {
        v = writetag(
          "v",
          "" + get_sst_id(opts.Strings, cell.v, opts.revStrings)
        );
        o.t = "s";
        break;
      }
      o.t = "str";
      break;
  }
  if (cell.t != oldt) {
    cell.t = oldt;
    cell.v = oldv;
  }
  if (cell.l) ws["!links"].push([ref, cell.l]);
  if (cell.c) ws["!comments"].push([ref, cell.c]);
  return writextag("c", v, o);
}

function write_ws_xml_data(ws, opts, idx, wb) {
	var o = [], r = [], range = safe_decode_range(ws['!ref']), cell="", ref, rr = "", cols = [], R=0, C=0, rows = ws['!rows'];
	var dense = Array.isArray(ws);
	var params = ({r:rr}), row, height = -1;
	for(C = range.s.c; C <= range.e.c; ++C) cols[C] = encode_col(C);
	for(R = range.s.r; R <= range.e.r; ++R) {
		r = [];
		rr = encode_row(R);
		for(C = range.s.c; C <= range.e.c; ++C) {
			ref = cols[C] + rr;
			var _cell = dense ? (ws[R]||[])[C]: ws[ref];
			if(_cell === undefined) continue;
			if((cell = write_ws_xml_cell(_cell, ref, ws, opts, idx, wb)) != null) r.push(cell);
		}
		if(r.length > 0 || (rows && rows[R])) {
			params = ({r:rr});
			if(rows && rows[R]) {
				row = rows[R];
				if(row.hidden) params.hidden = 1;
				height = -1;
				if (row.hpx) height = px2pt(row.hpx);
				else if (row.hpt) height = row.hpt;
				if (height > -1) { params.ht = height; params.customHeight = 1; }
				if (row.level) { params.outlineLevel = row.level; }
			}
			o[o.length] = (writextag('row', r.join(""), params));
		}
	}
	return o.join("");
}

function write_ct(ct, opts) {
  var o = [], v;
  o[o.length] = XML_HEADER;
  o[o.length] = CTYPE_XML_ROOT;
  o = o.concat(CTYPE_DEFAULTS);
  var f1 = function(w) {
    if (ct[w] && ct[w].length > 0) {
      v = ct[w][0];
      o[o.length] = writextag("Override", null, {
        PartName: (v[0] == "/" ? "" : "/") + v,
        ContentType: CT_LIST[w][opts.bookType || "xlsx"]
      });
    }
  };
  var f2 = function(w) {
    (ct[w] || []).forEach(function(v) {
      o[o.length] = writextag("Override", null, {
        PartName: (v[0] == "/" ? "" : "/") + v,
        ContentType: CT_LIST[w][opts.bookType || "xlsx"]
      });
    });
  };
  var f3 = function(t) {
    (ct[t] || []).forEach(function(v) {
      o[o.length] = writextag("Override", null, {
        PartName: (v[0] == "/" ? "" : "/") + v,
        ContentType: type2ct[t][0]
      });
    });
  };
  f1("workbooks");
  f2("sheets");
  f3("themes");
  ["styles"].forEach(f1);
  ["coreprops", "extprops"].forEach(f3);
  if (o.length > 2) {
    o[o.length] = "</Types>";
    o[1] = o[1].replace("/>", ">");
  }
  return o.join("");
}

function write_wb_xml(wb) {
  var o = [XML_HEADER];
  o[o.length] = WB_XML_ROOT;

  /* fileVersion */
  /* fileSharing */

  var workbookPr = { codeName: "ThisWorkbook" };
  o[o.length] = writextag("workbookPr", null, workbookPr);

  /* workbookProtection */
  /* bookViews */

  o[o.length] = "<sheets>";
  var sheets = (wb.Workbook && wb.Workbook.Sheets) || [];
  for (var i = 0; i != wb.SheetNames.length; ++i) {
    var sht = { name: escapexml(wb.SheetNames[i].slice(0, 31)) };
    sht.sheetId = "" + (i + 1);
    sht["r:id"] = "rId" + (i + 1);
    if (sheets[i])
      switch (sheets[i].Hidden) {
        case 1:
          sht.state = "hidden";
          break;
        case 2:
          sht.state = "veryHidden";
          break;
      }
    o[o.length] = writextag("sheet", null, sht);
  }
  o[o.length] = "</sheets>";

  /* calcPr */
  /* oleSize */
  /* customWorkbookViews */
  /* pivotCaches */
  /* smartTagPr */
  /* smartTagTypes */
  /* webPublishing */
  /* fileRecoveryPr */
  /* webPublishObjects */
  /* extLst */

  if (o.length > 2) {
    o[o.length] = "</workbook>";
    o[1] = o[1].replace("/>", ">");
  }
  return o.join("");
}

function write_ws_xml(idx, opts, wb, rels) {
  var o = [XML_HEADER, WS_XML_ROOT];
  var s = wb.SheetNames[idx],
    sidx = 0,
    rdata = "";
  var ws = wb.Sheets[s];
  if (ws == null) ws = {};
  var ref = ws["!ref"] || "A1";
  var range = safe_decode_range(ref);
  if (range.e.c > 0x3fff || range.e.r > 0xfffff) {
    if (opts.WTF)
      throw new Error("Range " + ref + " exceeds format limit A1:XFD1048576");
    range.e.c = Math.min(range.e.c, 0x3fff);
    range.e.r = Math.min(range.e.c, 0xfffff);
    ref = encode_range(range);
  }
  if (!rels) rels = {};
  ws["!comments"] = [];
  ws["!drawing"] = [];

  o[o.length] = writextag("dimension", null, { ref: ref });

  o[o.length] = write_ws_xml_sheetviews(ws, opts, idx, wb);

  if (ws["!cols"] != null && ws["!cols"].length > 0)
    o[o.length] = write_ws_xml_cols(ws, ws["!cols"]);

  o[(sidx = o.length)] = "<sheetData/>";
  ws["!links"] = [];
  if (ws["!ref"] != null) {
    rdata = write_ws_xml_data(ws, opts, idx, wb, rels);
    if (rdata.length > 0) o[o.length] = rdata;
  }
  if (o.length > sidx + 1) {
    o[o.length] = "</sheetData>";
    o[sidx] = o[sidx].replace("/>", ">");
  }

  if (ws["!merges"] != null && ws["!merges"].length > 0)
    o[o.length] = write_ws_xml_merges(ws["!merges"]);

  //var hfidx = o.length;
  o[o.length] = "";

  /* rowBreaks */
  /* colBreaks */
  /* customProperties */
  /* cellWatches */

  if (!opts || opts.ignoreEC || opts.ignoreEC == void 0)
    o[o.length] = writetag(
      "ignoredErrors",
      writextag("ignoredError", null, { numberStoredAsText: 1, sqref: ref })
    );

  /* drawingHF */
  /* picture */
  /* oleObjects */
  /* controls */
  /* webPublishItems */
  /* tableParts */
  /* extList */

  if (o.length > 2) {
    o[o.length] = "</worksheet>";
    o[1] = o[1].replace("/>", ">");
  }
  return o.join("");
}

function write_ext_props(cp) {
  var o = [],
    W = writextag;
  cp.Application = "SheetJS";
  o[o.length] = XML_HEADER;
  o[o.length] = EXT_PROPS_XML_ROOT;

  EXT_PROPS.forEach(function(f) {
    if (cp[f[1]] === undefined) return;
    var v;
    switch (f[2]) {
      case "string":
        v = String(cp[f[1]]);
        break;
      case "bool":
        v = cp[f[1]] ? "true" : "false";
        break;
    }
    if (v !== undefined) o[o.length] = W(f[0], v);
  });

  /* TODO: HeadingPairs, TitlesOfParts */
  o[o.length] = W(
    "HeadingPairs",
    W(
      "vt:vector",
      W("vt:variant", "<vt:lpstr>Worksheets</vt:lpstr>") +
        W("vt:variant", W("vt:i4", String(cp.Worksheets))),
      { size: 2, baseType: "variant" }
    )
  );
  o[o.length] = W(
    "TitlesOfParts",
    W(
      "vt:vector",
      cp.SheetNames.map(function(s) {
        return "<vt:lpstr>" + escapexml(s) + "</vt:lpstr>";
      }).join(""),
      { size: cp.Worksheets, baseType: "lpstr" }
    )
  );
  if (o.length > 2) {
    o[o.length] = "</Properties>";
    o[1] = o[1].replace("/>", ">");
  }
  return o.join("");
}

function add_rels(rels, rId, f, type, relobj) {
  if (!relobj) relobj = {};
  if (!rels["!id"]) rels["!id"] = {};
  relobj.Id = "rId" + rId;
  relobj.Type = type;
  relobj.Target = f;
  rels["!id"][relobj.Id] = relobj;
  rels[("/" + relobj.Target).replace("//", "/")] = relobj;
  return rId;
}

function generate(options) {
  options = {
    base64: true,
    comment: null,
    compression: "STORE",
    type: "string"
  };

  let zipData = [],
    localDirLength = 0,
    centralDirLength = 0,
    writer,
    i,
    utfEncodedComment = utils.transformTo(
      "string",
      this.utf8encode(options.comment || this.comment || "")
    );

  // first, generate all the zip parts.
  for (var name in this.files) {
    var file = this.files[name];

    let compression = compressions.STORE;

    let compressedObject = generateCompressedObjectFrom.call(
      this,
      file,
      compression
    );

    let zipPart = generateZipParts.call(
      this,
      name,
      file,
      compressedObject,
      localDirLength
    );
    localDirLength +=
      zipPart.fileRecord.length + compressedObject.compressedSize;
    centralDirLength += zipPart.dirRecord.length;
    zipData.push(zipPart);
  }

  var dirEnd = "";

  // end of central dir signature
  dirEnd =
    signature.CENTRAL_DIRECTORY_END +
    // number of this disk
    "\x00\x00" +
    // number of the disk with the start of the central directory
    "\x00\x00" +
    // total number of entries in the central directory on this disk
    decToHex(zipData.length, 2) +
    // total number of entries in the central directory
    decToHex(zipData.length, 2) +
    // size of the central directory   4 bytes
    decToHex(centralDirLength, 4) +
    // offset of start of central directory with respect to the starting disk number
    decToHex(localDirLength, 4) +
    // .ZIP file comment length
    decToHex(utfEncodedComment.length, 2) +
    // .ZIP file comment
    utfEncodedComment;

  // we have all the parts (and the total length)
  // time to create a writer !
  var typeName = options.type.toLowerCase();
  if (
    typeName === "uint8array" ||
    typeName === "arraybuffer" ||
    typeName === "blob" ||
    typeName === "nodebuffer"
  ) {
    writer = new Uint8ArrayWriter(
      localDirLength + centralDirLength + dirEnd.length
    );
  } else {
    writer = new StringWriter(
      localDirLength + centralDirLength + dirEnd.length
    );
  }

  for (i = 0; i < zipData.length; i++) {
    writer.append(zipData[i].fileRecord);
    writer.append(zipData[i].compressedObject.compressedContent);
  }
  for (i = 0; i < zipData.length; i++) {
    writer.append(zipData[i].dirRecord);
  }

  writer.append(dirEnd);

  let zip = writer.finalize();
  return zip;
}

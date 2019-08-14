let wb = {
  SheetNames: ['sheet'],
  Sheets: {
    sheet: {
      '!ref': "A1:C2",
      A1: { v: 1, t: "n" },
      A2: { v: 1, t: "n" },
      B1: { v: 2, t: "n" },
      B2: { v: 2, t: "n" },
      C1: { v: 3, t: "n" },
      C2: { v: 3, t: "n" },
    }
  }
};

let opt = {
  bookType: 'xlsx',
  bookSST: false,
  type: 'binary'
};

XLSX.write(wb, opt);

function writeSync(wb, opts) {
  // 检查workbook
  check_wb(wb);
  let z = write_zip(wb, opts);
  let out = z.generate({
    type: 'string',
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
  }
  // fix_write_opts(opts = opts || {});
  let zip = new jszip();
  let f = "", rId = 0;

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
    var wsrels = { '!id': {} };
    f = "xl/worksheets/sheet" + rId + "." + wbext;
    zip.file(f, write_ws(rId - 1, f, opts, wb, wsrels));
    ct.sheets.push(f);
    add_rels(opts.wbrels, -1, "worksheets/sheet" + rId + "." + wbext, RELS.WS[0]);
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
  zip.file('_rels/.rels', write_rels(opts.rels));
  zip.file('xl/_rels/workbook.' + wbext + '.rels', write_rels(opts.wbrels));

  return zip;
}

function write_ws_xml(idx, opts, wb, rels) {
	var o = [XML_HEADER, WS_XML_ROOT];
	var s = wb.SheetNames[idx], sidx = 0, rdata = "";
	var ws = wb.Sheets[s];
	if(ws == null) ws = {};
	var ref = ws['!ref'] || 'A1';
	var range = safe_decode_range(ref);
	if(range.e.c > 0x3FFF || range.e.r > 0xFFFFF) {
		if(opts.WTF) throw new Error("Range " + ref + " exceeds format limit A1:XFD1048576");
		range.e.c = Math.min(range.e.c, 0x3FFF);
		range.e.r = Math.min(range.e.c, 0xFFFFF);
		ref = encode_range(range);
	}
	if(!rels) rels = {};
	ws['!comments'] = [];
	ws['!drawing'] = [];

	if(opts.bookType !== 'xlsx' && wb.vbaraw) {
		var cname = wb.SheetNames[idx];
		try { if(wb.Workbook) cname = wb.Workbook.Sheets[idx].CodeName || cname; } catch(e) {}
		o[o.length] = (writextag('sheetPr', null, {'codeName': escapexml(cname)}));
	}

	o[o.length] = (writextag('dimension', null, {'ref': ref}));

	o[o.length] = write_ws_xml_sheetviews(ws, opts, idx, wb);

	/* TODO: store in WB, process styles */
	if(opts.sheetFormat) o[o.length] = (writextag('sheetFormatPr', null, {
		defaultRowHeight:opts.sheetFormat.defaultRowHeight||'16',
		baseColWidth:opts.sheetFormat.baseColWidth||'10',
		outlineLevelRow:opts.sheetFormat.outlineLevelRow||'7'
	}));

	if(ws['!cols'] != null && ws['!cols'].length > 0) o[o.length] = (write_ws_xml_cols(ws, ws['!cols']));

	o[sidx = o.length] = '<sheetData/>';
	ws['!links'] = [];
	if(ws['!ref'] != null) {
		rdata = write_ws_xml_data(ws, opts, idx, wb, rels);
		if(rdata.length > 0) o[o.length] = (rdata);
	}
	if(o.length>sidx+1) { o[o.length] = ('</sheetData>'); o[sidx]=o[sidx].replace("/>",">"); }

	/* sheetCalcPr */

	if(ws['!protect'] != null) o[o.length] = write_ws_xml_protection(ws['!protect']);

	/* protectedRanges */
	/* scenarios */

	if(ws['!autofilter'] != null) o[o.length] = write_ws_xml_autofilter(ws['!autofilter'], ws, wb, idx);

	/* sortState */
	/* dataConsolidate */
	/* customSheetViews */

	if(ws['!merges'] != null && ws['!merges'].length > 0) o[o.length] = (write_ws_xml_merges(ws['!merges']));

	/* phoneticPr */
	/* conditionalFormatting */
	/* dataValidations */

	var relc = -1, rel, rId = -1;
	if(ws['!links'].length > 0) {
		o[o.length] = "<hyperlinks>";
		ws['!links'].forEach(function(l) {
			if(!l[1].Target) return;
			rel = ({"ref":l[0]});
			if(l[1].Target.charAt(0) != "#") {
				rId = add_rels(rels, -1, escapexml(l[1].Target).replace(/#.*$/, ""), RELS.HLINK);
				rel["r:id"] = "rId"+rId;
			}
			if((relc = l[1].Target.indexOf("#")) > -1) rel.location = escapexml(l[1].Target.slice(relc+1));
			if(l[1].Tooltip) rel.tooltip = escapexml(l[1].Tooltip);
			o[o.length] = writextag("hyperlink",null,rel);
		});
		o[o.length] = "</hyperlinks>";
	}
	delete ws['!links'];

	/* printOptions */
	if (ws['!margins'] != null) o[o.length] =  write_ws_xml_margins(ws['!margins']);
	/* pageSetup */

	//var hfidx = o.length;
	o[o.length] = "";

	/* rowBreaks */
	/* colBreaks */
	/* customProperties */
	/* cellWatches */

	if(!opts || opts.ignoreEC || (opts.ignoreEC == (void 0))) o[o.length] = writetag("ignoredErrors", writextag("ignoredError", null, {numberStoredAsText:1, sqref:ref}));

	/* smartTags */

	if(ws['!drawing'].length > 0) {
		rId = add_rels(rels, -1, "../drawings/drawing" + (idx+1) + ".xml", RELS.DRAW);
		o[o.length] = writextag("drawing", null, {"r:id":"rId" + rId});
	}
	else delete ws['!drawing'];

	if(ws['!comments'].length > 0) {
		rId = add_rels(rels, -1, "../drawings/vmlDrawing" + (idx+1) + ".vml", RELS.VML);
		o[o.length] = writextag("legacyDrawing", null, {"r:id":"rId" + rId});
		ws['!legacy'] = rId;
	}

	/* drawingHF */
	/* picture */
	/* oleObjects */
	/* controls */
	/* webPublishItems */
	/* tableParts */
	/* extList */

	if(o.length>2) { o[o.length] = ('</worksheet>'); o[1]=o[1].replace("/>",">"); }
	return o.join("");
}

function write_ext_props(cp) {
	var o = [], W = writextag;
	cp.Application = "SheetJS";
	o[o.length] = (XML_HEADER);
	o[o.length] = (EXT_PROPS_XML_ROOT);

	EXT_PROPS.forEach(function(f) {
		if(cp[f[1]] === undefined) return;
		var v;
		switch(f[2]) {
			case 'string': v = String(cp[f[1]]); break;
			case 'bool': v = cp[f[1]] ? 'true' : 'false'; break;
		}
		if(v !== undefined) o[o.length] = (W(f[0], v));
	});

	/* TODO: HeadingPairs, TitlesOfParts */
	o[o.length] = (W('HeadingPairs', W('vt:vector', W('vt:variant', '<vt:lpstr>Worksheets</vt:lpstr>')+W('vt:variant', W('vt:i4', String(cp.Worksheets))), {size:2, baseType:"variant"})));
	o[o.length] = (W('TitlesOfParts', W('vt:vector', cp.SheetNames.map(function(s) { return "<vt:lpstr>" + escapexml(s) + "</vt:lpstr>"; }).join(""), {size: cp.Worksheets, baseType:"lpstr"})));
	if(o.length>2){ o[o.length] = ('</Properties>'); o[1]=o[1].replace("/>",">"); }
	return o.join("");
}

function add_rels(rels, rId, f, type, relobj) {
	if(!relobj) relobj = {};
	if(!rels['!id']) rels['!id'] = {};
	relobj.Id = 'rId' + rId;
	relobj.Type = type;
	relobj.Target = f;
	rels['!id'][relobj.Id] = relobj;
	rels[('/' + relobj.Target).replace("//","/")] = relobj;
	return rId;
}

function generate(options) {
  options = {
    base64: true,
    comment: null,
    compression: "STORE",
    type: 'string',
  };

  let zipData = [],
    localDirLength = 0,
    centralDirLength = 0,
    writer, i,
    utfEncodedComment = utils.transformTo("string", this.utf8encode(options.comment || this.comment || ""));

  // first, generate all the zip parts.
  for (var name in this.files) {
    var file = this.files[name];

    let compression = compressions.STORE;

    let compressedObject = generateCompressedObjectFrom.call(this, file, compression);

    let zipPart = generateZipParts.call(this, name, file, compressedObject, localDirLength);
    localDirLength += zipPart.fileRecord.length + compressedObject.compressedSize;
    centralDirLength += zipPart.dirRecord.length;
    zipData.push(zipPart);
  }

  var dirEnd = "";

  // end of central dir signature
  dirEnd = signature.CENTRAL_DIRECTORY_END +
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
  if (typeName === "uint8array" || typeName === "arraybuffer" || typeName === "blob" || typeName === "nodebuffer") {
    writer = new Uint8ArrayWriter(localDirLength + centralDirLength + dirEnd.length);
  } else {
    writer = new StringWriter(localDirLength + centralDirLength + dirEnd.length);
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
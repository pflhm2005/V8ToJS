const XML_ROOT_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const generateAppAst = (SheetNames) => {
  let len = SheetNames.length;
  return {
    n:'Properties',
    p: {
      xmlns: 'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties',
      'xmlns:vt': 'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes',
    },
    c: [
      { n: 'Application', t: 'Microsoft Macintosh Excel' },
      { n: 'DocSecurity', t: '0' },
      { n: 'ScaleCrop', t: 'false' },
      { n: 'HeadingPairs', c: [
        { n: 'vt:vector', p: { size: 2, baseType: 'variant', }, c: [
          { n: 'vt:variant', c: [{ n: 'vt:lpstr', t: '工作表' }] },
          { n: 'vt:variant', c: [{ n: 'vt:i4', t: len }] }],
        }]
      },
      { n: 'TitlesOfParts', c: [
        { 
          n: 'vt:vector',
          p: { size: len, baseType: 'lpstr',},
          c: SheetNames.map(name => { return { n: 'vt:lpstr', t: name }}),
        }]
      },
      { n: 'Company' },
      { n: 'LinksUpToDate', t: 'false' },
      { n: 'SharedDoc', t: 'false' },
      { n: 'HyperlinksChanged', t: 'false' },
      { n: 'AppVersion', t: '16.0300' },
    ]
  }
};

const generateCoreAst = () => {
  let date = new Date().toISOString().replace(/\.\d*/,"");
  return {
    n: 'cp:coreProperties',
    p: {
      'xmlns:cp': 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
      'xmlns:dc': 'http://purl.org/dc/elements/1.1/',
      'xmlns:dcterms': 'http://purl.org/dc/terms/',
      'xmlns:dcmitype': 'http://purl.org/dc/dcmitype/',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    },
    c: [
      { n: 'dc:creator', t: 'feilong pang' },
      { n: 'cp:lastModifiedBy', t: 'feilong pang' },
      { n: 'dcterms:created', p: { 'xsi:type': 'dcterms:W3CDTF' }, t: date },
      { n: 'dcterms:modified', p: { 'xsi:type': 'dcterms:W3CDTF' }, t: date },
    ],
  };
};

const generateRelsAst = rels => {
  return {
    n: 'Relationships',
    p: { xmlns: 'http://schemas.openxmlformats.org/package/2006/relationships' },
    c: rels.map((rel, i) => { return { n: 'Relationship', p: { Id: `rId${i + 1}`, Type: rel.Type, Target: rel.Target } }; })
  };
};

const generateCtAst = (SheetNames) => {
  return {
    n: 'Types',
    p: { xmlns: 'http://schemas.openxmlformats.org/package/2006/content-types' },
    c: [
      { n: 'Default', p: { Extension: 'rels', ContentType: 'application/vnd.openxmlformats-package.relationships+xml' } },
      { n: 'Default', p: { Extension: 'xml', ContentType: 'application/xml' } },
      { n: 'Override', p: { PartName: '/xl/workbook.xml', ContentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml' } },
      ...SheetNames.map((name, i) => { return {
          n: 'Override',
          p: {
            PartName: `/xl/worksheets/sheet${i+1}.xml`,
            ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml',
          },
        };
      }),
      { n: 'Override', p: { PartName: '/xl/theme/theme1.xml', ContentType: 'application/vnd.openxmlformats-officedocument.theme+xml'} },
      { n: 'Override', p: { PartName: '/xl/styles.xml', ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml'} },
      { n: 'Override', p: { PartName: '/docProps/core.xml', ContentType: 'application/vnd.openxmlformats-package.core-properties+xml'} },
      { n: 'Override', p: { PartName: '/docProps/app.xml', ContentType: 'application/vnd.openxmlformats-officedocument.extended-properties+xml'} },
    ]
  }
};

const generateWorkBookAst = (SheetNames) => {
  return {
    n: 'workbook',
    p: {
      xmlns: 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'xmlns:mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
      'mc:Ignorable': 'x15 xr xr6 xr10 xr2',
      'xmlns:x15': 'http://schemas.microsoft.com/office/spreadsheetml/2010/11/main',
      'xmlns:xr': 'http://schemas.microsoft.com/office/spreadsheetml/2014/revision',
      'xmlns:xr6': 'http://schemas.microsoft.com/office/spreadsheetml/2016/revision6',
      'xmlns:xr10': 'http://schemas.microsoft.com/office/spreadsheetml/2016/revision10',
      'xmlns:xr2': 'http://schemas.microsoft.com/office/spreadsheetml/2015/revision2',
    },
    c: [
      { n: 'fileVersion', p:{ appName: 'xl', lastEdited: '7', lowestEdited: '7', rupBuild: '10812' } },
      { n: 'workbookPr', p: { defaultThemeVersion: '166925' } },
      {
        n: 'mc:AlternateContent',
        p: { 'xmlns:mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006' },
        c: [
          { n: 'mc:Choice', p: { Requires: 'x15' }, c: [
            {
              n: 'x15ac:absPath',
              // 设置文件绝对路径
              p: { url: '/Users', 'xmlns:x15ac': 'http://schemas.microsoft.com/office/spreadsheetml/2010/11/ac' },
            }]
          },
        ]
      },
      {
        n: 'xr:revisionPtr',
        p: {
          revIDLastSave: '0',
          // 这个是随机的ID
          documentId: '8_{AEE9E45D-3377-9744-89E1-B8EA0D667A7D}',
          'xr6:coauthVersionLast': '44',
          'xr6:coauthVersionMax': '44',
          'xr10:uidLastSave': '{00000000-0000-0000-0000-000000000000}',
        }
      },
      { n: 'bookViews', c: [
        // 这个属性是文档的宽高
        { n: 'workbookView', p: { xWindow: '280', yWindow: '460', windowWidth: '27220', windowHeight: '17040', 'xr2:uid': '{20CB6232-08ED-0D49-9DA6-2081B77F7626}' } }]
      },
      { n: 'sheets', c: SheetNames.map((name, i) => {
        return {
          n: 'sheet',
          p: {
            name,
            sheetId: i+1,
            'r:id': `rId${i+1}`
          }
        }})
      },
      { n: 'calcPr', p: { calcId: '181029' } },
      { n: 'extLst', c: [
        {
          n: 'ext',
          p: {
            uri: '{140A7094-0E35-4892-8432-C4D2E57EDEB5}',
            'xmlns:x15': 'http://schemas.microsoft.com/office/spreadsheetml/2010/11/main',
          },
          c: [{ n:'x15:workbookPr', p: { chartTrackingRefBase: '1' } }],
        },
        // 新的属性
        {
          n: 'ext',
          p: {
            uri: '{B58B0392-4F1F-4190-BB64-5DF3571DCE5F}',
            'xmlns:xcalcf': 'http://schemas.microsoft.com/office/spreadsheetml/2018/calcfeatures',
          },
          c: [{ n:'xcalcf:calcFeatures', c:[
            { n: 'xcalcf:feature', p: { name: 'microsoft.com:RD' } },
            { n: 'xcalcf:feature', p: { name: 'microsoft.com:FV' } },
          ]}],
        }]
      }
    ]
  }
};

const generateStyleAst = () => {
  return {
    n: 'styleSheet',
    p: {
      xmlns: 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'xmlns:mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
      'mc:Ignorable': 'x14ac x16r2 xr',
      'xmlns:x14ac': 'http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac',
      'xmlns:x16r2': 'http://schemas.microsoft.com/office/spreadsheetml/2015/02/main',
      'xmlns:xr': 'http://schemas.microsoft.com/office/spreadsheetml/2014/revision'
    },
    c: [
      { n: 'fonts', p: { count: '2' }, c: [
        { n: 'font', c: [
          { n: 'sz', p: { val: '12' } },
          { n: 'color', p: { theme: '1' } },
          { n: 'name', p: { val: '等线' } },
          { n: 'family', p: { val: '2' } },
          { n: 'charset', p: { val: '134' } },
          { n: 'scheme', p: { val: 'minor' } },
        ]},
        { n: 'font', c: [
          { n: 'sz', p: { val: '9' } },
          { n: 'name', p: { val: '等线' } },
          { n: 'family', p: { val: '2' } },
          { n: 'charset', p: { val: '134' } },
          { n: 'scheme', p: { val: 'minor' } },
        ]}]
      },
      { n: 'fills', p: { count: '2' },c: [
        { n: 'fill', c: [{ n: 'patternFill', p: { patternType: 'none' } }] },
        { n: 'fill', c: [{ n: 'patternFill', p: { patternType: 'gray125' } }] }]
      },
      { n:'borders', p: { count: '1' }, c: [
        { n: 'border', c: [
          { n: 'left' },
          { n: 'right' },
          { n: 'top' },
          { n: 'bottom' },
          { n: 'diagonal' },
        ]}]
      },
      { n: 'cellStyleXfs', p: { count: '1' }, c: [
        {
          n: 'xf', 
          p: {
            numFmtId: '0',
            fontId: '0',
            fillId: '0',
            borderId: '0'
          },
          c: [{ n:'alignment', p:{ vertical: 'center' } }]
        }]
      },
      { n: 'cellXfs', p: { count: '1' }, c: [
        { 
          n: 'xf', 
          p: {
            numFmtId: '0',
            fontId: '0',
            fillId: '0',
            borderId: '0',
            xfId: "0"
          },
          c: [{ n:'alignment', p:{ vertical: 'center', horizontal: 'center' } }]
        }]
      },
      { n: 'cellStyles', p: { count: '1' }, c: [
        {
          n: 'cellStyle', 
          p: {
            name: '常规',
            xfId: '0',
            builtinId: '0'
          }
        }]
      },
      { n: 'dxfs', p: { count: '0' } },
      { 
        n: 'tableStyles',
        p: {
          count: '0',
          defaultTableStyle: 'TableStyleMedium2',
          defaultPivotStyle: 'PivotStyleLight16'
        }
      },
      { n: 'extLst', c: [
        { n: 'ext', p:{
          uri: '{EB79DEF2-80B8-43e5-95BD-54CBDDF9020C}',
          'xmlns:x14': 'http://schemas.microsoft.com/office/spreadsheetml/2009/9/main'
        }, c: [{ n: 'x14:slicerStyles', p: { defaultSlicerStyle: 'SlicerStyleLight1' } }]},
        { n: 'ext', p:{
          uri: '{9260A510-F301-46a8-8635-F512D64BE5F5}',
          'xmlns:x15': 'http://schemas.microsoft.com/office/spreadsheetml/2010/11/main'
        }, c: [{ n: 'x15:timelineStyles', p: { defaultTimelineStyle: 'TimeSlicerStyleLight1' } }]},
      ]}
    ]
  };
};

const generateThemeAst = () => {
  return {
    n: 'a:theme',
    p: {
      'xmlns:a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      name: 'Office 主题',
    },
    c: [
      { n: 'a:themeElements', c: [
        { n: 'a:clrScheme', p: { name: 'Office' }, c: [
          { n: 'a:dk1', c: [{ n: 'a:sysClr', p: { val: 'windowText', lastClr: '000000' } }] },
          { n: 'a:lt1', c: [{ n: 'a:sysClr', p: { val: 'window', lastClr: 'FFFFFF' } }] },
          { n: 'a:dk2', c: [{ n: 'a:srgbClr', p: { val: '44546A' } }] },
          { n: 'a:lt2', c: [{ n: 'a:srgbClr', p: { val: 'E7E6E6' } }] },
          { n: 'a:accent1', c: [{ n: 'a:srgbClr', p: { val: '4472C4' } }] },
          { n: 'a:accent2', c: [{ n: 'a:srgbClr', p: { val: 'ED7D31' } }] },
          { n: 'a:accent3', c: [{ n: 'a:srgbClr', p: { val: 'A5A5A5' } }] },
          { n: 'a:accent4', c: [{ n: 'a:srgbClr', p: { val: 'FFC000' } }] },
          { n: 'a:accent5', c: [{ n: 'a:srgbClr', p: { val: '5B9BD5' } }] },
          { n: 'a:accent6', c: [{ n: 'a:srgbClr', p: { val: '70AD47' } }] },
          { n: 'a:hlink', c: [{ n: 'a:srgbClr', p: { val: '0563C1' } }] },
          { n: 'a:folHlink', c: [{ n: 'a:srgbClr', p: { val: '954F72' } }] },
        ]},
        { n: 'a:fontScheme', p: { name: 'Office' }, c:[
          { n: 'a:majorFont', c: [
            { n: 'a:latin', p: { typeface: 'Calibri Light', panose: '020F0302020204030204' } },
            { n: 'a:ea', p: { typeface: '' } },
            { n: 'a:cs', p: { typeface: '' } },
            { n: 'a:font', p: { script: 'Jpan', typeface: '游ゴシック Light' } },
            { n: 'a:font', p: { script: 'Hang', typeface: '맑은 고딕' } },
            { n: 'a:font', p: { script: 'Hans', typeface: '等线 Light' } },
            { n: 'a:font', p: { script: 'Hant', typeface: '新細明體' } },
            { n: 'a:font', p: { script: 'Arab', typeface: 'Times New Roman' } },
            { n: 'a:font', p: { script: 'Hebr', typeface: 'Times New Roman' } },
            { n: 'a:font', p: { script: 'Thai', typeface: 'Tahoma' } },
            { n: 'a:font', p: { script: 'Ethi', typeface: 'Nyala' } },
            { n: 'a:font', p: { script: 'Beng', typeface: 'Vrinda' } },
            { n: 'a:font', p: { script: 'Gujr', typeface: 'Shruti' } },
            { n: 'a:font', p: { script: 'Khmr', typeface: 'MoolBoran' } },
            { n: 'a:font', p: { script: 'Knda', typeface: 'Tunga' } },
            { n: 'a:font', p: { script: 'Guru', typeface: 'Raavi' } },
            { n: 'a:font', p: { script: 'Cans', typeface: 'Euphemia' } },
            { n: 'a:font', p: { script: 'Cher', typeface: 'Plantagenet Cherokee' } },
            { n: 'a:font', p: { script: 'Yiii', typeface: 'Microsoft Yi Baiti' } },
            { n: 'a:font', p: { script: 'Tibt', typeface: 'Microsoft Himalaya' } },
            { n: 'a:font', p: { script: 'Thaa', typeface: 'MV Boli' } },
            { n: 'a:font', p: { script: 'Deva', typeface: 'Mangal' } },
            { n: 'a:font', p: { script: 'Telu', typeface: 'Gautami' } },
            { n: 'a:font', p: { script: 'Taml', typeface: 'Latha' } },
            { n: 'a:font', p: { script: 'Syrc', typeface: 'Estrangelo Edessa' } },
            { n: 'a:font', p: { script: 'Orya', typeface: 'Kalinga' } },
            { n: 'a:font', p: { script: 'Mlym', typeface: 'Kartika' } },
            { n: 'a:font', p: { script: 'Laoo', typeface: 'DokChampa' } },
            { n: 'a:font', p: { script: 'Sinh', typeface: 'Iskoola Pota' } },
            { n: 'a:font', p: { script: 'Mong', typeface: 'Mongolian Baiti' } },
            { n: 'a:font', p: { script: 'Viet', typeface: 'Times New Roman' } },
            { n: 'a:font', p: { script: 'Uigh', typeface: 'Microsoft Uighur' } },
            { n: 'a:font', p: { script: 'Geor', typeface: 'Sylfaen' } },
            { n: 'a:font', p: { script: 'Armn', typeface: 'Arial' } },
            { n: 'a:font', p: { script: 'Bugi', typeface: 'Leelawadee UI' } },
            { n: 'a:font', p: { script: 'Bopo', typeface: 'Microsoft JhengHei' } },
            { n: 'a:font', p: { script: 'Java', typeface: 'Javanese Text' } },
            { n: 'a:font', p: { script: 'Lisu', typeface: 'Segoe UI' } },
            { n: 'a:font', p: { script: 'Mymr', typeface: 'Myanmar Text' } },
            { n: 'a:font', p: { script: 'Nkoo', typeface: 'Ebrima' } },
            { n: 'a:font', p: { script: 'Olck', typeface: 'Nirmala UI' } },
            { n: 'a:font', p: { script: 'Osma', typeface: 'Ebrima' } },
            { n: 'a:font', p: { script: 'Phag', typeface: 'Phagspa' } },
            { n: 'a:font', p: { script: 'Syrn', typeface: 'Estrangelo Edessa' } },
            { n: 'a:font', p: { script: 'Syrj', typeface: 'Estrangelo Edessa' } },
            { n: 'a:font', p: { script: 'Syre', typeface: 'Estrangelo Edessa' } },
            { n: 'a:font', p: { script: 'Sora', typeface: 'Nirmala UI' } },
            { n: 'a:font', p: { script: 'Tale', typeface: 'Microsoft Tai Le' } },
            { n: 'a:font', p: { script: 'Talu', typeface: 'Microsoft New Tai Lue' } },
            { n: 'a:font', p: { script: 'Tfng', typeface: 'Ebrima' } },
          ]},
          { n: 'a:minorFont', c: [
            { n: 'a:latin', p: { typeface: 'Calibri', panose: '020F0502020204030204' } },
            { n: 'a:ea', p: { typeface: '' } },
            { n: 'a:cs', p: { typeface: '' } },
            { n: 'a:font', p: { script:'Jpan', typeface:"游ゴシック" } },
            { n: 'a:font', p: { script:'Hang', typeface:"맑은 고딕" } },
            { n: 'a:font', p: { script:'Hans', typeface:"等线" } },
            { n: 'a:font', p: { script:'Hant', typeface:"新細明體" } },
            { n: 'a:font', p: { script:'Arab', typeface:"Arial" } },
            { n: 'a:font', p: { script:'Hebr', typeface:"Arial" } },
            { n: 'a:font', p: { script:'Thai', typeface:"Tahoma" } },
            { n: 'a:font', p: { script:'Ethi', typeface:"Nyala" } },
            { n: 'a:font', p: { script:'Beng', typeface:"Vrinda" } },
            { n: 'a:font', p: { script:'Gujr', typeface:"Shruti" } },
            { n: 'a:font', p: { script:'Khmr', typeface:"DaunPenh" } },
            { n: 'a:font', p: { script:'Knda', typeface:"Tunga" } },
            { n: 'a:font', p: { script:'Guru', typeface:"Raavi" } },
            { n: 'a:font', p: { script:'Cans', typeface:"Euphemia" } },
            { n: 'a:font', p: { script:'Cher', typeface:"Plantagenet Cherokee" } },
            { n: 'a:font', p: { script:'Yiii', typeface:"Microsoft Yi Baiti" } },
            { n: 'a:font', p: { script:'Tibt', typeface:"Microsoft Himalaya" } },
            { n: 'a:font', p: { script:'Thaa', typeface:"MV Boli" } },
            { n: 'a:font', p: { script:'Deva', typeface:"Mangal" } },
            { n: 'a:font', p: { script:'Telu', typeface:"Gautami" } },
            { n: 'a:font', p: { script:'Taml', typeface:"Latha" } },
            { n: 'a:font', p: { script:'Syrc', typeface:"Estrangelo Edessa" } },
            { n: 'a:font', p: { script:'Orya', typeface:"Kalinga" } },
            { n: 'a:font', p: { script:'Mlym', typeface:"Kartika" } },
            { n: 'a:font', p: { script:'Laoo', typeface:"DokChampa" } },
            { n: 'a:font', p: { script:'Sinh', typeface:"Iskoola Pota" } },
            { n: 'a:font', p: { script:'Mong', typeface:"Mongolian Baiti" } },
            { n: 'a:font', p: { script:'Viet', typeface:"Arial" } },
            { n: 'a:font', p: { script:'Uigh', typeface:"Microsoft Uighur" } },
            { n: 'a:font', p: { script:'Geor', typeface:"Sylfaen" } },
            { n: 'a:font', p: { script:'Armn', typeface:"Arial" } },
            { n: 'a:font', p: { script:'Bugi', typeface:"Leelawadee UI" } },
            { n: 'a:font', p: { script:'Bopo', typeface:"Microsoft JhengHei" } },
            { n: 'a:font', p: { script:'Java', typeface:"Javanese Text" } },
            { n: 'a:font', p: { script:'Lisu', typeface:"Segoe UI" } },
            { n: 'a:font', p: { script:'Mymr', typeface:"Myanmar Text" } },
            { n: 'a:font', p: { script:'Nkoo', typeface:"Ebrima" } },
            { n: 'a:font', p: { script:'Olck', typeface:"Nirmala UI" } },
            { n: 'a:font', p: { script:'Osma', typeface:"Ebrima" } },
            { n: 'a:font', p: { script:'Phag', typeface:"Phagspa" } },
            { n: 'a:font', p: { script:'Syrn', typeface:"Estrangelo Edessa" } },
            { n: 'a:font', p: { script:'Syrj', typeface:"Estrangelo Edessa" } },
            { n: 'a:font', p: { script:'Syre', typeface:"Estrangelo Edessa" } },
            { n: 'a:font', p: { script:'Sora', typeface:"Nirmala UI" } },
            { n: 'a:font', p: { script:'Tale', typeface:"Microsoft Tai Le" } },
            { n: 'a:font', p: { script:'Talu', typeface:"Microsoft New Tai Lue" } },
            { n: 'a:font', p: { script:'Tfng', typeface:"Ebrima" } },
          ]}
        ]},
        { n: 'a:fmtScheme', p: { name: 'Office' }, c: [
          { n: 'a:fillStyleLst', c:[
            { n: 'a:solidFill', c: [
              { n: 'a:schemeClr', p: { val: 'phClr' } }
            ]},
            { n: 'a:gradFill', p: { rotWithShape: '1' }, c: [
              { n: 'a:gsLst', c: [
                { n: 'a:gs', p: { pos: '0' }, c: [
                  { n: 'a:schemeClr', p: { val: 'phClr' }, c: [
                    { n: 'a:lumMod', p: { val: '110000' } },
                    { n: 'a:satMod', p: { val: '105000' } },
                    { n: 'a:tint', p: { val: '67000' } },
                  ]}
                ]},
                { n: 'a:gs', p: { pos: '50000' }, c: [
                  { n: 'a:schemeClr', p: { val: 'phClr' }, c: [
                    { n: 'a:lumMod', p: { val: '105000' } },
                    { n: 'a:satMod', p: { val: '103000' } },
                    { n: 'a:tint', p: { val: '73000' } },
                  ]}
                ]},
                { n: 'a:gs', p: { pos: '100000' }, c: [
                  { n: 'a:schemeClr', p: { val: 'phClr' }, c: [
                    { n: 'a:lumMod', p: { val: '105000' } },
                    { n: 'a:satMod', p: { val: '109000' } },
                    { n: 'a:tint', p: { val: '81000' } },
                  ]}
                ]},
              ]},
              { n: 'a:lin', p: { ang: '5400000', scaled: '0' } }
            ]},
            { n: 'a:gradFill', p: { rotWithShape: '1' }, c: [
              { n: 'a:gsLst', c: [
                { n: 'a:gs', p: { pos: '0' }, c: [
                  { n: 'a:schemeClr', p: { val: 'phClr' }, c: [
                    { n: 'a:satMod', p: { val: '103000' } },
                    { n: 'a:lumMod', p: { val: '102000' } },
                    { n: 'a:tint', p: { val: '94000' } },
                  ]}
                ]},
                { n: 'a:gs', p: { pos: '50000' }, c: [
                  { n: 'a:schemeClr', p: { val: 'phClr' }, c: [
                    { n: 'a:satMod', p: { val: '110000' } },
                    { n: 'a:lumMod', p: { val: '100000' } },
                    { n: 'a:shade', p: { val: '100000' } },
                  ]}
                ]},
                { n: 'a:gs', p: { pos: '100000' }, c: [
                  { n: 'a:schemeClr', p: { val: 'phClr' }, c: [
                    { n: 'a:lumMod', p: { val: '99000' } },
                    { n: 'a:satMod', p: { val: '120000' } },
                    { n: 'a:shade', p: { val: '78000' } },
                  ]}
                ]},
              ]},
              { n: 'a:lin', p: { ang: '5400000', scaled: '0' } }
            ]},
          ]},
          { n: 'a:lnStyleLst', c:[
            { n: 'a:ln', p: { w: '6350', cap: 'flat', cmpd: 'sng', algn: 'ctr' }, c:[
              { n: 'a:solidFill', c: [
                { n: 'a:schemeClr', p: { val: 'phClr' } }
              ]},
              { n: 'a:prstDash', p: { val: 'solid' } },
              { n: 'a:miter', p: { lim: '800000' } },
            ]},
            { n: 'a:ln', p: { w: '12700', cap: 'flat', cmpd: 'sng', algn: 'ctr' }, c:[
              { n: 'a:solidFill', c: [
                { n: 'a:schemeClr', p: { val: 'phClr' } }
              ]},
              { n: 'a:prstDash', p: { val: 'solid' } },
              { n: 'a:miter', p: { lim: '800000' } },
            ]},
            { n: 'a:ln', p: { w: '19050', cap: 'flat', cmpd: 'sng', algn: 'ctr' }, c:[
              { n: 'a:solidFill', c: [
                { n: 'a:schemeClr', p: { val: 'phClr' } }
              ]},
              { n: 'a:prstDash', p: { val: 'solid' } },
              { n: 'a:miter', p: { lim: '800000' } },
            ]},
          ]},
          { n: 'a:effectStyleLst', c: [
            { n: 'a:effectStyle', c: [{ n: 'a:effectLst' }]},
            { n: 'a:effectStyle', c: [{ n: 'a:effectLst' }]},
            { n: 'a:effectStyle', c: [
              { n: 'a:effectLst', c: [
                { n: 'a:outerShdw', p: { blurRad: '57150', dist: '19050', dir: '5400000', algn: 'ctr', rotWithShape: '0' }, c:[
                  { n: 'a:srgbClr', p: { val: '000000' },c: [
                    { n: 'a:alpha', p: { val: '63000' } }
                  ]}
                ]},
              ]}
            ]},
          ]},
          { n: 'a:bgFillStyleLst', c: [
            { n: 'a:solidFill', c: [
              { n: 'a:schemeClr', p: { val: 'phClr' } },
            ]},
            { n: 'a:solidFill', c: [
              { n: 'a:schemeClr', p: { val: 'phClr' }, c:[
                { n: 'a:tint', p: { val: '95000' }},
                { n: 'a:satMod', p: { val: '170000' }},
              ]},
            ]},
            { n: 'a:gradFill', p: { rotWithShape: '1' }, c: [
              { n: 'a:gsLst', c: [
                { n: 'a:gs', p: { pos: '0' }, c:[
                  { n: 'a:schemeClr', p: { val: 'phClr' }, c: [
                    { n: 'a:tint', p: { val: '93000' } },
                    { n: 'a:satMod', p: { val: '150000' } },
                    { n: 'a:shade', p: { val: '98000' } },
                    { n: 'a:lumMod', p: { val: '102000' } },
                  ]}
                ]},
                { n: 'a:gs', p: { pos: '50000' }, c:[
                  { n: 'a:schemeClr', p: { val: 'phClr' }, c: [
                    { n: 'a:tint', p: { val: '98000' } },
                    { n: 'a:satMod', p: { val: '130000' } },
                    { n: 'a:shade', p: { val: '90000' } },
                    { n: 'a:lumMod', p: { val: '103000' } },
                  ]}
                ]},
                { n: 'a:gs', p: { pos: '100000' }, c:[
                  { n: 'a:schemeClr', p: { val: 'phClr' }, c: [
                    { n: 'a:shade', p: { val: '63000' } },
                    { n: 'a:satMod', p: { val: '120000' } },
                  ]}
                ]},
              ]},
              { n: 'a:lin', p: { ang: '5400000', scaled: '0' } }
            ]}
          ]}
        ]}
      ]},
      { n: 'a:objectDefaults' },
      { n: 'a:extraClrSchemeLst' },
      { n: 'a:extLst', c:[
        { n: 'a:ext', p: { uri: '{05A4C25C-085E-4340-85A3-A5531E510DB2}'}, c: [
          { n: 'thm15:themeFamily', p: {
            'xmlns:thm15': 'http://schemas.microsoft.com/office/thememl/2012/main',
            name: 'Office Theme',
            id: '{62F939B6-93AF-4DB8-9C6B-D6C7DFDC589F}',
            vid: '{4A3C46E8-61CC-4603-A589-7422A47A8E4A}',
          }}
        ]}
      ]},
    ]
  };
};

const columnToNum = str => str.split('').reduce((r, c) => {
  return r = r * 26 + (c.charCodeAt() - 64);
}, 0);
const numToColumn = (n) => {
  let s = '';
  for(++n;n;n = Math.floor((n - 1) / 26)) s = String.fromCharCode((n - 1) % 26 + 65) + s;
  return s;
}
const generateSheetAst = (sheet) => {
  // 表格默认从A1开始 所以只计算后面的值
  let range = 'A1';
  if(sheet.ref) range = sheet.ref.split(':')[1];
  let len = range.length, r = 0, c = 0;
  // 计算得到数据的最大行列值
  for(let i = 0;i < len;i++) {
    let unicode = range.charCodeAt(i) - 64;
    if(unicode < 0 || unicode > 26) {
      c = columnToNum(range.slice(0, i));
      r = Number(range.slice(i));
      break;
    }
  }
  // 描述表格数据的数组
  let SheetData = [];
  /**
   * 生成行 格式如下
   * <row r="1"></row>
   */
  for(let i = 1;i <= r;i++) {
    let rowAst = { n: 'row', p: { r: i }, c: [] };
    let rowChildren = rowAst.c;
    /**
     * 生成列 内容插入row标签中
     */
    for(let j = 0;j < c;j++) {
      let pos = `${numToColumn(j)}${i}`;
      // 默认不生成值为null的单元格 好像也不会出问题
      let cell = sheet[pos];
      if(cell) rowChildren.push({ n: 'c', p: { r: pos }, c: [{ n: 'v', t: cell.v }] });
    }
    SheetData.push(rowAst);
  }
  /**
   * 处理单元格合并
   */
  let merge = sheet.merge || [];
  let mergeAst = null;
  if(merge.length) {
    mergeAst = { n: 'mergeCells', p: { count: '0' }, c: [] };
    let len = merge.length;
    mergeAst.p.count = len;
    mergeAst.c = merge.map(ref => { return { n: 'mergeCell', p: {ref} } });
  }
  return {
    n: 'worksheet',
    p: {
      xmlns: 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'xmlns:mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
      'mc:Ignorable': 'x14ac xr xr2 xr3',
      'xmlns:x14ac': 'http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac',
      'xmlns:xr': 'http://schemas.microsoft.com/office/spreadsheetml/2014/revision',
      'xmlns:xr2': 'http://schemas.microsoft.com/office/spreadsheetml/2015/revision2',
      'xmlns:xr3': 'http://schemas.microsoft.com/office/spreadsheetml/2016/revision3',
      // 这个ID是随机的
      'xr:uid': '{8791C6D8-650A-F64A-B18E-34BEF5B11F63}',
    },
    c: [
      { n: 'dimension', p: { ref: sheet.ref || 'A1' } },
      { n: 'sheetViews', c:[
        { n: 'sheetView', p: { tabSelected: '1', workbookViewId: '0' } }
      ]},
      { n: 'sheetFormatPr', p: { baseColWidth: '10', defaultRowHeight: '16' } },
      // 单sheet数据
      { n: 'sheetData', c: SheetData },
      mergeAst,
      { n: 'phoneticPr', p: { fontId: '1', type: 'noConversion' } },
      { n: 'pageMargins', p: { left: '0.7', right: '0.7', top: '0.75', bottom: '0.75', header: '0.3', footer: '0.3' } },
    ]
  };
}

(function() {
/**
 * excel导出类
 */
class XLSX {
  constructor() {}
  s2ab(s) {
    let buf = new ArrayBuffer(s.length);
    let view = new Uint8Array(buf);
    for (let i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
  }
  escapeHTML(str) {
    return str.replace(/[<>"&]/g, (match) => {
      switch(match){
        case "<": return "&lt;"; 
        case ">": return "&gt;";
        case "&": return "&amp;"; 
        case "\"": return "&quot;"; 
      };
    })
  }
  writeTag(o) {
    if(!o) return '';
    let propertyString = '';
    if(o.p) propertyString = Object.keys(o.p).map(key => ` ${key}="${o.p[key]}"`).join('');
    if(!o.t && (!o.c)) return `<${o.n}${propertyString}/>`;
    else return `<${o.n}${propertyString}>${o.t || ''}${(o.c || []).map(v => this.writeTag(v)).join('')}</${o.n}>`;
  }
  writeXml(content) {
    return `${XML_ROOT_HEADER}${this.writeTag(content)}`;
  }
  /**
   * 返回二进制文件流
   */
  write(wb, opt = {}){
    let zip = this.write_zip(wb, opt);
    return this.s2ab(zip.generate({ type: 'string' }));
    // return zip.generateAsync({type:'string'}).then(str => this.s2ab(str));
  }
  /**
   * 生成xml文件
   */
  write_zip(wb) {
    let zip = new JSZipSync();
    let SheetNames = wb.SheetNames;
    // docProps/app.xml
    let appXmlPath = 'docProps/app.xml';
    zip.file(appXmlPath, this.writeXml(generateAppAst(SheetNames)));

    // docProps/core.xml
    let coreXmlPath = 'docProps/core.xml';
    zip.file(coreXmlPath, this.writeXml(generateCoreAst()));

    // xl/workbook.xml
    let workbookXmlPath = 'xl/workbook.xml';
    zip.file(workbookXmlPath, this.writeXml(generateWorkBookAst(SheetNames)));

    // _rels/.rels
    let rels = [
      { Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument', Target: workbookXmlPath  },
      { Type: 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', Target: coreXmlPath },
      { Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties', Target: appXmlPath },
    ];
    let relsPath = '_rels/.rels';
    zip.file(relsPath,this.writeXml(generateRelsAst(rels)));
    // xl/_rels/workbook.xml.rels
    let xmlRels = SheetNames.map((name, i) => {
      return { Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet', Target: `worksheets/sheet${i+1}.xml` };
    }).concat([
      { Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme', Target: 'theme/theme1.xml' },
      { Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles', Target: 'styles.xml' },
    ]);
    let xmlRelsPath = 'xl/_rels/workbook.xml.rels';
    zip.file(xmlRelsPath, this.writeXml(generateRelsAst(xmlRels)));

    // [Content_Types].xml
    let ctXmlPath = '[Content_Types].xml';
    zip.file(ctXmlPath,this.writeXml(generateCtAst(SheetNames)));

    // xl/styles.xml
    let styleXmlPath = 'xl/styles.xml';
    zip.file(styleXmlPath, this.writeXml(generateStyleAst()));

    // xl/theme/theme1.xml
    let themeXmlPath = 'xl/theme/theme1.xml';
    zip.file(themeXmlPath, this.writeXml(generateThemeAst()));

    // sheet.xml
    for(let i = 0;i < SheetNames.length;i++) {
      let sheetPath = `xl/worksheets/sheet${i+1}.xml`;
      let sheetName = SheetNames[i];
      zip.file(sheetPath, this.writeXml(generateSheetAst(wb.Sheets[sheetName])));
    }

    return zip;
  }
}
/**
 * 一些工具方法
 */
const transferCellPos = (r, c) => {
  return `${numToColumn(c)}${r+1}`;
}
const escapeHTML = (str) => {
  return str.replace(/[<>"&]/g, (match) => {
    switch(match){
      case "<": return "&lt;"; 
      case ">": return "&gt;";
      case "&": return "&amp;"; 
      case "\"": return "&quot;"; 
    };
  })
}

let _XLSX = new XLSX();
/**
 * 为了兼容xlsx插件 先暂时后面搞
 * 如果切换到自己写的 考虑弄到prototype上
 */
_XLSX.utils = {
  book_new() {
    return { SheetNames: [], Sheets: {} };
  },
  aoa_to_sheet(ar) {
    let ws = {
      ref: '',
      merge: []
    };
    let len = ar.length, r = 0, c = 0;
    for(;r < len;r++) {
      for(c = 0;c < ar[r].length;c++) {
        let cell = { v: ar[r][c] };
        if(cell.v === null) continue;
        // else cell.t = 's';
        ws[transferCellPos(r, c)] = cell;
      }
    }
    ws.ref = `A1:${transferCellPos(r - 1, Math.max(...ar.map(v => v.length)) - 1)}`;
    return ws;
  },
  book_append_sheet(wb, ws, name = '') {
    if(!name) {
      let len = wb.SheetNames.length;
      name = `Sheet${len+1}`;
    }
    name = escapeHTML(name);
    wb.SheetNames.push(name);
    wb.Sheets[name] = ws;
  }
};
window.XLSX = _XLSX;
}(window));
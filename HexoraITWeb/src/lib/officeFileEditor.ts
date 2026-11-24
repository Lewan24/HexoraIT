import JSZip from 'jszip'

const WORD = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const SHEET = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const PACKAGE_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
const CONTENT_TYPES = 'http://schemas.openxmlformats.org/package/2006/content-types'
const XML = 'http://www.w3.org/XML/1998/namespace'

const elements = (node: Document | Element, ns: string, name: string) =>
  Array.from(node.getElementsByTagNameNS(ns, name))
const children = (node: Element, ns: string, name: string) =>
  Array.from(node.children).filter(child => child.namespaceURI === ns && child.localName === name)

async function readPart(zip: JSZip, path: string) {
  const source = await zip.file(path)?.async('string')
  if (!source || /<!DOCTYPE/i.test(source)) throw new Error('Invalid Office XML part.')
  const xml = new DOMParser().parseFromString(source, 'application/xml')
  if (xml.getElementsByTagName('parsererror').length) throw new Error('Invalid Office XML part.')
  return xml
}

function writePart(zip: JSZip, path: string, xml: Document) {
  zip.file(path, new XMLSerializer().serializeToString(xml))
}

function packageBlob(zip: JSZip, mimeType: string) {
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType })
}

async function openPackage(blob: Blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  if (Object.keys(zip.files).some(name => name.toLowerCase().startsWith('_xmlsignatures/')))
    throw new Error('The Office file is digitally signed.')
  return zip
}

function checkText(value: string) {
  // The XML 1.0 grammar excludes these control characters.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/u.test(value))
    throw new Error('Invalid characters in Office text.')
}

function writeText(node: Element, value: string) {
  checkText(value)
  node.setAttributeNS(XML, 'xml:space', 'preserve')
  node.textContent = value
}

export async function openWordEditor(blob: Blob, mimeType: string) {
  const zip = await openPackage(blob)
  const path = 'word/document.xml'
  const doc = await readPart(zip, path)
  const body = elements(doc, WORD, 'body')[0]
  if (!body) throw new Error('Word document has no body.')
  if (zip.file('word/settings.xml')) {
    const settings = await readPart(zip, 'word/settings.xml')
    if (elements(settings, WORD, 'documentProtection').some(node =>
      ['1', 'true', 'on'].includes(node.getAttributeNS(WORD, 'enforcement') ?? '')))
      throw new Error('The Word document is protected.')
  }

  const fields = new Map<number, Element>()
  const paragraphs = elements(body, WORD, 'p').map((paragraph, index) => {
    // Skip fields, revisions and locked controls. Editing their display text can
    // break the connection to the data or instructions that produced it.
    if (Array.from(paragraph.getElementsByTagNameNS(WORD, '*')).some(node =>
      ['fldChar', 'instrText', 'fldSimple', 'ins', 'del', 'sdt'].includes(node.localName)))
      return null
    for (let parent = paragraph.parentElement; parent && parent !== body; parent = parent.parentElement) {
      if (parent.namespaceURI === WORD && ['sdt', 'ins', 'del', 'r'].includes(parent.localName)) return null
    }
    const runs = children(paragraph, WORD, 'r')
    const texts = runs.flatMap(run => children(run, WORD, 't'))
    const empty = Array.from(paragraph.children).every(node => node.namespaceURI === WORD && node.localName === 'pPr')
    const parts = (empty ? [paragraph] : texts).map(node => {
      const id = fields.size
      fields.set(id, node)
      return { id, value: empty ? '' : node.textContent ?? '' }
    })
    return parts.length ? { number: index + 1, parts } : null
  }).filter(paragraph => paragraph !== null)

  return {
    paragraphs,
    async save(changes: ReadonlyMap<number, string>) {
      // Work on a fresh document so a failed save can be retried or cancelled.
      const output = await openPackage(blob)
      const document = doc.cloneNode(true) as Document
      const allElements = Array.from(doc.getElementsByTagName('*'))
      const outputElements = Array.from(document.getElementsByTagName('*'))
      const indexes = new Map(allElements.map((node, index) => [node, index]))
      for (const [id, value] of changes) {
        const original = fields.get(id)
        if (!original) throw new Error('Word text fragment is missing.')
        let node = outputElements[indexes.get(original)!]!
        if (node.localName === 'p') {
          const run = document.createElementNS(WORD, 'w:r')
          const text = document.createElementNS(WORD, 'w:t')
          run.append(text)
          node.append(run)
          node = text
        }
        const [first, ...lines] = value.split('\n')
        writeText(node, first!)
        let previous = node
        for (const line of lines) {
          const breakNode = document.createElementNS(WORD, 'w:br')
          const text = document.createElementNS(WORD, 'w:t')
          writeText(text, line)
          previous.after(breakNode, text)
          previous = text
        }
      }
      writePart(output, path, document)
      return packageBlob(output, mimeType)
    },
  }
}

function cellPosition(address: string) {
  const match = /^([A-Z]+)([1-9]\d*)$/.exec(address)
  if (!match) throw new Error('Invalid spreadsheet cell address.')
  let column = 0
  for (const char of match[1]!) column = column * 26 + char.charCodeAt(0) - 64
  return { column, row: Number(match[2]) }
}

function inRange(address: string, range: string) {
  const [start, end = start] = range.replaceAll('$', '').split(':')
  if (!start || !end) return false
  const cell = cellPosition(address)
  const from = cellPosition(start)
  const to = cellPosition(end)
  return cell.column >= from.column && cell.column <= to.column && cell.row >= from.row && cell.row <= to.row
}

function relationshipPath(target: string) {
  const root = new URL('https://package.invalid/xl/workbook.xml')
  const uri = new URL(target, root)
  if (uri.origin !== root.origin || uri.search || uri.hash) throw new Error('Invalid Office relationship.')
  return decodeURIComponent(uri.pathname.slice(1))
}

function sheetChild(node: Element, name: string) {
  return children(node, SHEET, name)[0]
}

function setCell(sheet: Document, address: string, value: string) {
  const position = cellPosition(address)
  const sheetData = sheetChild(sheet.documentElement, 'sheetData')!
  const rows = children(sheetData, SHEET, 'row')
  let row = rows.find(node => Number(node.getAttribute('r')) === position.row)
  if (!row) {
    row = sheet.createElementNS(SHEET, 'row')
    row.setAttribute('r', String(position.row))
    sheetData.insertBefore(row, rows.find(node => Number(node.getAttribute('r')) > position.row) ?? null)
  }

  const cells = children(row, SHEET, 'c')
  let cell = cells.find(node => node.getAttribute('r') === address)
  if (!cell) {
    cell = sheet.createElementNS(SHEET, 'c')
    cell.setAttribute('r', address)
    row.insertBefore(cell, cells.find(node => cellPosition(node.getAttribute('r') ?? '').column > position.column)
      ?? sheetChild(row, 'extLst') ?? null)
  }
  for (const node of Array.from(cell.children))
    if (node.namespaceURI === SHEET && ['f', 'v', 'is'].includes(node.localName)) node.remove()
  cell.removeAttribute('t')
  if (!value) return

  const add = (parent: Element, name: string) => {
    const node = sheet.createElementNS(SHEET, name)
    parent.insertBefore(node, sheetChild(parent, 'extLst') ?? null)
    return node
  }
  if (value.startsWith('=') && value.length > 1) {
    checkText(value)
    add(cell, 'f').textContent = value.slice(1)
  } else if (/^(?:true|false)$/i.test(value)) {
    cell.setAttribute('t', 'b')
    add(cell, 'v').textContent = value.toLowerCase() === 'true' ? '1' : '0'
  } else if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value) && Number.isFinite(Number(value))) {
    add(cell, 'v').textContent = String(Number(value))
  } else {
    cell.setAttribute('t', 'inlineStr')
    writeText(add(add(cell, 'is'), 't'), value.startsWith("'") ? value.slice(1) : value)
  }
}

export async function openSpreadsheetEditor(blob: Blob, mimeType: string) {
  const zip = await openPackage(blob)
  const workbookPath = 'xl/workbook.xml'
  const relationshipsPath = 'xl/_rels/workbook.xml.rels'
  const workbook = await readPart(zip, workbookPath)
  const rels = await readPart(zip, relationshipsPath)
  const relationships = elements(rels, PACKAGE_REL, 'Relationship')
  const relation = (type: string) => relationships.find(node =>
    node.getAttribute('Type') === `${REL}/${type}` && node.getAttribute('TargetMode') !== 'External')
  const sheets = new Map(elements(workbook, SHEET, 'sheet').filter(node =>
    !node.hasAttribute('state') || node.getAttribute('state') === 'visible').map(node =>
    [node.getAttribute('name'), relationships.find(rel => rel.getAttribute('Id') === node.getAttributeNS(REL, 'id')
      && rel.getAttribute('Type') === `${REL}/worksheet` && rel.getAttribute('TargetMode') !== 'External')]))
  const shared = relation('sharedStrings')
  const strings = shared ? elements(await readPart(zip, relationshipPath(shared.getAttribute('Target')!)), SHEET, 'si') : []
  const loaded = new Map<string, Awaited<ReturnType<typeof loadSheet>>>()

  async function loadSheet(name: string) {
    const target = sheets.get(name)?.getAttribute('Target')
    if (!target) throw new Error('Spreadsheet sheet is missing.')
    const path = relationshipPath(target)
    const xml = await readPart(zip, path)
    const data = sheetChild(xml.documentElement, 'sheetData')
    if (!data) throw new Error('Spreadsheet sheet data is missing.')
    const cells = new Map(elements(data, SHEET, 'c').map(node => [node.getAttribute('r'), node]))
    const protectedRanges = elements(data, SHEET, 'f').map(node => node.getAttribute('ref')).filter(Boolean) as string[]
    const protectedSheet = !!sheetChild(xml.documentElement, 'sheetProtection')
    return { path, xml, cells, protectedRanges, protectedSheet }
  }

  async function sheet(name: string) {
    const found = loaded.get(name) ?? await loadSheet(name)
    loaded.set(name, found)
    return found
  }

  async function valueAt(name: string, address: string): Promise<string | null> {
    const { cells, protectedRanges, protectedSheet } = await sheet(name)
    const cell = cells.get(address)
    if (protectedSheet || protectedRanges.some(range => inRange(address, range)) ||
      cell?.hasAttribute('cm') || cell?.hasAttribute('vm')) return null
    if (!cell) return ''
    const formula = sheetChild(cell, 'f')
    if (formula) {
      const type = formula.getAttribute('t')
      return type && type !== 'normal' ? null : '=' + formula.textContent
    }
    const value = sheetChild(cell, 'v')?.textContent ?? ''
    switch (cell.getAttribute('t')) {
      case 's':
      case 'inlineStr': {
        const entry = cell.getAttribute('t') === 's' ? strings[Number(value)] : sheetChild(cell, 'is')
        if (!entry || sheetChild(entry, 'r')) return null
        return "'" + (sheetChild(entry, 't')?.textContent ?? '')
      }
      case 'b': return value === '1' ? 'TRUE' : 'FALSE'
      case 'str': return "'" + value
      case null:
      case 'n': return value
      default: return null
    }
  }

  return {
    valueAt,
    async save(changes: ReadonlyMap<string, ReadonlyMap<string, string>>) {
      const output = await openPackage(blob)
      for (const [name, edits] of changes) {
        const { path, xml } = await sheet(name)
        const copy = xml.cloneNode(true) as Document
        for (const [address, value] of edits) setCell(copy, address, value)
        writePart(output, path, copy)
      }
      const copy = workbook.cloneNode(true) as Document
      const root = copy.documentElement
      const settings = sheetChild(root, 'calcPr') ?? copy.createElementNS(SHEET, 'calcPr')
      if (!settings.parentNode) {
        const later = ['oleSize', 'customWorkbookViews', 'pivotCaches', 'smartTagPr', 'smartTagTypes',
          'webPublishing', 'fileRecoveryPr', 'webPublishObjects', 'extLst']
        root.insertBefore(settings, Array.from(root.children).find(node => later.includes(node.localName)) ?? null)
      }
      settings.setAttribute('fullCalcOnLoad', '1')
      writePart(output, workbookPath, copy)

      const chain = relation('calcChain')
      if (chain) {
        const path = relationshipPath(chain.getAttribute('Target')!)
        output.remove(path)
        const relationshipsCopy = rels.cloneNode(true) as Document
        elements(relationshipsCopy, PACKAGE_REL, 'Relationship')
          .find(node => node.getAttribute('Id') === chain.getAttribute('Id'))?.remove()
        writePart(output, relationshipsPath, relationshipsCopy)
        const contentTypes = await readPart(output, '[Content_Types].xml')
        elements(contentTypes, CONTENT_TYPES, 'Override')
          .find(node => node.getAttribute('PartName') === '/' + path)?.remove()
        writePart(output, '[Content_Types].xml', contentTypes)
      }
      return packageBlob(output, mimeType)
    },
  }
}

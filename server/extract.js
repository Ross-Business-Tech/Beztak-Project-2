// Turns a downloaded document into plain text the AI can read. Supported: text, Markdown, CSV, HTML, Word (.docx), PDF.
import { inflateRawSync } from 'node:zlib'
import { extractText as pdfExtract, getDocumentProxy } from 'unpdf'
import { decodeEntities, htmlToText } from './util.js'

export const SUPPORTED = ['txt', 'md', 'markdown', 'csv', 'log', 'html', 'htm', 'docx', 'pdf']
export const extOf = (name) => (String(name).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || ''

/** Reads one file out of a .zip (a .docx is a zip). Only what is needed; no extra package. */
export function readZipEntry(buf, wanted) {
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) throw new Error('This is not a valid Word document.')
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  for (let n = 0; n < count; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) break
    const method = buf.readUInt16LE(p + 10); const csize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28); const extraLen = buf.readUInt16LE(p + 30); const commentLen = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    if (buf.toString('utf8', p + 46, p + 46 + nameLen) === wanted) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
      const data = buf.subarray(start, start + csize)
      if (method === 0) return data
      if (method === 8) return inflateRawSync(data, { maxOutputLength: 30_000_000 })
      throw new Error('This Word document uses an unsupported compression.')
    }
    p += 46 + nameLen + extraLen + commentLen
  }
  return null
}

function docxText(buf) {
  const xml = readZipEntry(buf, 'word/document.xml')
  if (!xml) throw new Error('No text found in this Word document.')
  return decodeEntities(xml.toString('utf8')
    .replace(/<w:tab\s*\/>/g, '\t').replace(/<w:br\s*\/>/g, '\n').replace(/<\/w:p>/g, '\n\n').replace(/<\/w:tc>/g, '\t')
    .replace(/<[^>]+>/g, ''))
}

async function pdfText(buf) {
  const work = (async () => {
    const doc = await getDocumentProxy(new Uint8Array(buf))
    if (doc.numPages > 200) throw new Error('This PDF has more than 200 pages.')
    return (await pdfExtract(doc, { mergePages: true })).text
  })()
  let timer
  const limit = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('Reading this PDF took too long.')), 30_000) })
  try { return await Promise.race([work, limit]) } finally { clearTimeout(timer) }
}

export async function extractFileText(name, buf) {
  const ext = extOf(name)
  let text
  if (['txt', 'md', 'markdown', 'csv', 'log'].includes(ext)) text = buf.toString('utf8')
  else if (['html', 'htm'].includes(ext)) text = htmlToText(buf.toString('utf8'))
  else if (ext === 'docx') text = docxText(buf)
  else if (ext === 'pdf') text = await pdfText(buf)
  else throw new Error('This file type is not supported.')
  return text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

// A tiny stand-in for Egnyte, for demos and automated tests. Serves a small folder tree with real text, Word and PDF files.
// All content is made up.   node server/mock-egnyte.js   (listens on MOCK_EGNYTE_PORT, default 8788; token "eg-token")
import { createServer } from 'node:http'
import zlib from 'node:zlib'

export function makeDocx(text) {
  const xml = Buffer.from(`<?xml version="1.0"?><w:document><w:body>${text.split('\n').map((p) => `<w:p><w:r><w:t>${p.replace(/&/g, '&amp;')}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`)
  const name = Buffer.from('word/document.xml'); const data = zlib.deflateRawSync(xml); const crc = zlib.crc32(xml)
  const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(xml.length, 22); lh.writeUInt16LE(name.length, 26)
  const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(8, 10); cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(data.length, 20); cd.writeUInt32LE(xml.length, 24); cd.writeUInt16LE(name.length, 28)
  const body = Buffer.concat([lh, name, data]); const central = Buffer.concat([cd, name])
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(central.length, 12); end.writeUInt32LE(body.length, 16)
  return Buffer.concat([body, central, end])
}
export const makePdf = (line) => Buffer.from(`%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 600 100]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 80>>stream
BT /F1 12 Tf 10 50 Td (${line}) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R/Size 6>>
%%EOF`)

export function createMockEgnyte({ token = 'eg-token' } = {}) {
  const state = { downloads: [], unauthorized: false }
  const files = {
    '/Shared/HR/pto-policy.txt': { body: Buffer.from('Vacation policy\n\nFull-time employees receive 15 vacation days per year, accrued monthly. Unused days carry over up to 5 days.'), cs: 'a1' },
    '/Shared/HR/benefits.docx': { body: makeDocx('Benefits guide\nDental and vision coverage starts on the first day of the month after you join.\nR&D staff follow the same plan.'), cs: 'b1' },
    '/Shared/HR/handbook.pdf': { body: makePdf('Sick leave: employees may use up to 5 sick days per year without a doctor note.'), cs: 'c1' },
    '/Shared/HR/photo.png': { body: Buffer.from('not text'), cs: 'd1' },
    '/Shared/HR/Archive/old-notes.txt': { body: Buffer.from('Old note about the retired parking policy for the former downtown office building.'), cs: 'e1' },
  }
  const folders = { '/': ['/Shared'], '/Shared': ['/Shared/HR'], '/Shared/HR': ['/Shared/HR/Archive'], '/Shared/HR/Archive': [] }
  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://x')
    if (state.unauthorized || req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); return res.end('{}') }
    const m = u.pathname.match(/^\/pubapi\/v1\/(fs|fs-content)(\/.*)?$/)
    if (!m) { res.writeHead(404); return res.end() }
    const path = decodeURIComponent(m[2] || '/').replace(/(.)\/$/, '$1')
    if (m[1] === 'fs-content') {
      const f = files[path]; if (!f) { res.writeHead(404); return res.end() }
      state.downloads.push(path); res.writeHead(200, { 'content-type': 'application/octet-stream' }); return res.end(f.body)
    }
    if (!(path in folders)) { res.writeHead(404); return res.end('{}') }
    const kids = Object.keys(files).filter((p) => p.slice(0, p.lastIndexOf('/')) === (path === '/' ? '' : path))
    const body = { name: path.split('/').pop(), path, is_folder: true, total_count: folders[path].length + kids.length,
      folders: folders[path].map((p) => ({ name: p.split('/').pop(), path: p, is_folder: true })),
      files: kids.map((p) => ({ name: p.split('/').pop(), path: p, size: files[p].body.length, checksum: files[p].cs, last_modified: 'Tue, 10 Nov 2026 10:00:00 GMT', is_folder: false })) }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(body))
  })
  return { server, state, files }
}


if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const port = Number(process.env.MOCK_EGNYTE_PORT || 8788)
  createMockEgnyte({ token: process.env.MOCK_EGNYTE_TOKEN || 'eg-token' }).server.listen(port, '0.0.0.0', () => console.log(`Mock Egnyte listening on :${port}`))
}

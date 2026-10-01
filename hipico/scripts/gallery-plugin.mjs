// "virtual:gallery": every photo in public/img/gallery/ (or, while that folder is empty, the club photos),
// with its size, read when the site is built. Adding a file there is enough: no code change.
import fs from 'node:fs'
import path from 'node:path'

const ID = 'virtual:gallery'
const IMAGE = /\.(webp|jpe?g|png|avif)$/i

function size(file) {
  const b = fs.readFileSync(file)
  if (b.toString('ascii', 0, 4) === 'RIFF') {
    const c = b.toString('ascii', 12, 16)
    if (c === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)]
    if (c === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]
    if (c === 'VP8L') { const n = b.readUInt32LE(21); return [(n & 0x3fff) + 1, ((n >> 14) & 0x3fff) + 1] }
  }
  if (b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)]
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i < b.length) {
      const m = b[i + 1]
      const len = b.readUInt16BE(i + 2)
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]
      i += 2 + len
    }
  }
  return [4, 3]
}

function list(root) {
  const pick = (dir, url) => {
    if (!fs.existsSync(dir)) return []
    const files = fs.readdirSync(dir).filter((f) => IMAGE.test(f) && !f.startsWith('og-') && !/-800\.\w+$/.test(f)).sort()
    return files.map((f) => {
      const small = f.replace(/(\.\w+)$/, '-800$1')
      const show = fs.existsSync(path.join(dir, small)) ? small : f
      const [w, h] = size(path.join(dir, show))
      return { name: f.replace(/\.\w+$/, ''), src: `${url}/${show}`, w, h }
    })
  }
  const own = pick(path.join(root, 'public/img/gallery'), '/img/gallery')
  return own.length ? own : pick(path.join(root, 'public/img/club'), '/img/club')
}

export default function gallery() {
  let root = process.cwd()
  return {
    name: 'club-gallery',
    configResolved(c) { root = c.root },
    resolveId(id) { return id === ID ? `\0${ID}` : null },
    load(id) { return id === `\0${ID}` ? `export default ${JSON.stringify(list(root))}` : null },
  }
}

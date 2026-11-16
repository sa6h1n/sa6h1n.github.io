// Finds the cover pictures you drop into these two folders — no code changes needed:
//
//   src/assets/music/playlists/   ← one picture per playlist
//   src/assets/music/albums/      ← one picture per album / artist
//
// A picture belongs to the button whose `id` (see src/data/musicLinks.ts) is its file name:
//   src/assets/music/albums/utopia.jpg   →  the "UTOPIA" button
// (.jpg .jpeg .png .webp .avif .gif all work.)
//
// For a mosaic of several pictures (like a playlist), make a FOLDER named after the id instead and
// put 2, 4 or 6 pictures in it:
//   src/assets/music/playlists/hot-stuff/1.jpg, 2.jpg, 3.jpg, 4.jpg …
//
// A button with no picture gets the generated "record" cover, so nothing is ever broken.

export type CoverGroup = 'playlists' | 'albums'

export interface Cover {
  /** one picture */
  single?: string
  /** a mosaic (always 2, 4 or 6 pictures) */
  mosaic?: string[]
}

const files = import.meta.glob(
  '../assets/music/{playlists,albums}/**/*.{jpg,jpeg,png,webp,avif,gif,JPG,JPEG,PNG,WEBP}',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

interface Found {
  single?: string
  many: { name: string; url: string }[]
}
const index = new Map<string, Found>()

for (const [path, url] of Object.entries(files)) {
  const m = path.match(/assets\/music\/(playlists|albums)\/(.+)$/)
  if (!m) continue
  const parts = m[2].split('/')
  const isFolder = parts.length > 1
  const name = parts[parts.length - 1]
  const id = (isFolder ? parts[0] : name.replace(/\.[^.]+$/, '')).toLowerCase()
  const key = `${m[1]}/${id}`
  const entry = index.get(key) ?? { many: [] }
  if (isFolder) entry.many.push({ name, url })
  else entry.single = url
  index.set(key, entry)
}

export function coverFor(group: CoverGroup, id: string): Cover {
  const found = index.get(`${group}/${id.toLowerCase()}`)
  if (!found) return {}
  if (found.single) return { single: found.single }
  const sorted = found.many
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((f) => f.url)
  if (sorted.length === 1) return { single: sorted[0] }
  if (sorted.length > 1) {
    const n = sorted.length >= 6 ? 6 : sorted.length >= 4 ? 4 : 2
    return { mosaic: sorted.slice(0, n) }
  }
  return {}
}

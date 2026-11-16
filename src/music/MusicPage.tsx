import { useEffect } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import './music.css'
import { ALBUMS, PLAYLISTS, type MusicLink } from '../data/musicLinks'
import { coverFor, type CoverGroup } from './covers'
import type { Origin } from './nav'

interface Props {
  /** called when the visitor wants to go back to the site (button, Esc). `from` = where they pressed. */
  onBack: (from: Origin) => void
}

/** The tile follows the pointer: it tilts a little and a soft light slides across it. */
function track(e: PointerEvent<HTMLAnchorElement>) {
  if (e.pointerType !== 'mouse') return
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const px = (e.clientX - r.left) / r.width
  const py = (e.clientY - r.top) / r.height
  el.style.setProperty('--mx', `${px * 100}%`)
  el.style.setProperty('--my', `${py * 100}%`)
  el.style.setProperty('--rx', `${(0.5 - py) * 7}deg`)
  el.style.setProperty('--ry', `${(px - 0.5) * 9}deg`)
}
function release(e: PointerEvent<HTMLAnchorElement>) {
  const el = e.currentTarget
  el.style.setProperty('--rx', '0deg')
  el.style.setProperty('--ry', '0deg')
}

function Art({ link, group }: { link: MusicLink; group: CoverGroup }) {
  const { single, mosaic } = coverFor(group, link.id)
  if (mosaic) {
    // 2 pictures side by side, 4 in a square, 6 in a 2×3 grid (3×2 on a phone)
    const n = mosaic.length
    const style = {
      ['--cols' as string]: 2,
      ['--rows' as string]: n / 2,
      ['--mcols' as string]: n === 6 ? 3 : 2,
      ['--mrows' as string]: n === 6 ? 2 : n / 2,
    }
    return (
      <span className="mtile-art mtile-mosaic" style={style}>
        {mosaic.map((src) => (
          <img key={src} src={src} alt="" decoding="async" />
        ))}
      </span>
    )
  }
  if (single) {
    return (
      <span className="mtile-art">
        <img src={single} alt="" decoding="async" />
      </span>
    )
  }
  // no picture yet: a coloured record with the title on it
  return (
    <span className="mtile-art mtile-gen" aria-hidden="true">
      <span className="mtile-disc" />
      <span className="mtile-gen-text">{link.title}</span>
    </span>
  )
}

function Tile({ link, index, group }: { link: MusicLink; index: number; group: CoverGroup }) {
  return (
    <a
      className="mtile"
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ ['--i' as string]: index, ['--h' as string]: link.hue }}
      onPointerMove={track}
      onPointerLeave={release}
      aria-label={`${link.title} — ${link.subtitle}. Opens in Apple Music in a new tab`}
    >
      <Art link={link} group={group} />
      <span className="mtile-shine" aria-hidden="true" />
      <span className="mtile-meta">
        <span className="mtile-kind">{link.kind}</span>
        <strong className="mtile-title">{link.title}</strong>
        <span className="mtile-sub">{link.subtitle}</span>
      </span>
      <span className="mtile-go" aria-hidden="true">↗</span>
    </a>
  )
}

export default function MusicPage({ onBack }: Props) {
  useEffect(() => {
    const prev = document.title
    document.title = 'My Music — Sachin'
    return () => {
      document.title = prev
    }
  }, [])

  // Esc goes back, like the button
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack({ x: 60, y: 40 })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  const handleBack = (e: MouseEvent<HTMLAnchorElement>) => {
    // ctrl/cmd/shift/middle-click keep their normal link behaviour
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    const r = e.currentTarget.getBoundingClientRect()
    onBack({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
  }

  return (
    <>
      {/* ← Back to the site. Stays put while the page scrolls. */}
      <a className="mp-back" href={import.meta.env.BASE_URL} onClick={handleBack}>
        <span className="mp-back-disc" aria-hidden="true">
          <i className="mp-back-vinyl" />
          <span className="mp-back-arrow">←</span>
        </span>
        <span className="mp-back-text">Back to portfolio</span>
      </a>

      <div className="mp-scroll" tabIndex={-1}>
        <main className="mp">
          <header className="mp-hero">
            <p className="mp-eyebrow">Soundtracks I listen Everyday</p>
            <h1 className="mp-title">My Music</h1>
            <p className="mp-lead">Tap any tile to open it in Apple Music.</p>
          </header>

          <section aria-labelledby="mp-playlists">
            <h2 className="mp-h2" id="mp-playlists">Playlists</h2>
            <div className="mp-grid">
              {PLAYLISTS.map((l, i) => (
                <Tile key={l.id} link={l} index={i} group="playlists" />
              ))}
            </div>
          </section>

          <section aria-labelledby="mp-albums">
            <h2 className="mp-h2" id="mp-albums">Albums</h2>
            <div className="mp-grid is-four">
              {ALBUMS.map((l, i) => (
                <Tile key={l.id} link={l} index={i + PLAYLISTS.length} group="albums" />
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  )
}

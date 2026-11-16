import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { EFFECTS } from '../data/effects'
import { playPreview, stopPreview, usePreviewId } from '../audio/preview'
import { getInputMode } from '../audio/inputMode'
import { useDepth } from './useDepth'

/** A song that is ready to play on a photo (the file exists). */
export interface ReadyTrack {
  id: string
  src: string
  file: string
  /** the audio file isn't there yet (only used while developing, to show how it will look) */
  missing?: boolean
  title?: string
  artist?: string
  start?: number
}

interface Props {
  src: string
  alt: string
  /** 0-based position in its gallery */
  index: number
  /** the gallery strip's horizontal offset (desktop) */
  trackX: MotionValue<number>
  /** phones: the gallery is a normal vertical page */
  vertical: boolean
  /** if set, hovering (mouse) or tapping (touch) this photo plays the song */
  track?: ReadyTrack | null
  /** a short message shown over this photo for a few seconds ("Hover to play" / "Tap to play") */
  hint?: string | null
}

const MAX_TILT = 9 // degrees, hover tilt toward the cursor
const HOVER_DWELL_MS = 220 // pointer must rest on a cover this long before music starts
const BLOCKED_MS = 3200

// every photo sits at a slightly different "depth", so they drift at different speeds
const DEPTHS = [0.7, 1.15, 0.85, 1.2, 0.75, 1.05]

// Desktop fly-in: how far BEHIND the screen each photo starts (1 = default). Different values make
// the six photos arrive from different depths instead of as one flat sheet.
const PUSH = [0.85, 1.2, 1.0, 1.25, 0.8, 1.1]
const FLAT_ZONE = 0.3 // photos in the middle ±30 % of the screen are completely flat and sharp
const FAR_Z = 640 // px behind the screen at the very edge
const FAR_TURN = 42 // degrees a photo is angled at the very edge (like a wall of a corridor)
const PERSPECTIVE = 1000

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** 0 in the middle of the screen → 1 at the edges (smoothly), from the scroll position `v` (−1.4 … 1.4). */
const depthOf = (v: number) => {
  const a = clamp((Math.abs(v) - FLAT_ZONE) / (1.4 - FLAT_ZONE), 0, 1)
  return a * a * (3 - 2 * a)
}

// Scrolling the page slides covers under a resting cursor: don't treat that as a hover.
let lastScroll = 0
if (typeof window !== 'undefined') {
  window.addEventListener('scroll', () => (lastScroll = performance.now()), { passive: true })
}

/**
 * A gallery photo.
 *  - Scroll: it flies in from deep behind the screen (small, angled, dark), swings round to face
 *    you as it reaches the middle, and leaves the same way. The picture also drifts inside its
 *    frame (parallax).
 *  - Mouse: tilts toward the cursor with a soft glare and film grain.
 *  - Music (only when `track` is set): hover a cover to hear its song, or tap on a phone.
 */
export default function PhotoFigure({ src, alt, index, trackX, vertical, track, hint }: Props) {
  const cellRef = useRef<HTMLDivElement>(null)
  const figRef = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()

  // ───────── scroll depth ─────────
  const p = useDepth(cellRef, trackX, vertical, Boolean(reduce))
  const d = DEPTHS[index % DEPTHS.length]

  // Desktop: each photo starts far behind the screen, angled like the wall of a corridor, and
  // flies forward until it faces you in the middle of the screen (then leaves the same way).
  // The middle ±30 % of the screen is flat, so a photo you stop on is perfectly sharp.
  // Phones: the portrait photos lean back and recede a little at the screen edges.
  // Each photo also drifts up or down a few pixels at its own rate, so the grid ripples.
  const push = PUSH[index % PUSH.length]
  const y = useTransform(p, (v) =>
    vertical ? -v * d * 22 : -clamp(v, -1.2, 1.2) * (d - 0.95) * 30,
  )
  const x = useTransform(p, (v) => (vertical ? 0 : -v * depthOf(v) * 55)) // pulled toward the vanishing point
  const rotateX = useTransform(p, (v) => (vertical ? v * -9 : 0))
  const rotateY = useTransform(p, (v) => (vertical ? 0 : -Math.sign(v) * depthOf(v) * FAR_TURN))
  const z = useTransform(p, (v) =>
    vertical ? -Math.pow(Math.abs(v), 1.4) * 70 : -depthOf(v) * FAR_Z * push,
  )
  const imgX = useTransform(p, (v) => (vertical ? '0%' : `${-clamp(v, -1.2, 1.2) * 3.5}%`))
  const imgY = useTransform(p, (v) => (vertical ? `${clamp(v, -1.2, 1.2) * 8}%` : '0%'))
  // far photos sink into the dark (like fog), near ones are fully lit
  const dim = useTransform(p, (v) => (vertical ? Math.min(1, Math.abs(v)) * 0.4 : depthOf(v) * 0.62))

  // fade + un-blur the first time it scrolls into view
  const seen = useInView(cellRef, { once: true, amount: 0.15 })

  // ───────── hover tilt / glare (mouse + pen only) ─────────
  useEffect(() => {
    const el = figRef.current
    if (!el || !EFFECTS.photoTilt) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    let next = { rx: 0, ry: 0, gx: 50, gy: 50 }

    const apply = () => {
      raf = 0
      el.style.setProperty('--rx', `${next.rx.toFixed(2)}deg`)
      el.style.setProperty('--ry', `${next.ry.toFixed(2)}deg`)
      el.style.setProperty('--gx', `${next.gx.toFixed(1)}%`)
      el.style.setProperty('--gy', `${next.gy.toFixed(1)}%`)
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply) }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height
      el.classList.remove('is-leaving')
      el.classList.add('is-tilting')
      next = { rx: (0.5 - py) * 2 * MAX_TILT, ry: (px - 0.5) * 2 * MAX_TILT, gx: px * 100, gy: py * 100 }
      schedule()
    }
    const onLeave = () => {
      el.classList.remove('is-tilting')
      el.classList.add('is-leaving')
      next = { rx: 0, ry: 0, gx: 50, gy: 50 }
      schedule()
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // ───────── music ─────────
  const previewId = usePreviewId()
  const playing = Boolean(track) && previewId === track?.id
  const [notice, setNotice] = useState<string | null>(null) // short message: "Click / Tap to play", or a dev hint
  const dwell = useRef<number | undefined>(undefined)
  const blockedTimer = useRef<number | undefined>(undefined)
  const pausedByClick = useRef(false) // clicked to pause: stay quiet until the pointer leaves

  const flash = (text: string) => {
    setNotice(text)
    window.clearTimeout(blockedTimer.current)
    blockedTimer.current = window.setTimeout(() => setNotice(null), BLOCKED_MS)
  }

  const start = () => {
    if (!track) return
    if (track.missing) {
      flash(`Add ${track.file} to public/hobbies/music`)
      return
    }
    void playPreview(track.id, track.src, track.start).then((result) => {
      if (result === 'blocked') flash(getInputMode() === 'touch' ? 'Tap to play' : 'Click to play')
    })
  }

  const armHover = () => {
    window.clearTimeout(dwell.current)
    dwell.current = window.setTimeout(() => {
      dwell.current = undefined
      if (performance.now() - lastScroll < 160) return // page is scrolling under the cursor
      if (!pausedByClick.current) start()
    }, HOVER_DWELL_MS)
  }

  const isMouse = (e: ReactPointerEvent) => e.pointerType === 'mouse' || e.pointerType === 'pen'

  const onPointerEnter = (e: ReactPointerEvent) => {
    if (track && isMouse(e)) armHover()
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    if (track && isMouse(e) && !playing && dwell.current === undefined && !pausedByClick.current) armHover()
  }
  const onPointerLeave = (e: ReactPointerEvent) => {
    if (!track) return
    window.clearTimeout(dwell.current)
    dwell.current = undefined
    pausedByClick.current = false
    setNotice(null)
    if (isMouse(e)) stopPreview(track.id) // hover music ends with the hover
  }
  const toggle = () => {
    if (!track) return
    window.clearTimeout(dwell.current)
    dwell.current = undefined
    if (playing) {
      pausedByClick.current = true
      stopPreview(track.id)
    } else {
      pausedByClick.current = false
      setNotice(null)
      start()
    }
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (track && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      toggle()
    }
  }

  // Unmounting stops this photo's song. (Scrolling away from the whole music page is handled
  // in Works.tsx — the song keeps playing while you look at the other covers.)
  useEffect(() => {
    if (!track) return
    const id = track.id
    return () => {
      stopPreview(id)
      window.clearTimeout(dwell.current)
      window.clearTimeout(blockedTimer.current)
    }
  }, [track])

  const showHint = Boolean(hint) && !playing && !notice

  return (
    <div ref={cellRef} className="wk-cell" style={{ ['--i' as string]: index }}>
      <motion.div
        className={`wk-depth reveal${seen || reduce ? ' is-in' : ''}`}
        style={
          vertical
            ? { y, z, rotateX, transformPerspective: 900 }
            : { x, y, z, rotateY, transformPerspective: PERSPECTIVE }
        }
      >
        <figure
          ref={figRef}
          className={[
            'wk-photo tilt',
            track ? 'has-track' : '',
            playing ? 'is-playing' : '',
          ].join(' ')}
          onPointerEnter={onPointerEnter}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onClick={track ? toggle : undefined}
          onKeyDown={track ? onKeyDown : undefined}
          role={track ? 'button' : undefined}
          tabIndex={track ? 0 : undefined}
          aria-pressed={track ? playing : undefined}
          aria-label={track ? `${alt}. ${playing ? 'Pause' : 'Play'} the song` : undefined}
        >
          <motion.img
            src={src}
            alt={track ? '' : alt}
            loading="lazy"
            decoding="async"
            draggable={false}
            style={{ x: imgX, y: imgY, scale: vertical ? 1.2 : 1.08 }}
          />
          <motion.span className="wk-dim" aria-hidden="true" style={{ opacity: dim }} />
          {EFFECTS.photoGrain && <span className="film-grain" aria-hidden="true" />}
          <span className="film-glare" aria-hidden="true" />

          {track && !playing && !notice && (
            <span className="wk-note" aria-hidden="true">♪</span>
          )}

          <AnimatePresence>
            {(playing || notice || showHint) && (
              <motion.div
                key={playing ? 'playing' : notice ? 'notice' : 'hint'}
                className={`wk-now${playing ? ' is-song' : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                aria-live="polite"
              >
                {playing ? (
                  <>
                    <span className="wk-eq" aria-hidden="true">
                      <i /><i /><i /><i />
                    </span>
                    {/* shown the whole time the song plays, and only then */}
                    <span className="wk-now-copy">
                      <span className="wk-now-eyebrow">Now playing</span>
                      {track?.title && <span className="wk-now-title">{track.title}</span>}
                      {track?.artist && <span className="wk-now-artist">{track.artist}</span>}
                    </span>
                  </>
                ) : notice ? (
                  <span className="wk-now-text">{notice}</span>
                ) : (
                  <>
                    <span className="wk-music-dot" aria-hidden="true" />
                    <span className="wk-now-text">{hint}</span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <figcaption>{String(index + 1).padStart(2, '0')}</figcaption>
        </figure>
      </motion.div>
    </div>
  )
}

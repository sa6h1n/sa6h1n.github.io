// The animated "curtain" the music page appears in.
// A vinyl record spins up out of one point (the "My Music" link) and grows until it covers the screen,
// then a blue wave and the page itself open up inside it like the record's label. Closing plays it
// backwards: the page shrinks away, then the record spins back down into the same point.
// Used inside the site (MusicOverlay) and by the stand-alone music page (StandaloneMusic).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion, usePresence } from 'framer-motion'
import './stage.css'

export interface Origin {
  x: number
  y: number
}

/** how far a circle centred on `o` must grow to cover the whole screen */
function coverRadius(o: Origin) {
  const w = window.innerWidth
  const h = window.innerHeight
  return Math.hypot(Math.max(o.x, w - o.x), Math.max(o.y, h - o.y)) + 8
}
const circle = (r: number, o: Origin) => `circle(${r}px at ${o.x}px ${o.y}px)`

const EASE = [0.76, 0, 0.24, 1] as const // slow start, fast middle, soft landing

// Phones / touch screens. The first version ran the record through framer-motion, which moves things on
// the main thread: while the phone was busy (3D scene still drawing, music page mounting) the record
// froze and then jumped. Here the record is a native Web Animation, which the GPU compositor runs on its
// own, so it stays smooth even when the page is busy. On top of that:
//  - the 3D scene is paused the moment the record starts to grow (it would fight for the GPU),
//  - the music page is only mounted once the record covers the screen (so its heavy start-up is hidden),
//  - the record is drawn at a modest size and scaled up, instead of painting a screen-sized disc.
const EASE_CSS = 'cubic-bezier(0.76, 0, 0.24, 1)'

function LiteStage({
  origin,
  onCovered,
  children,
}: {
  origin: Origin
  onCovered?: () => void
  children: ReactNode
}) {
  const [isPresent, safeToRemove] = usePresence()
  const layerRef = useRef<HTMLDivElement>(null)
  const discRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const openAnim = useRef<Animation | null>(null)
  const closing = useRef(false)
  const [ready, setReady] = useState(false) // the page's content is mounted

  const r = coverRadius(origin)
  const size = Math.min(r * 2, 1100)
  const finalScale = (r * 2) / size

  // open: the record grows and spins (compositor-driven)
  useEffect(() => {
    const disc = discRef.current
    if (!disc) return
    onCovered?.() // freeze the 3D scene behind us right away: it only gets in the way now
    const a = disc.animate(
      [
        { transform: 'scale(0) rotate(0deg)' },
        { transform: `scale(${finalScale}) rotate(360deg)` },
      ],
      { duration: 900, easing: EASE_CSS, fill: 'forwards' },
    )
    openAnim.current = a
    // Mount the page as soon as the record is visibly moving (not before: the record must get its first
    // frames out smoothly). The record runs on the GPU now, so the page starting up cannot stall it.
    let raf = 0
    a.ready
      .then(() => {
        raf = requestAnimationFrame(() => !closing.current && setReady(true))
      })
      .catch(() => {})
    return () => {
      cancelAnimationFrame(raf)
      a.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // the page's content is in: fade it in so it arrives just as the record finishes covering the screen
  useEffect(() => {
    if (!ready) return
    layerRef.current?.querySelector<HTMLElement>('.mp-scroll')?.focus({ preventScroll: true })
    const played = Number(openAnim.current?.currentTime ?? 0)
    pageRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      delay: Math.max(0, 560 - played),
      duration: 340,
      easing: 'ease-out',
      fill: 'forwards',
    })
  }, [ready])

  // close: the page fades away, then the record plays backwards into the point it came from
  useEffect(() => {
    if (isPresent) return
    closing.current = true
    const page = pageRef.current
    const a = openAnim.current
    if (!a) {
      safeToRemove?.()
      return
    }
    let fade = 0
    if (page && ready) {
      fade = 180
      page.animate([{ opacity: getComputedStyle(page).opacity }, { opacity: 0 }], {
        duration: fade,
        fill: 'forwards',
      })
    }
    const t = window.setTimeout(() => {
      a.reverse() // plays back from wherever it is; `finished` is read after this so it is the reverse run
      a.finished.then(() => safeToRemove?.()).catch(() => safeToRemove?.())
    }, fade)
    return () => window.clearTimeout(t)
  }, [isPresent, ready, safeToRemove])

  return (
    <div ref={layerRef} className="mx-layer mx-lite" role="dialog" aria-modal="true" aria-label="My Music">
      <div
        ref={discRef}
        className="mx-vinyl"
        aria-hidden="true"
        style={{
          left: origin.x - size / 2,
          top: origin.y - size / 2,
          width: size,
          height: size,
          transform: 'scale(0)',
        }}
      />
      <div ref={pageRef} className="mx-page mx-page-lite" style={{ opacity: 0 }}>
        <div className="mp-glow" aria-hidden="true" />
        {ready ? children : null}
      </div>
    </div>
  )
}

export default function MusicStage({
  origin,
  onCovered,
  children,
}: {
  origin: Origin
  /** the page has finished opening and now hides everything behind it */
  onCovered?: () => void
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  // Phones / touch screens: animating a clip-path over the whole live page is too heavy for them (it
  // re-paints every frame and made the disc stutter), so there the record spins up and the page just
  // fades in once the record covers the screen. Only transforms and opacity move, which the GPU handles.
  const lite = useMemo(
    () => window.matchMedia?.('(pointer: coarse), (max-width: 640px)').matches === true,
    [],
  )
  const layerRef = useRef<HTMLDivElement>(null)
  const r = coverRadius(origin)
  const closed = circle(0, origin)
  const opened = circle(r, origin)

  // keyboard focus moves onto the page, so arrow keys / space scroll it (not the site behind it)
  useEffect(() => {
    layerRef.current?.querySelector<HTMLElement>('.mp-scroll')?.focus({ preventScroll: true })
  }, [])

  if (reduce) {
    // people who asked their device for less motion: a plain fade instead of the circles
    return (
      <motion.div
        ref={layerRef}
        className="mx-layer"
        role="dialog"
        aria-modal="true"
        aria-label="My Music"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onAnimationComplete={(def) => {
          if (typeof def === 'object' && 'opacity' in def && def.opacity === 1) onCovered?.()
        }}
      >
        <div className="mx-page">
          <div className="mp-glow" aria-hidden="true" />
          {children}
        </div>
      </motion.div>
    )
  }

  if (lite) return <LiteStage origin={origin} onCovered={onCovered}>{children}</LiteStage>

  return (
    <motion.div
      ref={layerRef}
      className="mx-layer"
      role="dialog"
      aria-modal="true"
      aria-label="My Music"
    >
      {/* 1 — a vinyl record leads the way: it grows from the link while it spins */}
      <motion.div
        className="mx-vinyl"
        aria-hidden="true"
        style={{
          left: origin.x - r,
          top: origin.y - r,
          width: r * 2,
          height: r * 2,
        }}
        initial={{ scale: 0, rotate: 0 }}
        animate={{ scale: 1, rotate: 540, transition: { duration: 1.1, ease: EASE } }}
        exit={{ scale: 0, rotate: 0, transition: { duration: 0.85, ease: EASE, delay: 0.2 } }}
      />
      {/* 2 — the site's blue follows */}
      <motion.div
        className="mx-wave mx-wave-blue"
        aria-hidden="true"
        initial={{ clipPath: closed }}
        animate={{ clipPath: opened, transition: { duration: 0.95, ease: EASE, delay: 0.24 } }}
        exit={{ clipPath: closed, transition: { duration: 0.8, ease: EASE, delay: 0.1 } }}
      />
      {/* 3 — the music page */}
      <motion.div
        className="mx-page"
        initial={{ clipPath: closed }}
        animate={{ clipPath: opened, transition: { duration: 0.95, ease: EASE, delay: 0.34 } }}
        exit={{ clipPath: closed, transition: { duration: 0.8, ease: EASE } }}
        onAnimationComplete={(def) => {
          // fires for the opening only: the closing animation passes the `exit` target instead
          if (typeof def === 'object' && 'clipPath' in def && def.clipPath === opened) onCovered?.()
        }}
      >
        <div className="mp-glow" aria-hidden="true" />
        {children}
      </motion.div>
    </motion.div>
  )
}

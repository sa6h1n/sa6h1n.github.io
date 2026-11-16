// The animated "curtain" the music page appears in.
// A vinyl record spins up out of one point (the "My Music" link) and grows until it covers the screen,
// then a blue wave and the page itself open up inside it like the record's label. Closing plays it
// backwards: the page shrinks away, then the record spins back down into the same point.
// Used inside the site (MusicOverlay) and by the stand-alone music page (StandaloneMusic).
import { useEffect, useRef, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
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

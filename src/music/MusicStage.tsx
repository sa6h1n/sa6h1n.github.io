// The animated "curtain" the music page appears in.
// Three circles grow from one point (the "My Music" link): a thin warm edge, then a blue wave, then
// the page itself. Closing plays it backwards, shrinking into the same point.
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
      {/* 1 — a thin warm edge leads the way */}
      <motion.div
        className="mx-wave mx-wave-warm"
        aria-hidden="true"
        initial={{ clipPath: closed }}
        animate={{ clipPath: opened, transition: { duration: 0.95, ease: EASE } }}
        exit={{ clipPath: closed, transition: { duration: 0.8, ease: EASE, delay: 0.14 } }}
      />
      {/* 2 — the site's blue follows */}
      <motion.div
        className="mx-wave mx-wave-blue"
        aria-hidden="true"
        initial={{ clipPath: closed }}
        animate={{ clipPath: opened, transition: { duration: 0.95, ease: EASE, delay: 0.07 } }}
        exit={{ clipPath: closed, transition: { duration: 0.8, ease: EASE, delay: 0.07 } }}
      />
      {/* 3 — the music page */}
      <motion.div
        className="mx-page"
        initial={{ clipPath: closed }}
        animate={{ clipPath: opened, transition: { duration: 0.95, ease: EASE, delay: 0.16 } }}
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

import { useEffect, useRef } from 'react'
import { EFFECTS } from '../data/effects'

interface Props {
  src: string
  alt: string
  /** 0-based position in its gallery */
  index: number
}

const MAX_TILT = 9 // degrees

/**
 * A gallery photo. With a mouse it tilts toward the cursor, a soft glare follows the pointer
 * and film grain flickers over it. Touch screens and reduced-motion visitors get the plain photo.
 */
export default function PhotoFigure({ src, alt, index }: Props) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
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

  return (
    <figure ref={ref} className="wk-photo tilt">
      <img src={src} alt={alt} loading="lazy" decoding="async" />
      {EFFECTS.photoGrain && <span className="film-grain" aria-hidden="true" />}
      <span className="film-glare" aria-hidden="true" />
      <figcaption>{String(index + 1).padStart(2, '0')}</figcaption>
    </figure>
  )
}

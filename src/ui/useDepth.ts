import { useEffect, type RefObject } from 'react'
import { useMotionValue, useScroll, type MotionValue } from 'framer-motion'

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/**
 * Where an element is relative to the middle of the screen while the gallery scrolls:
 *   0  = centred,  -1 = at the left (or top) edge,  +1 = at the right (or bottom) edge.
 *
 * Desktop: the gallery is a horizontal strip driven by `trackX`, so the position is
 * measured once (where the element sits when the strip hasn't moved) and updated from `trackX`.
 * Phones (`vertical`): the gallery is a normal vertical page, so it follows the element's own
 * scroll progress.
 *
 * Everything "immersive" (turning, receding, parallax inside the frame) is derived from this
 * one number, so it costs next to nothing per frame.
 */
export function useDepth(
  ref: RefObject<HTMLElement | null>,
  trackX: MotionValue<number>,
  vertical: boolean,
  still: boolean,
): MotionValue<number> {
  const p = useMotionValue(0)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  useEffect(() => {
    const el = ref.current
    if (!el || still) {
      p.set(0)
      return
    }

    let cx = 0 // element's centre (x) when the strip is at rest
    const vw = () => document.documentElement.clientWidth

    const update = () => {
      if (vertical) {
        p.set(clamp((scrollYProgress.get() - 0.5) * 2, -1.2, 1.2))
      } else {
        const half = vw() / 2
        p.set(clamp((cx + trackX.get() - half) / half, -1.4, 1.4))
      }
    }

    const measure = () => {
      const r = el.getBoundingClientRect()
      cx = r.left + r.width / 2 - trackX.get()
      update()
    }

    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const track = el.closest('.wk-track')
    if (track) ro.observe(track)

    window.addEventListener('resize', measure)
    // layout can still shift a little while fonts / images settle
    const late = window.setTimeout(measure, 900)
    void document.fonts?.ready.then(measure)

    const offX = trackX.on('change', update)
    const offY = scrollYProgress.on('change', update)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      window.clearTimeout(late)
      offX()
      offY()
    }
  }, [ref, trackX, vertical, still, p, scrollYProgress])

  return p
}

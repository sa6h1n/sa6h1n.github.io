// The browser-tab icon is a vinyl record — and it spins.
//
// Favicons can't be animated with CSS, so we redraw the record on a small canvas a few times a
// second and swap it in as the page's icon. Notes:
//  • Chrome slows timers in background tabs to ~1 tick / second, so the step per tick is
//    capped: the disc keeps turning there, just in slower, steady "clicks".
//  • Safari ignores live favicon changes in some versions — there it simply stays a (full-size)
//    record, same as before.
//  • With "reduce motion" the record stays still.

const SIZE = 64 // drawn at 64 px; the browser scales it down (crisper on hi-dpi tabs)
const RPS = 0.4 // revolutions per second while the tab is in front
const FRAME_MS = 100

export function spinFavicon() {
  if (typeof document === 'undefined') return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduce) return

  const img = new Image()
  img.src = `${import.meta.env.BASE_URL}favicon.png`
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // one <link> only, so the browser doesn't pick a stale static size over ours
    document.querySelectorAll('link[rel~="icon"]').forEach((l) => l.remove())
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png'
    document.head.appendChild(link)

    const c = SIZE / 2
    let angle = 0
    let last = performance.now()

    const frame = () => {
      const now = performance.now()
      // cap dt so background-tab ticks (≈1 s apart) advance a steady ~58°, not a random jump
      const dt = Math.min((now - last) / 1000, 0.4)
      last = now
      angle = (angle + dt * RPS * Math.PI * 2) % (Math.PI * 2)

      ctx.clearRect(0, 0, SIZE, SIZE)
      ctx.save()
      ctx.translate(c, c)
      ctx.rotate(angle)
      ctx.drawImage(img, -c, -c, SIZE, SIZE)
      ctx.restore()

      // a fixed glint across the grooves (it doesn't rotate — that's what sells the spin)
      ctx.save()
      ctx.globalCompositeOperation = 'source-atop'
      ctx.fillStyle = 'rgba(255,255,255,0.16)'
      for (const a0 of [-2.3, -2.3 + Math.PI]) {
        ctx.beginPath()
        ctx.moveTo(c, c)
        ctx.arc(c, c, c, a0, a0 + 0.55)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()

      link.href = canvas.toDataURL('image/png')
    }

    frame()
    window.setInterval(frame, FRAME_MS)
  }
}

import { useEffect, useRef, useState, type CSSProperties } from 'react'

interface Props {
  /** the line to show / change to */
  quote: string
  /** bump to change the line (0 = never changed yet) */
  runId: number
  /** ms to wait before changing */
  delay: number
}

// Timings (ms). The new line begins while the old one is still leaving, so it feels like one breath.
const OUT_MS = 800 //  how long an outgoing word takes to drift away
const OUT_SPREAD = 420 // outgoing words leave over this window
const IN_START = 380 //  the new line starts this long after the old one begins to leave
const IN_MS = 1250 //  how long an incoming word takes to settle
const IN_STEP = 62 //  gap between one incoming word and the next

/** Stable pseudo-random in [0, 1). */
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

type Mode = 'rest' | 'out' | 'in'

/** One line, word by word. In `out`/`in` mode every word carries its own offset and delay. */
function Line({ text, mode, seed }: { text: string; mode: Mode; seed: number }) {
  const words = text.split(' ')
  return (
    <span className={`qr-line is-${mode}`}>
      {words.map((w, i) => {
        const r = rnd(i + seed * 17)
        const vars =
          mode === 'in'
            ? { '--dx': `${(r - 0.5) * 36}px`, '--dy': `${14 + r * 16}px`, '--d': `${IN_START + i * IN_STEP + r * 140}ms` }
            : mode === 'out'
              ? { '--dx': `${(rnd(i + 5 + seed) - 0.5) * 30}px`, '--dy': `${-(10 + r * 14)}px`, '--d': `${r * OUT_SPREAD}ms` }
              : undefined
        return (
          <span key={i}>
            <span className="qr-word" style={vars as CSSProperties}>{w}</span>
            {i < words.length - 1 ? ' ' : null}
          </span>
        )
      })}
    </span>
  )
}

/**
 * The closing line changes like a thought settling: the old line's words drift up and dissolve
 * into a soft blur, and the new line's words float in from slightly scattered places, out of
 * focus, one after another, and settle into the sentence. No flashing, no spinning.
 * The window has a fixed height, so nothing around it ever jumps.
 */
export default function QuoteReel({ quote, runId, delay }: Props) {
  const [layers, setLayers] = useState<{ text: string; mode: Mode; seed: number }[]>([{ text: quote, mode: 'rest', seed: 0 }])
  const shown = useRef(quote) // the line on screen once everything is at rest

  useEffect(() => {
    if (runId === 0) { setLayers([{ text: quote, mode: 'rest', seed: 0 }]); shown.current = quote; return }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setLayers([{ text: quote, mode: 'rest', seed: 0 }]); shown.current = quote; return }

    const timers: number[] = []
    timers.push(window.setTimeout(() => {
      setLayers([
        { text: shown.current, mode: 'out', seed: runId },
        { text: quote, mode: 'in', seed: runId + 1 },
      ])
      const words = quote.split(' ').length
      const total = IN_START + words * IN_STEP + 140 + IN_MS + 60
      timers.push(window.setTimeout(() => {
        setLayers([{ text: quote, mode: 'rest', seed: 0 }])
        shown.current = quote
      }, total))
    }, delay))

    return () => timers.forEach(clearTimeout)
  }, [runId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className="qr-window">
      {layers.map((l) => (
        <span className="qr-layer" key={`${l.mode}-${l.seed}-${l.text.slice(0, 10)}`} aria-hidden={l.mode === 'out' || undefined}>
          <Line text={l.text} mode={l.mode} seed={l.seed} />
        </span>
      ))}
    </span>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { pickClosingQuote, rememberClosingQuote } from './closingQuote'

/**
 * Decides WHICH line the closing card shows, and when it should change.
 *  • Every time the card scrolls into view (`active` turns true) a NEW line is chosen
 *    (never the one before it) and the change plays — so it always lands on something different,
 *    whether the visitor just arrived, left the gallery and came back, or scrolled back to it.
 *  • Wobbling in and out of view within `cooldownMs` doesn't re-roll.
 * `firstDelay` waits for the card's intro animation; `laterDelay` is for repeats.
 * `showQuote(q)` is for the dots at the bottom (one per line).
 */
export function useQuoteReveal(active: boolean, firstDelay = 2100, laterDelay = 350, cooldownMs = 2500) {
  const [quote, setQuote] = useState(() => pickClosingQuote())
  const [run, setRun] = useState({ id: 0, delay: firstDelay })
  const plays = useRef(0)
  const lastAt = useRef(-1e9)

  useEffect(() => {
    if (!active) return
    const now = performance.now()
    if (plays.current > 0 && now - lastAt.current < cooldownMs) return
    if (plays.current > 0) setQuote((q) => pickClosingQuote(q))
    lastAt.current = now
    plays.current++
    setRun({ id: plays.current, delay: plays.current === 1 ? firstDelay : laterDelay })
  }, [active, firstDelay, laterDelay, cooldownMs])

  /** Visitor asked for another line: pick a new one now and play the change straight away. */
  const shuffle = useCallback(() => {
    setQuote((q) => pickClosingQuote(q))
    lastAt.current = performance.now()
    plays.current++
    setRun({ id: plays.current, delay: 0 })
  }, [])

  /** Visitor clicked a dot: show that specific line now. */
  const showQuote = useCallback((q: string) => {
    setQuote(q)
    rememberClosingQuote(q)
    lastAt.current = performance.now()
    plays.current++
    setRun({ id: plays.current, delay: 0 })
  }, [])

  return { quote, runId: run.id, delay: run.delay, shuffle, showQuote }
}

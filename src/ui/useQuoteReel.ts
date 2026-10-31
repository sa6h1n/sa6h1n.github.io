import { useEffect, useRef, useState } from 'react'
import { pickClosingQuote } from './closingQuote'

/**
 * Decides WHICH line the closing card shows, and when it should change.
 *  • Every time the card scrolls into view (`active` turns true) a NEW line is chosen
 *    (never the one before it) and the change plays — so it always lands on something different,
 *    whether the visitor just arrived, left the gallery and came back, or scrolled back to it.
 *  • Wobbling in and out of view within `cooldownMs` doesn't re-roll.
 * `firstDelay` waits for the card's intro animation; `laterDelay` is for repeats.
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

  return { quote, runId: run.id, delay: run.delay }
}

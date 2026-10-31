import { useEffect, useRef, useState } from 'react'
import { pickClosingQuote } from './closingQuote'
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

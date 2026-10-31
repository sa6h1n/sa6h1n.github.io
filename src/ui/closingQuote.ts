import { CLOSING_QUOTES } from '../data/quotes'

const KEY = 'sa6h1n:last-quote'
export function pickClosingQuote(avoid?: string): string {
  const pool = CLOSING_QUOTES
  if (pool.length < 2) return pool[0] ?? ''

  let last = avoid
  if (last === undefined) {
    try {
      last = localStorage.getItem(KEY) ?? undefined
    } catch {
      /* storage blocked — fine, we just can't avoid a repeat across visits */
    }
  }
  const choices = pool.filter((q) => q !== last)
  const quote = choices[Math.floor(Math.random() * choices.length)]
  try {
    localStorage.setItem(KEY, quote)
  } catch {
    /* ignore */
  }
  return quote
}

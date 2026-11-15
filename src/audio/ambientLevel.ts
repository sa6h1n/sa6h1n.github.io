/**
 * Pure maths for the background music: "how loud should it be at this scroll position?"
 * No DOM, no React, no audio here — just numbers in, number out — so it is easy to tune and test.
 *
 * The page, top to bottom:
 *   Hero ................. silent
 *   A Little About Me .... starts slowly, then
 *       · normal while a description is being read
 *       · dips a little in the empty stretch between two descriptions
 *   Gallery .............. normal
 *       · After Hours (the song covers) ducks low — only when you scroll INTO it from the left,
 *         not when you come back to it from the last page
 *   (a song preview that is playing silences the background track — handled in ambient.ts)
 */

/** All the knobs in one place. */
export const AMBIENT = {
  /** loudness of the track at "normal" (0 – 1). */
  normal: 0.095,
  /** About Me: between two descriptions the track settles to this share of normal. */
  dip: 0.4,
  /** After Hours: share of normal while the song covers are on screen. */
  afterHoursDuck: 0.3,
  /** About Me: the line (share of screen height, from the top) a description must be near to count as "being read". */
  readLine: 0.45,
  /** About Me: how far (share of screen height) from that line a description still lifts the volume. */
  readReach: 0.28,
  /** smoothing: seconds it takes to get (mostly) louder / quieter. Bigger = slower, softer. */
  riseSeconds: 0.9,
  fallSeconds: 0.6,
}

export interface Box {
  top: number
  bottom: number
  left: number
  right: number
}

export interface LevelInput {
  vw: number
  vh: number
  /** top edge of the "A Little About Me" title (null = not on the page) */
  titleTop: number | null
  /** the text blocks of the About Me entries */
  bodies: Box[]
  /** the whole gallery section */
  gallery: Box | null
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** 0 at `a`, 1 at `b`, eased in between (works when a > b too). */
export function smooth(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** 0 – 1: how much of a card is on screen (works for the sideways strip and the phone's vertical stack). */
export function coverage(card: Box, vw: number, vh: number): number {
  const w = Math.max(0, Math.min(card.right, vw) - Math.max(card.left, 0))
  const h = Math.max(0, Math.min(card.bottom, vh) - Math.max(card.top, 0))
  const cardArea = Math.max(1, (card.right - card.left) * (card.bottom - card.top))
  return clamp01((w * h) / Math.min(cardArea, Math.max(1, vw * vh)))
}

/** 0 – 1 share of "normal" volume for this scroll position, before the After Hours duck. */
export function baseLevel({ vh, titleTop, bodies, gallery }: LevelInput): number {
  // ── About Me ──
  let about = 0
  if (titleTop !== null) {
    // the track fades in as the section arrives
    const arrived = smooth(vh * 0.95, vh * 0.5, titleTop)

    // 1 while a description is where you are reading, falling off with distance
    const line = vh * AMBIENT.readLine
    let read = 0
    for (const b of bodies) {
      const d = line < b.top ? b.top - line : line > b.bottom ? line - b.bottom : 0
      read = Math.max(read, 1 - smooth(0, vh * AMBIENT.readReach, d))
    }
    about = arrived * (AMBIENT.dip + (1 - AMBIENT.dip) * read)
  }

  // ── Gallery ──
  let gal = 0
  if (gallery && gallery.top < vh && gallery.bottom > 0) {
    const fade = Math.max(240, vh * 0.6)
    const entering = clamp01((vh - gallery.top) / fade)
    const leaving = clamp01(gallery.bottom / fade)
    gal = Math.min(entering, leaving)
  }

  return Math.max(about, gal)
}

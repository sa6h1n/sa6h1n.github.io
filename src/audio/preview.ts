import { useSyncExternalStore } from 'react'

/**
 * Song previews for the music section of the gallery.
 *
 * - Only ONE preview plays at a time (a single shared <audio> element).
 * - Starting / stopping fades the volume instead of cutting it.
 * - While a preview plays, the gallery's ambient background track is "ducked"
 *   (faded to silence) and comes back afterwards — see `onDuckChange`.
 * - Fades go through a Web Audio gain node once the visitor has interacted: iPhones ignore
 *   `audio.volume`, so without it a song would start and stop with no fade there.
 */

export const PREVIEW_VOLUME = 0.75
const FADE_IN_MS = 600
const FADE_OUT_MS = 450
/** fade-out when the visitor scrolls away from the music page without pausing the song */
export const FADE_AWAY_MS = 1400

export type PlayResult = 'playing' | 'blocked' | 'error'

let audio: HTMLAudioElement | null = null
let currentId: string | null = null
let pendingId: string | null = null // asked to play, the browser hasn't started it yet
let token = 0 // bumps on every play / stop, so slow promises can tell they are stale
let fadeRaf = 0
let loadedSrc = ''

let ctx: AudioContext | null = null
let gain: GainNode | null = null
let routed = false

// "Takeover": once a song has played from the music page, the background track stays silent until the
// visitor scrolls out of that page (even between songs, or after they paused). ambient.ts reads this.
let takeover = false

const idListeners = new Set<() => void>()
const duckListeners = new Set<() => void>()

const notify = () => idListeners.forEach((l) => l())

function setCurrent(id: string | null) {
  if (currentId === id) return
  const wasDucked = currentId !== null
  currentId = id
  notify()
  if (wasDucked !== (id !== null)) duckListeners.forEach((l) => l())
}

function getAudio(): HTMLAudioElement {
  if (!audio) {
    const a = new Audio()
    a.preload = 'auto'
    a.loop = true

    // If something OUTSIDE this file stops the song (a phone call, headphones unplugged, the OS media
    // key, a network error) the "playing" state must not stay stuck — a stuck state kept the
    // background track silent for good. Our own stops set currentId to null first, so they never land here.
    const lost = () => {
      if (currentId === null || pendingId !== null) return
      token++
      setCurrent(null)
    }
    a.addEventListener('pause', lost)
    a.addEventListener('error', () => {
      lost()
      setTakeover(false) // a broken song must not leave the site silent
    })
    audio = a
  }
  return audio
}

/** True while the background track must stay quiet because a song was played from the music page. */
export const isTakeover = () => takeover

/** Turn the takeover on / off. `notify = false` is for callers that are already recomputing. */
export function setTakeover(on: boolean, notify = true) {
  if (takeover === on) return
  takeover = on
  if (notify) duckListeners.forEach((l) => l())
}

/**
 * Send the song through a gain node so its volume can be faded on iPhones too.
 * Only after the visitor has interacted: before that a suspended audio context would play silence.
 * (Once an element is routed this way it stays routed, so the volume is then set on the gain node.)
 */
function routeThroughGain(a: HTMLAudioElement) {
  if (routed) return
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
  if (activation && !activation.hasBeenActive) return
  const AC: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return
  try {
    const c = ctx ?? new AC()
    ctx = c
    void c.resume().catch(() => {})
    const src = c.createMediaElementSource(a)
    const g = c.createGain()
    g.gain.value = 0
    src.connect(g)
    g.connect(c.destination)
    a.volume = 1
    gain = g
    routed = true
  } catch {
    /* keep using audio.volume */
  }
}

const getVol = () => (gain ? gain.gain.value : audio ? audio.volume : 0)

function setVol(v: number) {
  const x = Math.max(0, Math.min(1, v))
  if (gain) gain.gain.value = x
  else if (audio) audio.volume = x
}

function fadeTo(target: number, ms: number, done?: () => void) {
  const a = audio
  if (!a) return
  cancelAnimationFrame(fadeRaf)
  const from = getVol()
  const t0 = performance.now()
  const step = (now: number) => {
    const k = Math.min(1, Math.max(0, (now - t0) / ms)) // rAF time can lag behind performance.now()
    const eased = k * k * (3 - 2 * k)
    setVol(from + (target - from) * eased)
    if (k < 1) fadeRaf = requestAnimationFrame(step)
    else done?.()
  }
  fadeRaf = requestAnimationFrame(step)
}

/** True while a preview is playing (the background track should stay quiet). */
export const isDucked = () => currentId !== null

/** The id of the preview that is playing right now (or null). */
export const getPreviewId = () => currentId

/** Called whenever a preview starts or stops. Returns an unsubscribe function. */
export function onDuckChange(listener: () => void): () => void {
  duckListeners.add(listener)
  return () => duckListeners.delete(listener)
}

function subscribe(listener: () => void) {
  idListeners.add(listener)
  return () => idListeners.delete(listener)
}

/** React hook: the id of the preview that is playing right now (or null). */
export function usePreviewId(): string | null {
  return useSyncExternalStore(subscribe, () => currentId, () => null)
}

/**
 * Start a preview. Call it straight from a click / tap handler where you can:
 * mobile browsers only allow audio that starts inside a user gesture.
 * Resolves to 'blocked' when the browser refused (no click on the page yet).
 */
export function playPreview(id: string, src: string, startAt = 0): Promise<PlayResult> {
  const a = getAudio()
  const my = ++token

  if (currentId === id && !a.paused) return Promise.resolve('playing')

  routeThroughGain(a)
  cancelAnimationFrame(fadeRaf)
  setVol(0)
  pendingId = id

  if (loadedSrc !== src) {
    loadedSrc = src
    a.src = src
    if (startAt > 0) {
      a.addEventListener(
        'loadedmetadata',
        () => {
          if (my === token) a.currentTime = startAt
        },
        { once: true },
      )
    }
  }

  return a
    .play()
    .then((): PlayResult => {
      if (my !== token) {
        // Stopped while it was loading (and nothing else took over): don't let it start late.
        if (pendingId === null && currentId === null) a.pause()
        return 'playing'
      }
      pendingId = null
      setCurrent(id)
      setTakeover(true)
      fadeTo(PREVIEW_VOLUME, FADE_IN_MS)
      return 'playing'
    })
    .catch((err: unknown): PlayResult => {
      if (my !== token) return 'playing'
      pendingId = null
      const name = (err as { name?: string } | null)?.name
      return name === 'NotAllowedError' ? 'blocked' : 'error'
    })
}

/**
 * Fade out and stop. Pass an id to only stop that preview (ignored if another is playing).
 * `fadeMs` is how long the fade lasts (a slower one is used when the visitor scrolls away).
 */
export function stopPreview(id?: string, fadeMs: number = FADE_OUT_MS) {
  if (id !== undefined && id !== currentId && id !== pendingId) return

  const a = audio
  const my = ++token
  const wasPending = pendingId !== null
  pendingId = null

  if (!a) return

  if (currentId === null) {
    // only a start request is in flight: cancel it
    if (wasPending) a.pause()
    return
  }

  setCurrent(null)
  fadeTo(0, fadeMs, () => {
    if (my === token) a.pause()
  })
}

/** Pause immediately when the tab is hidden. */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPreview()
  })
}

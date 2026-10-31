import { audioLevel } from './level'

interface Envelope {
  fps: number
  bass: Uint8Array
  kick: Uint8Array
}

const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

/**
 * Drives `audioLevel` from a pre-computed envelope (see scripts/make-envelope.mjs),
 * synced to `audio.currentTime`. It only READS the audio element — playback is never
 * touched — and works in every browser. If the envelope file is missing, nothing happens.
 *
 * `getGain` lets the caller scale the effect (e.g. with the fade volume).
 * Returns a function that stops everything.
 */
export function startAudioReactive(
  audio: HTMLAudioElement,
  trackUrl: string,
  getGain: () => number = () => 1,
): () => void {
  // Flashing visuals are a no-go for visitors who asked for reduced motion.
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return () => {}
  }

  let env: Envelope | null = null
  let raf = 0
  let stopped = false
  const LEAD = 0.04 // seconds: compensates for output latency so the hit feels on-beat

  fetch(trackUrl.replace(/\.[^./\\]+$/, '') + '.env.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (stopped || !j || j.v !== 1) return
      env = { fps: j.fps, bass: b64(j.bass), kick: b64(j.kick) }
    })
    .catch(() => {})

  const at = (a: Uint8Array, i: number) => a[Math.max(0, Math.min(a.length - 1, i))] / 255

  const tick = () => {
    raf = requestAnimationFrame(tick)
    let bass = 0
    let kick = 0
    if (env && !audio.paused && !document.hidden) {
      const x = (audio.currentTime + LEAD) * env.fps
      const i = Math.floor(x)
      const f = x - i
      bass = at(env.bass, i) * (1 - f) + at(env.bass, i + 1) * f
      kick = Math.max(at(env.kick, i), at(env.kick, i + 1) * f)
      const g = Math.max(0, Math.min(1, getGain()))
      bass *= g
      kick *= g
    }
    // fast attack, slower release → feels like a speaker cone, not a strobe
    audioLevel.bass += (bass - audioLevel.bass) * (bass > audioLevel.bass ? 0.5 : 0.1)
    audioLevel.kick = Math.max(kick, audioLevel.kick * 0.84)
  }
  raf = requestAnimationFrame(tick)

  return () => {
    stopped = true
    cancelAnimationFrame(raf)
    audioLevel.bass = 0
    audioLevel.kick = 0
  }
}

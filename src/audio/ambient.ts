import { useSyncExternalStore } from 'react'
import { AMBIENT, baseLevel, coverage, smooth } from './ambientLevel'
import { isDucked, isTakeover, onDuckChange, setTakeover } from './preview'
import { startAudioReactive } from './reactive'

/**
 * The site's background music.
 *
 * WHY THERE IS AN "UNLOCK" STEP
 * Browsers only let a page make sound after a real user gesture: a click, a tap or a key press.
 * Scrolling, swiping, hovering, moving the mouse (or the 3D character's eyes) do NOT count, and
 * nothing a page does by itself can get around it. So the music works in two parts:
 *
 *   1. UNLOCK — the first click / tap / key press ANYWHERE on the page (the character, a photo,
 *      Space or the arrow keys to scroll …) unlocks audio silently. It does not need to happen
 *      near the music: the volume stays at 0 until the scroll position asks for sound.
 *   2. VOLUME — from then on the scroll position drives the volume (see ambientLevel.ts).
 *
 * A visitor who only ever scrolls with a wheel or a swipe never makes a gesture, so a small
 * "Tap for sound" chip appears once they reach the About Me section (see SoundToggle.tsx).
 *
 * Volume goes through a Web Audio GainNode, not `audio.volume`: iPhones ignore `audio.volume`
 * (it is always 1), so fading with it would not work there.
 */

const TRACK_URL = `${import.meta.env.BASE_URL}hobbies/music/gallery-track.mp3`
const GESTURES = ['pointerup', 'touchend', 'click', 'keydown'] as const

// ───────── what the UI can read ─────────
export interface AmbientUI {
  /** audio is allowed (a real gesture has happened) */
  unlocked: boolean
  /** the visitor turned the music off */
  muted: boolean
  /** the scroll position is somewhere the music is meant to be heard */
  active: boolean
}

let ui: AmbientUI = { unlocked: false, muted: false, active: false }
const uiListeners = new Set<() => void>()

function setUI(patch: Partial<AmbientUI>) {
  const next = { ...ui, ...patch }
  if (next.unlocked === ui.unlocked && next.muted === ui.muted && next.active === ui.active) return
  ui = next
  uiListeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  uiListeners.add(listener)
  return () => uiListeners.delete(listener)
}

/** React hook for the sound chip / mute button. */
export function useAmbientUI(): AmbientUI {
  return useSyncExternalStore(subscribe, () => ui, () => ui)
}

// ───────── engine state ─────────
let running = false
let audio: HTMLAudioElement | null = null
let ctx: AudioContext | null = null
let gainNode: GainNode | null = null

let unlocked = false
let unlockedAt = 0
let muted = false
let firstPlay = true

let target = 0 // gain we are heading for
let cur = 0 // gain right now
let slowRise = false // coming back after the music page: fade in slowly
let stuckTicks = 0 // watchdog: how many checks in a row the audio context refused to run
let watchdog = 0

let raf = 0
let lastT = 0
let schedRaf = 0

// scroll direction + After Hours duck
let lastY = 0
let dir = 1
let inMusicZone = false
let duckArmed = false

// ───────── volume ─────────
function applyGain(v: number) {
  if (gainNode) gainNode.gain.value = v
  else if (audio) audio.volume = Math.min(1, Math.max(0, v)) // old browsers without Web Audio
}

function tick(now: number) {
  raf = 0
  const dt = Math.min(0.1, Math.max(0.001, (now - lastT) / 1000))
  lastT = now

  const goal = muted || !unlocked ? 0 : target
  const tau =
    goal > cur
      ? slowRise
        ? AMBIENT.resumeSeconds
        : AMBIENT.riseSeconds
      : isTakeover()
        ? AMBIENT.takeoverFallSeconds
        : AMBIENT.fallSeconds
  cur += (goal - cur) * (1 - Math.exp(-dt / tau))
  if (Math.abs(goal - cur) < 0.0003) cur = goal
  if (cur >= goal) slowRise = false
  applyGain(cur)

  if (cur !== goal) {
    raf = requestAnimationFrame(tick)
  } else if (goal === 0 && audio && !audio.paused) {
    audio.pause() // silent: no need to keep playing
  }
}

function kickFade() {
  if (raf) return
  lastT = performance.now()
  raf = requestAnimationFrame(tick)
}

/** Start / stop the <audio> element as the target says, and keep the fade running. */
function sync() {
  const a = audio
  if (!running || !a || !unlocked) return

  const audible = target > 0.0005 && !muted && !document.hidden
  if (audible) {
    if (firstPlay) {
      firstPlay = false
      try {
        a.currentTime = 0 // the song really starts when About Me is reached
      } catch {
        /* metadata not loaded yet: it is at the start anyway */
      }
    }
    if (a.paused) {
      a.play().catch((err: unknown) => {
        if ((err as { name?: string } | null)?.name === 'NotAllowedError') relock()
        // any other failure (AbortError from a pause that raced with this play, a hiccup while loading …)
        // is retried by the watchdog below instead of leaving the track silently stopped
      })
    }
  }
  kickFade()
}

// ───────── unlock ─────────
function ensureGraph(): boolean {
  if (ctx) return true
  if (!audio) return false
  const AC: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return false
  try {
    const c = new AC()
    const src = c.createMediaElementSource(audio)
    const g = c.createGain()
    g.gain.value = 0
    src.connect(g)
    g.connect(c.destination)
    ctx = c
    gainNode = g
    // iOS can suspend audio (a phone call, a locked screen): ask for a new gesture, or recover quietly
    c.onstatechange = () => {
      if (!running) return
      if (c.state === 'running') {
        if (!unlocked) tryUnlock()
      } else if (unlocked) {
        relock()
      }
    }
    return true
  } catch {
    ctx = null
    gainNode = null
    return false
  }
}

/**
 * Try to unlock audio. Call it from a click / tap / key handler: both calls below must start
 * synchronously inside the gesture (Safari is strict about that).
 * If the event was not a real gesture (e.g. the end of a swipe) the browser says no and we simply wait.
 */
export function unlockAmbient() {
  tryUnlock()
}

function tryUnlock() {
  const a = audio
  if (!running || unlocked || !a) return

  const hasGraph = ensureGraph()
  applyGain(cur)

  const resumed: Promise<unknown> = hasGraph && ctx && ctx.state !== 'running' ? ctx.resume() : Promise.resolve()
  const played = a.play()

  Promise.all([resumed, played])
    .then(() => {
      if (!running || unlocked) return
      if (ctx && ctx.state !== 'running') {
        a.pause()
        return
      }
      unlocked = true
      unlockedAt = performance.now()
      stopListeningForGesture()
      setUI({ unlocked: true })
      recompute() // plays or pauses as the scroll position says
    })
    .catch(() => {
      if (!unlocked) a.pause()
    })
}

function relock() {
  if (!unlocked) return
  unlocked = false
  setUI({ unlocked: false })
  listenForGesture()
}

const onGesture = () => tryUnlock()

function listenForGesture() {
  GESTURES.forEach((t) => window.addEventListener(t, onGesture, { capture: true, passive: true }))
}

function stopListeningForGesture() {
  GESTURES.forEach((t) => window.removeEventListener(t, onGesture, { capture: true }))
}

/** Mute / unmute (the small button). Before the unlock it unlocks instead. */
export function toggleAmbientMuted() {
  if (!running) return
  if (!unlocked) {
    tryUnlock()
    return
  }
  // the click that just unlocked the sound must not also mute it
  if (performance.now() - unlockedAt < 700) return
  muted = !muted
  setUI({ muted })
  recompute()
}

// ───────── scroll → volume ─────────
function recompute() {
  if (!running) return
  const vw = window.innerWidth
  const vh = window.innerHeight

  const y = window.scrollY
  if (y !== lastY) {
    dir = y > lastY ? 1 : -1
    lastY = y
  }

  const title = document.querySelector('.resume-title')
  const gallery = document.querySelector('.wk-gallery')
  const card = document.querySelector('.wk-card[data-music]')
  const bodies = Array.from(document.querySelectorAll('.tl-body'), (el) => el.getBoundingClientRect())

  const base = baseLevel({
    vw,
    vh,
    titleTop: title ? title.getBoundingClientRect().top : null,
    bodies,
    gallery: gallery ? gallery.getBoundingClientRect() : null,
  })

  // After Hours: lower the track, but only when you scroll INTO it (not when coming back from the last page).
  const frac = card ? coverage(card.getBoundingClientRect(), vw, vh) : 0
  const nowIn = frac > 0.12
  if (nowIn && !inMusicZone) duckArmed = dir > 0
  if (!nowIn) duckArmed = false
  inMusicZone = nowIn
  const duck = duckArmed ? smooth(0.2, 0.6, frac) : 0

  const level = base * (1 - duck * (1 - AMBIENT.afterHoursDuck))

  // A song played from the music page silences the background track, and it STAYS silent (even between
  // songs) until the visitor scrolls out of the music page — then it fades back in slowly.
  if (!nowIn && isTakeover()) {
    setTakeover(false, false) // (no notify: we are already recomputing)
    slowRise = true
  }
  if (isTakeover()) slowRise = false

  target = isDucked() || isTakeover() ? 0 : AMBIENT.normal * level
  setUI({ active: base > 0.12 })
  sync()
}

/**
 * Every 1.5 s, while the track is meant to be heard: make sure it really is playing.
 * It fixes the "sometimes there is no music" cases that nothing else retried:
 *   - a play() that was cancelled by a racing pause() (AbortError) left the track stopped until the next scroll
 *   - the audio file failed to load once and never came back
 *   - the browser suspended the audio context quietly: ask for it back, and if it keeps refusing,
 *     show the "Tap for sound" chip again instead of staying silent for ever
 */
function guard() {
  const a = audio
  if (!running || !a || !unlocked) return
  const wanted = target > 0.0005 && !muted && !document.hidden
  if (!wanted) {
    stuckTicks = 0
    return
  }
  if (ctx && ctx.state !== 'running') {
    void ctx.resume().catch(() => {})
    if (++stuckTicks >= 3) {
      stuckTicks = 0
      relock()
    }
    return
  }
  stuckTicks = 0
  if (a.error) a.load() // reload a file that failed
  sync() // plays it again if something paused it
}

function schedule() {
  if (schedRaf) return
  schedRaf = requestAnimationFrame(() => {
    schedRaf = 0
    recompute()
  })
}

/** Start the background music. Returns a function that stops it (for React's effect cleanup). */
export function startAmbientMusic(): () => void {
  if (typeof window === 'undefined' || running) return () => {}

  running = true
  firstPlay = true
  lastY = window.scrollY

  audio = new Audio(TRACK_URL)
  audio.loop = true
  audio.preload = 'none'

  // the 3D scene pulses with the music (it only reads the playback position)
  const stopReactive = startAudioReactive(
    audio,
    new URL(TRACK_URL, document.baseURI).href,
    () => cur / AMBIENT.normal,
  )

  const onVisibility = () => {
    if (document.hidden) {
      audio?.pause()
      cur = 0 // come back with a gentle fade-in instead of a jump
      applyGain(0)
    } else {
      if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {})
      recompute()
    }
  }

  // If the browser / phone / another app pauses the track while it should be heard, start it again.
  const onPaused = () => {
    if (running && unlocked && !document.hidden) schedule()
  }
  // The file failed to load (flaky network): the watchdog reloads it.
  const onError = () => {
    window.setTimeout(guard, 1500)
  }
  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted) recompute()
  }
  audio.addEventListener('pause', onPaused)
  audio.addEventListener('error', onError)
  window.addEventListener('pageshow', onPageShow)
  watchdog = window.setInterval(guard, 1500)

  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
  window.addEventListener('load', schedule)
  document.addEventListener('visibilitychange', onVisibility)
  const stopDuckWatch = onDuckChange(recompute)
  listenForGesture()

  recompute()
  const late = window.setTimeout(recompute, 1500) // after fonts / images shift the layout

  return () => {
    running = false
    window.clearTimeout(late)
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    window.removeEventListener('load', schedule)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pageshow', onPageShow)
    window.clearInterval(watchdog)
    watchdog = 0
    audio?.removeEventListener('pause', onPaused)
    audio?.removeEventListener('error', onError)
    stopListeningForGesture()
    stopDuckWatch()
    stopReactive()
    cancelAnimationFrame(raf)
    cancelAnimationFrame(schedRaf)
    raf = 0
    schedRaf = 0

    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    if (ctx) {
      ctx.onstatechange = null
      void ctx.close().catch(() => {})
    }
    audio = null
    ctx = null
    gainNode = null
    unlocked = false
    muted = false
    target = 0
    cur = 0
    slowRise = false
    stuckTicks = 0
    setTakeover(false, false)
    inMusicZone = false
    duckArmed = false
    setUI({ unlocked: false, muted: false, active: false })
  }
}

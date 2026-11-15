import { useSyncExternalStore } from 'react'

/**
 * How the visitor is pointing right now:
 *   'mouse' — mouse / trackpad / pen: it can hover, so a song can play on hover
 *   'touch' — a finger: it can only tap
 *
 * It starts from a best guess (CSS media queries) and then follows the real thing:
 * the type of the latest pointer event wins. So a phone says "Tap", a laptop says "Hover",
 * and a touch-screen laptop switches the moment the visitor changes how they point.
 */
export type InputMode = 'mouse' | 'touch'

const hasWindow = typeof window !== 'undefined'

function guess(): InputMode {
  if (!hasWindow || !window.matchMedia) return 'mouse'
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const narrowTouch = window.innerWidth <= 640 && navigator.maxTouchPoints > 0
  // "Tap" is true everywhere (a click works too), so when in doubt say Tap.
  return canHover && !narrowTouch ? 'mouse' : 'touch'
}

let mode: InputMode = guess()
const listeners = new Set<() => void>()

function setMode(next: InputMode) {
  if (next === mode) return
  mode = next
  listeners.forEach((l) => l())
}

if (hasWindow) {
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType === 'touch') setMode('touch')
    else if (e.pointerType === 'mouse' || e.pointerType === 'pen') setMode('mouse')
  }
  window.addEventListener('pointerdown', onPointer, { passive: true, capture: true })
  window.addEventListener('pointermove', onPointer, { passive: true, capture: true })

  // DevTools device mode / plugging in a mouse changes what the device reports
  window
    .matchMedia?.('(hover: hover) and (pointer: fine)')
    .addEventListener?.('change', () => setMode(guess()))
}

export const getInputMode = (): InputMode => mode

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** React hook: 'mouse' or 'touch', updates live. */
export function useInputMode(): InputMode {
  return useSyncExternalStore(subscribe, () => mode, () => 'mouse' as InputMode)
}

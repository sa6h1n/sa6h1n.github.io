// "My Music" opened over the site: no page reload, so the site keeps its place and comes back
// instantly. Mounted once in App.tsx; the link in Works.tsx opens it (see nav.ts).
import { Suspense, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'framer-motion'
import { useStore } from '../store'
import MusicStage from './MusicStage'
import { MusicPage } from './lazy'
import { closeMusicPage, type Origin } from './nav'

const screenCentre = (): Origin => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 })

export default function MusicOverlay() {
  const open = useStore((s) => s.musicOpen)
  const origin = useStore((s) => s.musicOrigin)
  const setCovered = useStore((s) => s.setMusicCovered)
  const opener = useRef<HTMLElement | null>(null)

  // The browser's Back / Forward buttons open and close the page (with the animation)
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = useStore.getState()
      if (e.state?.music) {
        if (!s.musicOpen) s.openMusic(screenCentre())
      } else if (s.musicOpen) {
        s.closeMusic()
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // While the page is open, the site behind it can't be tabbed into or read out by a screen reader.
  // (`inert` is also removed again when the closing animation has finished.)
  useEffect(() => {
    if (!open) return
    opener.current = document.activeElement as HTMLElement | null
    document.getElementById('root')?.setAttribute('inert', '')
  }, [open])

  const afterClose = () => {
    document.getElementById('root')?.removeAttribute('inert')
    // keyboard users land back on the "My Music" link they pressed
    opener.current?.focus({ preventScroll: true })
    opener.current = null
  }

  return createPortal(
    <AnimatePresence onExitComplete={afterClose}>
      {open && (
        <MusicStage
          key="music"
          origin={origin}
          onCovered={() => {
            if (useStore.getState().musicOpen) setCovered(true)
          }}
        >
          <Suspense fallback={null}>
            <MusicPage onBack={closeMusicPage} />
          </Suspense>
        </MusicStage>
      )}
    </AnimatePresence>,
    document.body,
  )
}

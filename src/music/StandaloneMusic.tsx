// The music page opened on its own (someone visits /?page=music directly, or refreshes on it).
// The 3D site is NOT loaded here — so "Back" plays the closing animation and then loads the site.
import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import './standalone.css'
import MusicStage from './MusicStage'
import MusicPage from './MusicPage'
import type { Origin } from './nav'

export default function StandaloneMusic() {
  const [open, setOpen] = useState(true)
  // grows from the middle of the screen and shrinks back into it (an exiting page keeps the props it
  // had, so the opening and closing circle share one centre)
  const origin = useMemo<Origin>(
    () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }),
    [],
  )

  const goBack = () => setOpen(false)

  return (
    <AnimatePresence
      onExitComplete={() => window.location.assign(new URL(import.meta.env.BASE_URL, window.location.href))}
    >
      {open && (
        <MusicStage key="music" origin={origin}>
          <MusicPage onBack={goBack} />
        </MusicStage>
      )}
    </AnimatePresence>
  )
}

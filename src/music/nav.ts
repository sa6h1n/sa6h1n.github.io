// Opening and closing the "My Music" page from inside the site.
// It also pushes a history entry, so the browser's Back button closes the page (with the animation)
// instead of leaving the site, and so the address bar shows /?page=music (a link that can be shared).
import { useStore } from '../store'

export interface Origin {
  x: number
  y: number
}

export function openMusicPage(origin: Origin) {
  if (useStore.getState().musicOpen) return
  const url = new URL(window.location.href)
  url.searchParams.set('page', 'music')
  window.history.pushState({ music: true }, '', url)
  useStore.getState().openMusic(origin)
}

export function closeMusicPage() {
  if (!useStore.getState().musicOpen) return
  if (window.history.state?.music) {
    // going back fires "popstate", which MusicOverlay answers by playing the closing animation
    window.history.back()
  } else {
    useStore.getState().closeMusic()
  }
}

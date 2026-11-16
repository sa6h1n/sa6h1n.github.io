// Two pages share this one entry file:
//   /            → the 3D portfolio
//   /?page=music → the "My Music" page on its own (playlists and albums). From inside the site the page
//                  opens over it instead, with an animation (see music/MusicOverlay.tsx).
// Each page loads only its own code and styles, so the music page never pulls in the 3D scene
// (and the portfolio's global styles never touch the music page).
import { createRoot } from 'react-dom/client'

const el = document.getElementById('root')!
const wantsMusic = new URLSearchParams(window.location.search).get('page') === 'music'

if (wantsMusic) {
  void import('./music/StandaloneMusic').then(({ default: StandaloneMusic }) => {
    createRoot(el).render(<StandaloneMusic />)
  })
} else {
  void import('./mountSite').then(({ mountSite }) => mountSite(el))
}

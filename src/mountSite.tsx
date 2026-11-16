// The 3D portfolio — exactly what main.tsx used to do, now loaded only on the main page.
// (The CSS import order below matters: later files override earlier ones.)
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './enhance.css'
import './gallery.css'
import { spinFavicon } from './ui/spinFavicon'

export function mountSite(el: HTMLElement) {
  createRoot(el).render(<App />)
  spinFavicon()
}

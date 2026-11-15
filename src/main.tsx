import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './enhance.css'
import './gallery.css'
import { spinFavicon } from './ui/spinFavicon'

createRoot(document.getElementById('root')!).render(<App />)

spinFavicon()

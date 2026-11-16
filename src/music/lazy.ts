// The music page is a separate chunk: visitors who never click "My Music" never download it.
// `preloadMusic()` is called when the link is hovered / focused / touched, so by the time it is
// clicked the page is usually already there and the animation opens straight onto it.
import { lazy } from 'react'

const load = () => import('./MusicPage')

export const MusicPage = lazy(load)
export const preloadMusic = () => {
  void load()
}

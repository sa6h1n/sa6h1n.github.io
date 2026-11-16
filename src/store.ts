import { create } from 'zustand'

// 全站交互状态：当前展开的领域 / 悬停的领域 / 是否已进入
interface StoreState {
  active: string | null // 当前展开的 domain id（null = 总览）
  hovered: string | null // 悬停的 domain id
  entered: boolean // 是否已通过入场
  setActive: (id: string | null) => void
  setHovered: (id: string | null) => void
  enter: () => void
  // "My Music" page: opens over the site (no page reload) with a circle that grows from the link
  musicOpen: boolean
  musicOrigin: { x: number; y: number } // where the circle grows from / shrinks back to
  musicCovered: boolean // the music page fully hides the site (so the 3D scene can pause)
  openMusic: (origin: { x: number; y: number }) => void
  closeMusic: () => void
  setMusicCovered: (v: boolean) => void
}

export const useStore = create<StoreState>((set) => ({
  active: null,
  hovered: null,
  entered: false,
  setActive: (id) => set({ active: id }),
  setHovered: (id) => set({ hovered: id }),
  enter: () => set({ entered: true }),
  musicOpen: false,
  musicOrigin: { x: 0, y: 0 },
  musicCovered: false,
  openMusic: (origin) => set({ musicOpen: true, musicOrigin: origin, musicCovered: false }),
  closeMusic: () => set({ musicOpen: false, musicCovered: false }),
  setMusicCovered: (v) => set({ musicCovered: v }),
}))

// 开发期调试钩子：可在 console 用 __store.getState().setActive('ads')
declare global {
  interface Window {
    __store?: typeof useStore
  }
}
if (import.meta.env.DEV) window.__store = useStore

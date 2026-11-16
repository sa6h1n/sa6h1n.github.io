import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 打包后资源用相对路径（dist/index.html 引用 ./assets/...，可放任意子目录/直接打开）
  base: './',
  plugins: [react()],
  // two pages: the main site (index.html) and the "My Music" page (music.html)
  build: {
    rollupOptions: {
      input: { main: 'index.html', music: 'music.html' },
    },
  },
  server: { host: true, port: 5173 },
})

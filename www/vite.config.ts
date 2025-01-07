import { fileURLToPath, URL } from 'url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../nginx/ssl/privkey.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../nginx/ssl/cert.pem')),
    },
    host: 'unkaos.local',
    port: 3000
  },
  build: {
    target: 'esnext'
  }
})

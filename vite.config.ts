/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  // 子路徑部署（GitHub Pages 等）：BASE_PATH=/repo-name/ npm run build
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    // DeviceMotion 需要 secure context：`npm run dev:https` 供手機經區網實測
    ...(process.env.HTTPS_DEV ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fonts/*.woff2', 'icons/*.svg'],
      manifest: {
        name: 'Shake Badge 搖搖名牌',
        short_name: '搖搖名牌',
        description: '把手機變成電子名牌，搖一搖讓照片蹦蹦跳跳。所有資料只儲存在你的裝置上。',
        lang: 'zh-Hant',
        display: 'standalone',
        orientation: 'any',
        // 相對於 manifest 位置解析 → 根路徑與子路徑（GitHub Pages）部署都正確
        start_url: '.',
        scope: '.',
        theme_color: '#12152a',
        background_color: '#12152a',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,png,webmanifest}'],
        navigateFallback: 'index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    css: false,
  },
})

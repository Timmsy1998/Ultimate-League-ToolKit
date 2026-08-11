import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  // No externalizeDepsPlugin here, and preload/index.ts has no npm-package
  // imports at all: with sandbox: true (see src/main/index.ts), Electron's
  // sandboxed preload require() can't resolve node_modules packages, and
  // Vite's default SSR build externalizes them by default regardless of
  // this plugin. If preload ever needs a dependency, it has to be small
  // enough to hand-roll here, or the sandbox trade-off needs revisiting.
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})

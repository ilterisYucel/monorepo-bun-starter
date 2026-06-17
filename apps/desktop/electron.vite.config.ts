import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main'
    }
  },
  preload: {
    build: {
      outDir: 'out/preload'
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@gd-monorepo/shared-types': resolve('../../packages/shared-types/src'),
        '@gd-monorepo/shared-utils': resolve('../../packages/shared-utils/src'),
        '@gd-monorepo/ui': resolve('../../packages/ui/src'),
        '@gd-monorepo/web': resolve('../../apps/web/src')
      }
    },
    plugins: [react()],
    build: {
      outDir: 'out/renderer'
    }
  }
})

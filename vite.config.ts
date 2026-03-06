import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // VitePWA removed: injectRegister: null + filename: 'sw-workbox.js' generated dead code.
    // Service worker is manually registered in main.tsx using public/sw.js.
  ],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    hmr: {
      protocol: 'ws',
    },
    // Proxy API requests to backend
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) return 'vendor-react';
          if (id.includes('node_modules/@tanstack')) return 'vendor-query';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/lucide-react')) return 'vendor-ui';
          if (id.includes('node_modules/socket.io')) return 'vendor-socket';
          if (id.includes('node_modules/zod') || id.includes('node_modules/zustand')) return 'vendor-state';
        },
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require('./package.json') as { version: string };

// https://vite.dev/config/
export default defineConfig({
  // Inject package.json version as VITE_APP_VERSION for RegulatoryFooter (MDR §11.2)
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    // Bundle analyzer (only when ANALYZE env var is set)
    process.env.ANALYZE === 'true' && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
    // VitePWA removed: injectRegister: null + filename: 'sw-workbox.js' generated dead code.
    // Service worker is manually registered in main.tsx using public/sw.js.
  ].filter(Boolean),
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
    chunkSizeWarningLimit: 1000, // Reduced from 1500KB
    rollupOptions: {
      output: {
        // Optimized manual chunks for better caching and parallel loading
        manualChunks(id: string) {
          // React Core - most stable, cached longest
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          
          // Router - stable
          if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run')) {
            return 'vendor-router';
          }
          
          // Data fetching - TanStack Query
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-query';
          }
          
          // State management
          if (id.includes('node_modules/zustand') || id.includes('node_modules/zod')) {
            return 'vendor-state';
          }
          
          // i18n - large but necessary
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
            return 'vendor-i18n';
          }
          
          // Icons - lucide-react (tree-shaken per component)
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          
          // Charts - heavy visualization library
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }
          
          // Realtime - Socket.IO
          if (id.includes('node_modules/socket.io')) {
            return 'vendor-socket';
          }
          
          // Animations - Lottie only (framer-motion removed - unused)
          if (id.includes('node_modules/lottie-react')) {
            return 'vendor-animation';
          }
          
          // Signature and forms
          if (id.includes('node_modules/signature_pad') || id.includes('node_modules/react-hook-form')) {
            return 'vendor-forms';
          }
          
          // QR Code libraries - split for better loading
          // qrcode.react is used for QR generation (lightweight)
          if (id.includes('node_modules/qrcode.react')) {
            return 'vendor-qr-generator';
          }
          // html5-qrcode is used for QR scanning (heavy, camera-based)
          if (id.includes('node_modules/html5-qrcode')) {
            return 'vendor-qr-scanner';
          }
          
          // Markdown rendering
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark')) {
            return 'vendor-markdown';
          }
          
          // OCR - HEAVY: Tesseract.js (~20MB)
          // This is loaded on-demand only when scanner components are used
          if (id.includes('node_modules/tesseract.js')) {
            return 'vendor-ocr';
          }
          
          // Drag and drop
          if (id.includes('node_modules/@dnd-kit')) {
            return 'vendor-dnd';
          }
          
          // Date handling
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-date';
          }
          
          // Feature-based chunks for app code
          // Auth features
          if (id.includes('/src/pages/ArztDashboard') || id.includes('/src/hooks/useStaffApi')) {
            return 'feature-staff';
          }
          
          // Admin dashboard shell only — every sub-tab/panel/editor falls
          // through so Rolldown emits per-chunk lazy files. Keeps first-paint
          // admin chunk small; heavy editors only load when the tab opens.
          if (id.includes('/src/pages/AdminDashboard')) {
            return 'feature-admin';
          }

          // MFA dashboard shell only. MfaChatInterface stays in feature-mfa
          // because it loads on every MFA route, but other MFA-adjacent heavy
          // components should fall through to their own chunks.
          if (id.includes('/src/pages/MFADashboard') || id.includes('/src/components/chat/MfaChatInterface')) {
            return 'feature-mfa';
          }
          
          // PWA Patient features
          if (id.includes('/src/pages/pwa/')) {
            return 'feature-pwa';
          }
          
          // Therapy features
          if (id.includes('/src/components/therapy/')) {
            return 'feature-therapy';
          }
          
          // Telemedicine features
          if (id.includes('/src/pages/telemedizin/')) {
            return 'feature-telemed';
          }
        },
        // Ensure smaller chunk files for better caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    // Target modern browsers — eliminates legacy polyfills (~10-15 KB savings)
    // Chrome 90+, Firefox 88+, Safari 14+ (covers >95% of 2024-2026 traffic)
    target: ['es2020', 'chrome90', 'safari14'],
    // Minification options for smaller bundles
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.* in production
        drop_debugger: true, // Remove debugger statements
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove these function calls
        passes: 2, // Multiple passes for better optimization
      },
      mangle: {
        safari10: true, // Fix for Safari 10/11
      },
      format: {
        comments: false, // Remove all comments
      },
    },
    // CSS optimization
    cssMinify: 'lightningcss',
    cssCodeSplit: true,
    // Source maps for production debugging (optional, can be disabled for smaller deploy)
    sourcemap: false,
  },
  // Optimize dependencies for dev and build
  optimizeDeps: {
    exclude: ['tesseract.js'], // Exclude heavy OCR lib from pre-bundling
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'zustand',
      'i18next',
      'react-i18next',
      'lucide-react',
      'socket.io-client',
    ],
  },
})

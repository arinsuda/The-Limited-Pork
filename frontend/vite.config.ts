/// <reference types="vitest/config" />
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:8080';
  const devPort = Number(env.VITE_DEV_PORT || 5173);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      port: devPort,
      strictPort: false,
      proxy: {
        // Same-origin proxy so the httpOnly refresh cookie (path /api/v1/auth) works in dev.
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
        },
        '/ws': {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    preview: {
      port: devPort,
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true, ws: true },
        '/ws': { target: proxyTarget, changeOrigin: true, ws: true },
      },
    },
    build: {
      sourcemap: mode !== 'production',
      chunkSizeWarningLimit: 900,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});

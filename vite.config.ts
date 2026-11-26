import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const backend = loadEnv(mode, process.cwd(), 'BACKEND_').BACKEND_PROXY_TARGET;
  return {
    plugins: [react()],
    server: {
      proxy: backend
        ? {
            '/health': { target: backend, changeOrigin: true },
            '/api/v1': { target: backend, changeOrigin: true },
            '/body-shapes': { target: backend, changeOrigin: true },
            '^/images/(?!body/)': { target: backend, changeOrigin: true },
          }
        : undefined,
    },
  };
});

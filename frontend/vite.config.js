import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * Front end only. The Python backend (../backend) serves the built files in
 * dist/ together with the API, so in normal use everything runs at one address:
 * http://localhost:8000.
 *
 * `npm run dev` is for working on the front end with instant reload: Vite runs
 * on :5173 and forwards /api/... to the backend on :8000.
 */
const proxy = { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true } };

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
  server: { proxy },
  preview: { proxy },
});

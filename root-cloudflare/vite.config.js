import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 개발(5173)에서는 /api 를 backend(:5000)로 프록시해 동일 오리진처럼 동작하게 한다.
// 빌드 결과(dist/)는 backend/server.js 가 정적 루트로 직접 서빙한다.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/health': 'http://localhost:5000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});

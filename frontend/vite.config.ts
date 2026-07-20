import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rawApiUrl = env.VITE_API_URL?.trim();
  const backendTarget = rawApiUrl && /^https?:\/\//.test(rawApiUrl)
    ? rawApiUrl.replace(/\/api\/v1\/?$/, '')
    : 'http://localhost:5000';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/v1': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});

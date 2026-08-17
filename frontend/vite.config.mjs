import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const backendProxy = { target: 'http://localhost:3002', changeOrigin: true };
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'CRM-Juridico';
const publicBase = process.env.GITHUB_PAGES === 'true' ? `/${repositoryName}/` : '/';

export default defineConfig({
  base: publicBase,
  plugins: [tailwindcss(), react()],
  server: {
    port: 5174,
    proxy: {
      '/api': backendProxy,
      '/uploads': backendProxy,
      '/socket.io': { ...backendProxy, ws: true },
    },
  },
  preview: { port: 4174 },
});

import { qwikVite } from '@builder.io/qwik/optimizer';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [qwikVite(), tsconfigPaths()],
  server: {
    host: '127.0.0.1',
    port: 5175,
    proxy: {
      '/api': 'http://127.0.0.1:3000'
    }
  },
  preview: {
    host: '127.0.0.1',
    port: 4175
  }
});

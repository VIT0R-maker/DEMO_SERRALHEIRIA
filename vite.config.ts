import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  // GitHub Pages project paths are case-sensitive; keep local development at /.
  base: command === 'build' || isPreview ? '/DEMO_SERRALHEIRIA/' : '/',
}));

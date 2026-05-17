import { defineConfig } from 'vitest/config';
import path from 'path';
import { loadEnv } from 'vite';

const env = loadEnv('test', path.resolve(__dirname), '');

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    testTimeout: 10000,
    hookTimeout: 10000,
    env: {
      ...env,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});

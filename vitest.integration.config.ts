import { defineConfig } from 'vitest/config';

// Config aparte para las pruebas de integración (corren en Node contra el emulador).
// Las unitarias siguen con `ng test`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.integration.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});

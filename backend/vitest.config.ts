import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: ['./tests/globalSetup.ts'],
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false,
    hookTimeout: 120000,
    testTimeout: 30000,
    coverage: {
      include: ['src/**/*.ts', 'prisma/seed-data.ts'],
      exclude: ['prisma/seed.ts'],
    },
  },
});

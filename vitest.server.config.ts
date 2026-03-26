import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'e2e', 'server/test/**/*'],
    setupFiles: ['./server/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      include: ['server/**/*.ts'],
      exclude: [
        'node_modules',
        'dist',
        'e2e',
        '**/*.test.ts',
        'server/index.ts',
        'server/test/**/*',
        'server/types/**/*',
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
});

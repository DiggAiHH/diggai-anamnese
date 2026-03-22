import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['server/**/*.ts', 'src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'node_modules',
        'dist',
        'e2e',
        '**/*.test.ts',
        '**/*.test.tsx',
        'server/index.ts',
        'src/main.tsx',
        'src/App.tsx',
      ],
    },
  },
});

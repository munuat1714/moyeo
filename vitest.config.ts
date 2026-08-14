import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'worker/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/vinext.d.ts'],
      reporter: ['text', 'html'],
    },
  },
})

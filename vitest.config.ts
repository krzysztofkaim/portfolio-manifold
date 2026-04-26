import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core',
          environment: 'node',
          include: [
            'tests/unit/**/*.test.ts',
            'tests/snapshot/**/*.test.ts'
          ]
        }
      },
      {
        test: {
          name: 'dom',
          environment: 'happy-dom',
          include: [
            'tests/integration/**/*.test.ts',
            'tests/performance/**/*.test.ts'
          ],
          setupFiles: ['tests/setup/happy-dom.ts']
        }
      }
    ]
  }
});

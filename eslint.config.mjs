import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// Phase 0: lint covers the server and the shared packages only.
// apps/mobile keeps its existing checks (tsc + expo-doctor) until the
// Phase 1 refactor; adding React Native linting here is a follow-up.
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', 'apps/mobile/**'],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['apps/server/**/*.ts', 'packages/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off', // We use console for logging
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'database/**/*.db', 'database/**/*.db-shm', 'database/**/*.db-wal'],
  }
);

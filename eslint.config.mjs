import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Tests mock modules with require(), and config files are CommonJS
    files: ['__tests__/**', 'jest.config.js', 'jest.setup.js', '*.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', '.claude/**', 'terraform/**']),
]);

export default eslintConfig;

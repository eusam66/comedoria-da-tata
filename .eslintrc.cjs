module.exports = {
  root: true,
  extends: ['next', 'next/core-web-vitals', 'eslint:recommended'],
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['.next/', 'node_modules/', 'public/workbox-*.js'],
  overrides: [
    { files: ['public/sw.js'], env: { serviceworker: true } },
    { files: ['*.cjs', 'scripts/*.js', 'scripts/*.cjs'], env: { node: true, es2022: true } },
    { files: ['**/*.ts', '**/*.tsx'], rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    } },
  ],
  rules: {
    'no-unused-vars': ['warn']
  }
};

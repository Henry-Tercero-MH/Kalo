import base from '@kalo/config/eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  ...base,
  { ignores: ['.expo/**', 'android/**', 'ios/**', 'dist-web/**', 'dist-enlace/**', 'public/**', '*.config.js', 'scripts/**'] },
  {
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' },
  },
];

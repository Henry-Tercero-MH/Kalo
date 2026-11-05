import base from '@kalo/config/eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Tamaño máximo de archivo, sin contar líneas en blanco ni comentarios (ver README,
 * «Organización»). Una página solo arma la vista: lo demás va en `_componentes/` del módulo.
 */
const maxLineas = (max) => ['error', { max, skipBlankLines: true, skipComments: true }];

export default [
  ...base,
  { ignores: ['.next/**', 'next-env.d.ts', 'public/**'] },
  {
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' },
  },
  // Componentes y lógica: 250 líneas.
  { files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'], rules: { 'max-lines': maxLineas(250) } },
  // Páginas y layouts: 150 líneas.
  { files: ['app/**/page.tsx', 'app/**/layout.tsx'], rules: { 'max-lines': maxLineas(150) } },
  // El simulador de la API del modo demo no es código de la app.
  { files: ['src/mock/**'], rules: { 'max-lines': 'off' } },
  // Solo Icono.tsx importa la librería de íconos: así todo ícono usa el mismo tamaño y trazo.
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: ['src/componentes/Icono.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'lucide-react', message: 'Use el componente Icono (@/componentes/Icono).' },
          ],
        },
      ],
    },
  },
];

import plugin from 'tailwindcss/plugin';
import uiThemePlugin from './theme.tailwind';
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './app/**/*.{js,ts,jsx,tsx}', './app/components/ui/*.tsx'],
  plugins: [
    uiThemePlugin,
    plugin(({ addVariant }) => {
      addVariant('has-checked', '&:has(:checked)');
    }),
  ],
};

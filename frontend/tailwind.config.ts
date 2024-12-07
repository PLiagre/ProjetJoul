import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Couleurs personnalisées pour le thème JOUL
        primary: {
          DEFAULT: '#10B981', // Vert émeraude pour l'énergie verte
          dark: '#059669',
          light: '#34D399',
        },
        secondary: {
          DEFAULT: '#6366F1', // Indigo pour les éléments secondaires
          dark: '#4F46E5',
          light: '#818CF8',
        },
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        dark: {
          ...require('daisyui/src/theming/themes')['dark'],
          primary: '#10B981',
          secondary: '#6366F1',
          accent: '#F59E0B',
          neutral: '#1F2937',
          'base-100': '#111827',
          'base-200': '#1F2937',
          'base-300': '#374151',
        },
      },
    ],
  },
}

export default config

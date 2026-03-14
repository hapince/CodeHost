import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        foreground: '#000000',
        muted: '#F5F5F5',
        'muted-foreground': '#525252',
        accent: '#000000',
        'accent-foreground': '#FFFFFF',
        border: '#000000',
        'border-light': '#E5E5E5',
        card: '#FFFFFF',
        'card-foreground': '#000000',
        ring: '#000000',
        destructive: '#000000',
        'destructive-foreground': '#FFFFFF',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Source Serif 4"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '9xl': '10rem',
        '8xl': '8rem',
      },
      letterSpacing: {
        tightest: '-0.05em',
      },
      borderRadius: {
        none: '0px',
      },
      borderWidth: {
        '3': '3px',
        '6': '6px',
        '8': '8px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 100ms ease-out',
        'slide-in': 'slide-in 100ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;

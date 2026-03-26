import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  preflight: false,
  jsxFramework: 'preact',
  include: ['./src/**/*.{ts,tsx}'],
  outdir: 'styled-system',

  conditions: {
    light: '[data-theme="light"] &',
    dark: '[data-theme="dark"] &',
  },

  theme: {
    tokens: {
      colors: {
        neutral: {
          50: { value: '#f9fafb' },
          100: { value: '#f3f4f6' },
          200: { value: '#e5e7eb' },
          300: { value: '#d1d5db' },
          400: { value: '#9ca3af' },
          500: { value: '#6b7280' },
          600: { value: '#4b5563' },
          700: { value: '#282c34' },
          800: { value: '#1c1f26' },
          900: { value: '#14161b' },
          950: { value: '#0e1015' },
        },
        // Muted pastels — dark mode defaults
        accent: { value: '#5eead4' },
        green: { value: '#6ee7b7' },
        yellow: { value: '#fcd34d' },
        red: { value: '#fca5a5' },
        blue: { value: '#93c5fd' },
        orange: { value: '#fdba74' },
        purple: { value: '#c4b5fd' },
        white: { value: '#f9fafb' },
      },
      fonts: {
        mono: { value: "'SF Mono', 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace" },
        sans: { value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" },
      },
      fontSizes: {
        xs: { value: '10px' },
        sm: { value: '11px' },
        md: { value: '12px' },
        lg: { value: '13px' },
        xl: { value: '14px' },
        '2xl': { value: '16px' },
        '3xl': { value: '20px' },
      },
      spacing: {
        0: { value: '0' },
        0.5: { value: '2px' },
        1: { value: '4px' },
        1.5: { value: '6px' },
        2: { value: '8px' },
        3: { value: '12px' },
        4: { value: '16px' },
        5: { value: '20px' },
        6: { value: '24px' },
        8: { value: '32px' },
      },
      radii: {
        sm: { value: '4px' },
        md: { value: '6px' },
        lg: { value: '8px' },
        xl: { value: '12px' },
        full: { value: '9999px' },
      },
      zIndex: {
        base: { value: '0' },
        sticky: { value: '10' },
        dropdown: { value: '50' },
        overlay: { value: '100' },
        modal: { value: '200' },
        toast: { value: '300' },
      },
    },
    semanticTokens: {
      colors: {
        surface: {
          bg: {
            value: { base: '{colors.neutral.950}', _light: '#ededeb' },
          },
          panel: {
            value: { base: '{colors.neutral.900}', _light: '#f5f4f2' },
          },
          hover: {
            value: { base: '{colors.neutral.800}', _light: '#e4e3e0' },
          },
          raised: {
            value: { base: '{colors.neutral.700}', _light: '#ebeae8' },
          },
        },
        border: {
          subtle: {
            value: { base: 'rgba(255,255,255,0.06)', _light: 'rgba(0,0,0,0.08)' },
          },
          strong: {
            value: { base: 'rgba(255,255,255,0.12)', _light: 'rgba(0,0,0,0.14)' },
          },
        },
        fg: {
          DEFAULT: {
            value: { base: '{colors.neutral.300}', _light: '{colors.neutral.600}' },
          },
          dim: {
            value: { base: '{colors.neutral.500}', _light: '{colors.neutral.400}' },
          },
          bright: {
            value: { base: '{colors.white}', _light: '{colors.neutral.950}' },
          },
        },
        // Status colors — muted pastels on dark, saturated on light
        accent: {
          value: { base: '{colors.accent}', _light: '#0d9488' },
        },
        green: {
          value: { base: '{colors.green}', _light: '#16a34a' },
        },
        yellow: {
          value: { base: '{colors.yellow}', _light: '#b45309' },
        },
        red: {
          value: { base: '{colors.red}', _light: '#dc2626' },
        },
        blue: {
          value: { base: '{colors.blue}', _light: '#2563eb' },
        },
        orange: {
          value: { base: '{colors.orange}', _light: '#c2410c' },
        },
        purple: {
          value: { base: '{colors.purple}', _light: '#7c3aed' },
        },
      },
    },
  },
});

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
          50: { value: '#fafafa' },
          100: { value: '#f5f5f5' },
          200: { value: '#e5e5e5' },
          300: { value: '#d4d4d4' },
          400: { value: '#a3a3a3' },
          500: { value: '#737373' },
          600: { value: '#525252' },
          700: { value: '#2a2a2a' },
          800: { value: '#1a1a1a' },
          900: { value: '#0f0f0f' },
          950: { value: '#0a0a0a' },
        },
        // Accent: teal — not error-associated, distinct from status colors
        accent: { value: '#2dd4bf' },
        green: { value: '#22c55e' },
        yellow: { value: '#eab308' },
        red: { value: '#ef4444' },
        blue: { value: '#60a5fa' },
        orange: { value: '#f97316' },
        purple: { value: '#a78bfa' },
        white: { value: '#fff' },
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
            value: { base: '{colors.neutral.950}', _light: '{colors.neutral.100}' },
          },
          panel: {
            value: { base: '{colors.neutral.900}', _light: '{colors.white}' },
          },
          hover: {
            value: { base: '{colors.neutral.800}', _light: '{colors.neutral.200}' },
          },
          raised: {
            value: { base: '{colors.neutral.700}', _light: '{colors.neutral.50}' },
          },
        },
        border: {
          subtle: {
            value: { base: 'rgba(255,255,255,0.08)', _light: '{colors.neutral.200}' },
          },
          strong: {
            value: { base: 'rgba(255,255,255,0.15)', _light: '{colors.neutral.300}' },
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
      },
    },
  },
});

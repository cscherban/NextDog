import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  preflight: false,
  jsxFramework: 'preact',
  include: ['./src/**/*.{ts,tsx}'],
  outdir: 'styled-system',

  theme: {
    tokens: {
      colors: {
        // Base palette
        neutral: {
          50: { value: '#fafafa' },
          100: { value: '#f5f5f5' },
          200: { value: '#eaeaea' },
          300: { value: '#ddd' },
          400: { value: '#888' },
          500: { value: '#777' },
          600: { value: '#333' },
          700: { value: '#2a2a2a' },
          800: { value: '#1e1e1e' },
          900: { value: '#121212' },
          950: { value: '#111' },
        },
        accent: { value: '#e74c3c' },
        green: { value: '#00b894' },
        yellow: { value: '#fdcb6e' },
        red: { value: '#e17055' },
        blue: { value: '#74b9ff' },
        white: { value: '#fff' },
      },
      fonts: {
        mono: { value: "'SF Mono', 'Cascadia Code', 'Fira Code', monospace" },
        sans: { value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
      },
      fontSizes: {
        xs: { value: '10px' },
        sm: { value: '11px' },
        md: { value: '12px' },
        lg: { value: '13px' },
        xl: { value: '14px' },
      },
      spacing: {
        0: { value: '0' },
        1: { value: '4px' },
        2: { value: '8px' },
        3: { value: '12px' },
        4: { value: '16px' },
        5: { value: '20px' },
        6: { value: '24px' },
      },
      radii: {
        sm: { value: '4px' },
        md: { value: '6px' },
        lg: { value: '8px' },
        full: { value: '9999px' },
      },
    },
    semanticTokens: {
      colors: {
        surface: {
          bg: {
            value: { base: '{colors.neutral.900}', _light: '{colors.neutral.100}' },
          },
          panel: {
            value: { base: '{colors.neutral.800}', _light: '{colors.white}' },
          },
          hover: {
            value: { base: '{colors.neutral.700}', _light: '{colors.neutral.200}' },
          },
        },
        border: {
          subtle: {
            value: { base: '{colors.neutral.700}', _light: '{colors.neutral.300}' },
          },
        },
        fg: {
          DEFAULT: {
            value: { base: '#e0e0e0', _light: '{colors.neutral.600}' },
          },
          dim: {
            value: { base: '{colors.neutral.400}', _light: '{colors.neutral.500}' },
          },
          bright: {
            value: { base: '{colors.white}', _light: '{colors.neutral.950}' },
          },
        },
      },
    },
  },
});

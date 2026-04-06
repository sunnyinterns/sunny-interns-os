export const tokens = {
  colors: {
    sidebar: '#111110',
    accent: '#c8a96e',
    critical: '#dc2626',
    attention: '#d97706',
    success: '#0d9e75',
    surface: '#fafaf7',
    text: '#1a1918',
  },
} as const

export type ColorToken = keyof typeof tokens.colors

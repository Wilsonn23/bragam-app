export const COLORS = {
  // Primary & Dark Purples
  darkPurple: '#35166F',
  activeNavPill: '#4B229E',
  primaryPurple: '#5B2BBF',
  mediumPurple: '#7E57C2',

  // Tints & Backgrounds
  lavenderTint: '#EAE2F8',
  softLilacBg: '#F9F7FD',
  white: '#FFFFFF',

  // Typography
  textPrimary: '#311465',
  textSecondary: '#6B5894',
  textMuted: '#9E8EC0',

  // Borders & Dividers
  borderStrong: '#5B2BBF',
  borderSubtle: '#E2D6F7',
};

export const RADIUS = {
  sm: 10,
  md: 16,
  lg: 22,
  sheet: 32,
  pill: 999,
};

// Kompatibilitas untuk komponen dari branch main (ActionButton.js, dll.)
export const theme = {
  primary: COLORS.primaryPurple,
  primaryDark: COLORS.darkPurple,
  secondary: COLORS.mediumPurple,
  surface: COLORS.white,
  background: COLORS.softLilacBg,
  text: COLORS.textPrimary,
  textSecondary: COLORS.textSecondary,
  border: COLORS.borderSubtle,
};

export default theme;
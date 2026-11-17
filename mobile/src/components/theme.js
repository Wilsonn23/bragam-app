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
  ink: COLORS.textPrimary,
  muted: COLORS.textSecondary,
  error: "#a52222",
  overlay: "rgba(0,0,0,0.55)",
  text: COLORS.textPrimary,
  textSecondary: COLORS.textSecondary,
  border: COLORS.borderSubtle,
};

export const POI_NOTIFICATION = {
  surface: '#F9F7FF', border: '#602ECC', ink: '#3A1678',
  backdrop: 'rgba(34, 24, 51, 0.5)', tint: '#E7DAFF', radius: 32, borderWidth: 4,
};

export default theme;

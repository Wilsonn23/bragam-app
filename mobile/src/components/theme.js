export const COLORS = {
  // Primary & Dark Purples
  darkPurple: '#35166F',      // Header top, dark buttons, bottom nav bar
  activeNavPill: '#4B229E',   // Pill background tab aktif di bottom nav
  primaryPurple: '#5B2BBF',   // Header bottom, border utama, ikon aktif
  mediumPurple: '#7E57C2',    // Aksen pin map & border sekunder

  // Tints & Backgrounds
  lavenderTint: '#EAE2F8',    // Latar ikon bulat & placeholder gambar
  softLilacBg: '#F9F7FD',     // Latar belakang halaman Trip & Account
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
// Compatibility adapter for Router detail, GPS feedback and shared ActionButton.
export const theme = { background: COLORS.white, surface: COLORS.lavenderTint,
  ink: COLORS.textPrimary, muted: COLORS.textSecondary, primary: COLORS.darkPurple,
  error: '#A52222', overlay: 'rgba(30, 14, 62, 0.55)' };

// UI04-specific tokens from Figma 5MJzy7VlHWVrTYky8yR0sI / 5:1983.
// Keep Explore's existing palette; this variant matches the notification reference.
export const POI_NOTIFICATION = {
  surface: '#F9F7FF', border: '#602ECC', ink: '#3A1678',
  backdrop: 'rgba(34, 24, 51, 0.5)', tint: '#E7DAFF',
  radius: 32, borderWidth: 4,
};

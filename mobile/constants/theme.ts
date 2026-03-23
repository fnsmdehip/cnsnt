/**
 * Design system constants for cnsnt app.
 * Consistent colors, typography, spacing used across all screens.
 */

export const Colors = {
  // Primary palette
  primary: '#1A73E8',
  primaryDark: '#1557B0',
  primaryLight: '#E8F0FE',

  // Status
  success: '#3DDC97',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Neutrals
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceElevated: '#F5F5F5',
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  divider: '#EEEEEE',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',
  textLink: '#1A73E8',

  // Consent status
  statusActive: '#3DDC97',
  statusExpired: '#F59E0B',
  statusRevoked: '#EF4444',
  statusDraft: '#9CA3AF',
} as const;

export const Typography = {
  h1: { fontSize: 28, lineHeight: 36, fontWeight: '700' as const },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  button: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

export const AUTO_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export const FREE_TIER_LIMIT = 5;

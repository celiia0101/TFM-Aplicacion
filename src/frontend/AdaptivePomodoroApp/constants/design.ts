/**
 * Design tokens for the "Bio-Logic Interface" system.
 * Source: login-pomodoro/DESIGN.md
 */

export const DesignColors = {
  surface: '#13121b',
  surfaceDim: '#13121b',
  surfaceBright: '#393842',
  surfaceContainerLowest: '#0e0d16',
  surfaceContainerLow: '#1b1b24',
  surfaceContainer: '#1f1f28',
  surfaceContainerHigh: '#2a2933',
  surfaceContainerHighest: '#35343e',
  onSurface: '#e4e1ee',
  onSurfaceVariant: '#c7c4d8',
  inverseSurface: '#e4e1ee',
  inverseOnSurface: '#302f39',
  outline: '#918fa1',
  outlineVariant: '#464555',
  surfaceTint: '#c3c0ff',
  primary: '#c3c0ff',
  onPrimary: '#1d00a5',
  primaryContainer: '#4f46e5',
  onPrimaryContainer: '#dad7ff',
  inversePrimary: '#4d44e3',
  secondary: '#44e2cd',
  onSecondary: '#003731',
  secondaryContainer: '#03c6b2',
  onSecondaryContainer: '#004d44',
  tertiary: '#ffb695',
  onTertiary: '#571f00',
  tertiaryContainer: '#a44100',
  onTertiaryContainer: '#ffd2be',
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
  background: '#13121b',
  onBackground: '#e4e1ee',
  surfaceVariant: '#35343e',
} as const;

export const DesignFonts = {
  headline: 'PlusJakartaSans_600SemiBold',
  headlineBold: 'PlusJakartaSans_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  label: 'Inter_600SemiBold',
} as const;

export const DesignTypography = {
  displayTimer: {
    fontFamily: DesignFonts.headlineBold,
    fontSize: 80,
    lineHeight: 80,
    letterSpacing: -3.2,
  },
  headlineLg: {
    fontFamily: DesignFonts.headline,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.64,
  },
  headlineLgMobile: {
    fontFamily: DesignFonts.headline,
    fontSize: 24,
    lineHeight: 32,
  },
  bodyMd: {
    fontFamily: DesignFonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  labelCaps: {
    fontFamily: DesignFonts.label,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
  },
} as const;

export const DesignRadius = {
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const DesignSpacing = {
  base: 8,
  containerPadding: 24,
  gutter: 16,
  cardGap: 20,
} as const;

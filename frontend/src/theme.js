// Design tokens — see design/HR Manager — Salary Analytics (page "Design Tokens")
export const colors = {
  paper: '#F6F3EE',
  surface: '#FCFAF6',
  field: '#FFFFFF',
  ink: '#0E1B2C',
  inkSoft: '#3A4553',
  muted: '#5B6573',
  brass: '#A8834A',
  brassLight: '#C9A46A',
  onInkMuted: '#C9CFD6',
  tier1: '#9AA5B1',
  hairline: '#D9D3C7',
  hairlineSoft: '#E6E1D7',
  fieldBorder: '#CFC7B8',
  success: '#3F7A5C',
  danger: '#8C2F2B',
  dangerPressed: '#73231F',
  scrim: 'rgba(14,27,44,0.55)',
  white: '#FFFFFF',
  skeleton: '#E9E4DA',
};

export const tierColors = [colors.tier1, colors.ink, colors.brass];
export const tierNames = ['Entry', 'Professional', 'Executive'];

export const spacing = { s1: 4, s2: 8, s3: 12, s4: 16, s5: 20, s6: 24, s7: 28, s8: 32, s9: 40, s10: 48, s11: 56, s12: 72 };

export const radius = { none: 0, control: 4, dialog: 6 };

export const MAX_WIDTH = 1184;
export const WIDE = 768;

export const fonts = {
  displayLight: 'Fraunces_300Light',
  displayItalic: 'Fraunces_300Light_Italic',
  display: 'Fraunces_400Regular',
  sans: 'IBMPlexSans_400Regular',
  sansMedium: 'IBMPlexSans_500Medium',
  sansSemi: 'IBMPlexSans_600SemiBold',
};

const nums = { fontVariant: ['tabular-nums', 'lining-nums'] };

export const type = {
  wordmark: { fontFamily: fonts.displayLight, fontSize: 112, lineHeight: 100, letterSpacing: -3.9, color: colors.ink },
  title: { fontFamily: fonts.display, fontSize: 48, lineHeight: 52, letterSpacing: -1, color: colors.ink },
  titleMobile: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40, letterSpacing: -0.7, color: colors.ink },
  dialog: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.5, color: colors.ink },
  section: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.ink },
  numXL: { fontFamily: fonts.display, fontSize: 56, lineHeight: 60, color: colors.ink, ...nums },
  numL: { fontFamily: fonts.display, fontSize: 44, lineHeight: 48, color: colors.ink, ...nums },
  numM: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.ink, ...nums },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.inkSoft },
  cell: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 22, color: colors.ink, ...nums },
  small: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, color: colors.muted },
  smallMedium: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 20, color: colors.ink },
  button: { fontFamily: fonts.sansSemi, fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  label: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  caption: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, color: colors.muted },
};

export const formatMoney = (n) =>
  `฿${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export const formatDate = (d) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export const formatDateTime = (d) =>
  `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString(
    'en-GB',
    { hour: '2-digit', minute: '2-digit' }
  )}`;

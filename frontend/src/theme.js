import { Platform } from 'react-native';

export const colors = {
  primary: '#0F2A4A',
  primaryLight: '#1E3A5F',
  accent: '#B8925A',
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  border: '#E3E8EF',
  text: '#0F172A',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',
  textInverseMuted: 'rgba(255,255,255,0.72)',
  success: '#15803D',
  successBg: '#DCFCE7',
  warning: '#B45309',
  warningBg: '#FEF3C7',
  danger: '#B91C1C',
  dangerBg: '#FEE2E2',
  secondaryBg: '#EEF2F7',
  overlay: 'rgba(15,23,42,0.45)',
  placeholder: '#94A3B8',
  grid: '#EEF1F5',
  dangerPressed: '#FECACA',
  ghostPressed: 'rgba(148,163,184,0.15)',
};

export const tierColors = ['#94A3B8', '#1E3A5F', '#B8925A'];

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { card: 10, control: 8, pill: 999 };

export const shadow = Platform.select({
  web: { boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)' },
  default: {
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
});

export const type = {
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  section: { fontSize: 16, fontWeight: '600', color: colors.text },
  body: { fontSize: 14, fontWeight: '400', color: colors.text },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
};

export const MAX_WIDTH = 1100;

export const formatMoney = (n) =>
  `฿ ${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

import { Platform } from 'react-native';

export const lightColors = {
  primary: '#0d6efd',
  primarySubtle: '#cfe2ff',
  primaryText: '#0a58ca',
  secondary: '#6c757d',
  success: '#198754',
  successSubtle: '#d1e7dd',
  danger: '#dc3545',
  dangerSubtle: '#f8d7da',
  warning: '#ffc107',
  warningSubtle: '#fff3cd',
  info: '#0dcaf0',
  infoSubtle: '#cff4fc',
  pageBg: '#f8f9fa',
  bodyBg: '#ffffff',
  tertiaryBg: '#f8f9fa',
  secondaryBg: '#e9ecef',
  text: '#212529',
  muted: '#6c757d',
  border: '#dee2e6',
  onPrimary: '#ffffff',
  mark: 'rgba(255,193,7,0.3)',
  overlay: 'rgba(0,0,0,0.5)',
  added: 'rgba(40,167,69,0.1)',
  removed: 'rgba(220,53,69,0.1)',
  shadow: '#000000',
};

export const darkColors = {
  ...lightColors,
  primarySubtle: '#031633',
  primaryText: '#6ea8fe',
  successSubtle: '#051b11',
  dangerSubtle: '#2c0b0e',
  warningSubtle: '#332701',
  infoSubtle: '#032830',
  pageBg: '#212529',
  bodyBg: '#212529',
  tertiaryBg: '#2b3035',
  secondaryBg: '#343a40',
  text: '#dee2e6',
  muted: '#adb5bd',
  border: '#495057',
  mark: 'rgba(255,193,7,0.2)',
  overlay: 'rgba(0,0,0,0.7)',
};

export const spacing = { 0: 0, 1: 4, 2: 8, 3: 16, 4: 24, 5: 48 };

export const fonts = {
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: '"Fira Code", ui-monospace, monospace' }),
  rtl: 'Vazir',
};

export const radius = { sm: 4, md: 6, lg: 8, xl: 12, pill: 999 };

export const breakpoints = { sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400 };

export const shadow = (level = 1) =>
  Platform.select({
    web: { boxShadow: level > 1 ? '0 .5rem 1rem rgba(0,0,0,.15)' : '0 .125rem .25rem rgba(0,0,0,.075)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: level > 1 ? 4 : 1 },
      shadowOpacity: level > 1 ? 0.2 : 0.08,
      shadowRadius: level > 1 ? 8 : 2,
      elevation: level > 1 ? 6 : 2,
    },
  });

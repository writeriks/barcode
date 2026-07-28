import { Platform } from 'react-native';

export const fonts = {
  displaySemiBold: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
} as const;

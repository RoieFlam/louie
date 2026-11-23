// Design tokens from Figma "Louie - App Design" (direction A, "שמיים טריים").
export const C = {
  bg: '#EEF8FD',
  surface: '#FFFFFF',
  ink: '#0F2A3D',
  muted: '#56707F',
  line: '#D6EAF5',
  accent: '#0B74D6',
  accentSoft: '#D9F0FC',
  sky: '#1094F9',
  skyLight: '#36C2FF',
  fresh: '#2E9E68',
  freshSoft: '#DFF3E8',
  warn: '#E89A0C',
  warnSoft: '#FFF1DA',
  missing: '#D23F25',
  missingSoft: '#FDE6E1',
  onAccent: '#FFFFFF',
  night: '#0F2A3D',
} as const;

export const F = {
  regular: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  semibold: 'Rubik_600SemiBold',
  bold: 'Rubik_700Bold',
} as const;

export const R = { chip: 999, button: 20, card: 18, sheet: 28 } as const;

export const mascots = {
  happy: require('../assets/louie/happy.png'),
  curious: require('../assets/louie/curious.png'),
  sad: require('../assets/louie/sad.png'),
};

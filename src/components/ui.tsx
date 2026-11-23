import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, F, R, mascots } from '@/theme';

// The app is Hebrew-only, so RTL is handled explicitly: right-aligned text and
// row-reverse rows. This behaves the same on web, iOS and Android without
// relying on I18nManager (which needs an app restart to switch).

type TxtProps = TextProps & {
  size?: number;
  weight?: keyof typeof F;
  color?: string;
  align?: 'right' | 'center' | 'left';
  style?: StyleProp<TextStyle>;
};

export function Txt({ size = 16, weight = 'regular', color = C.ink, align = 'right', style, ...rest }: TxtProps) {
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: F[weight],
          fontSize: size,
          lineHeight: Math.round(size * 1.3),
          color,
          textAlign: align,
          writingDirection: 'rtl',
        },
        style,
      ]}
    />
  );
}

export function Row({ children, style, gap = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row-reverse', alignItems: 'center', gap }, style]}>{children}</View>;
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost';
  style?: StyleProp<ViewStyle>;
  height?: number;
  disabled?: boolean;
};

export function Button({ label, onPress, kind = 'primary', style, height = 56, disabled }: ButtonProps) {
  const bg = kind === 'primary' ? C.accent : kind === 'secondary' ? C.accentSoft : 'transparent';
  const fg = kind === 'primary' ? C.onAccent : C.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, height, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}>
      <Txt size={17} weight="semibold" color={fg} align="center">
        {label}
      </Txt>
    </Pressable>
  );
}

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'have' | 'expiring' | 'missing' | 'plain';
  dot?: boolean;
};

const toneColors = {
  have: { bg: C.freshSoft, fg: C.ink, dot: C.fresh },
  expiring: { bg: C.warnSoft, fg: C.ink, dot: C.warn },
  missing: { bg: C.missingSoft, fg: C.missing, dot: C.missing },
  plain: { bg: C.bg, fg: C.ink, dot: C.muted },
};

export function Chip({ label, selected, onPress, tone = 'plain', dot }: ChipProps) {
  const t = toneColors[tone];
  const bg = selected ? C.accent : t.bg;
  const fg = selected ? C.onAccent : t.fg;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: bg }, !selected && tone === 'plain' && styles.chipBorder]}>
      <Row gap={6}>
        {dot && <View style={[styles.dot, { backgroundColor: t.dot }]} />}
        <Txt size={15} weight="medium" color={fg} align="center">
          {label}
        </Txt>
      </Row>
    </Pressable>
  );
}

export function Wrap({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>;
}

export function Mascot({ mood, size = 120 }: { mood: keyof typeof mascots; size?: number }) {
  return <Image source={mascots[mood]} style={{ width: size, height: size }} contentFit="contain" accessibilityIgnoresInvertColors />;
}

export function Screen({ children, bg = C.bg, style }: { children: ReactNode; bg?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: bg }]} edges={['top', 'bottom']}>
      <View style={[{ flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' }, style]}>{children}</View>
    </SafeAreaView>
  );
}

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  mood?: keyof typeof mascots;
  title: string;
  body?: string;
  children?: ReactNode;
  primary: { label: string; onPress: () => void; disabled?: boolean };
  secondary?: { label: string; onPress: () => void };
};

export function Sheet({ visible, onClose, mood, title, body, children, primary, secondary }: SheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="סגור" />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {mood && <Mascot mood={mood} size={110} />}
          <Txt size={24} weight="bold" align="center">
            {title}
          </Txt>
          {body && (
            <Txt size={15} color={C.muted} align="center">
              {body}
            </Txt>
          )}
          {children}
          <Button label={primary.label} onPress={primary.onPress} disabled={primary.disabled} style={{ alignSelf: 'stretch' }} />
          {secondary && (
            <Button label={secondary.label} kind="secondary" height={52} onPress={secondary.onPress} style={{ alignSelf: 'stretch' }} />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: R.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  chip: { borderRadius: R.chip, paddingVertical: 9, paddingHorizontal: 14 },
  chipBorder: { borderWidth: 1, borderColor: C.line },
  dot: { width: 8, height: 8, borderRadius: 4 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15,42,61,0.55)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: C.surface,
    borderTopLeftRadius: R.sheet,
    borderTopRightRadius: R.sheet,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
    gap: 14,
    alignItems: 'center',
  },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: C.line },
});

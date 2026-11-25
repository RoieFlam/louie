import { Image } from 'expo-image';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
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
  bubble: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.line,
  },
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.line },
});

// ---- Shared layout pieces, so every screen speaks the same visual language ----

const STEPS = ['צילום', 'בדיקה', 'מתכון'];

export function Steps({ active, dark }: { active: 0 | 1 | 2; dark?: boolean }) {
  return (
    <Row gap={6} style={{ justifyContent: 'center' }}>
      {STEPS.map((label, i) => {
        const on = i <= active;
        return (
          <Row key={label} gap={6}>
            <View
              style={{
                paddingVertical: 4,
                paddingHorizontal: 10,
                borderRadius: R.chip,
                backgroundColor: i === active ? C.accent : on ? C.accentSoft : dark ? 'rgba(255,255,255,0.16)' : C.surface,
              }}>
              <Txt size={12} weight="semibold" align="center" color={i === active ? C.onAccent : on ? C.accent : dark ? '#E3F1F9' : C.muted}>
                {`${i + 1} · ${label}`}
              </Txt>
            </View>
            {i < STEPS.length - 1 && <View style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: dark ? 'rgba(255,255,255,0.3)' : C.line }} />}
          </Row>
        );
      })}
    </Row>
  );
}

export function TopBar({ step, onClose, dark }: { step: 0 | 1 | 2; onClose?: () => void; dark?: boolean }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 }}>
      <View style={{ width: 36 }} />
      <Steps active={step} dark={dark} />
      {onClose ? (
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="סגור"
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: dark ? 'rgba(255,255,255,0.16)' : C.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={15} align="center" color={dark ? '#FFFFFF' : C.ink}>
            ✕
          </Txt>
        </Pressable>
      ) : (
        <View style={{ width: 36 }} />
      )}
    </Row>
  );
}

// Louie as a guide: one short line per screen, always in the same place and shape.
// He "breathes" gently, and hops whenever `hop` changes (a rescue, a pick...).
export function LouieSays({ mood = 'happy', hop, children }: { mood?: keyof typeof mascots; hop?: unknown; children: ReactNode }) {
  const breath = useRef(new Animated.Value(0)).current;
  const jump = useRef(new Animated.Value(0)).current;
  const first = useRef(true);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    jump.setValue(0);
    Animated.sequence([
      Animated.timing(jump, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(jump, { toValue: 0, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [hop, jump]);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const translateY = jump.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });

  return (
    <Row gap={10} style={{ alignItems: 'flex-end' }}>
      <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
        <Mascot mood={mood} size={52} />
      </Animated.View>
      <View style={styles.bubble}>
        <Txt size={15} weight="medium">
          {children}
        </Txt>
      </View>
    </Row>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}


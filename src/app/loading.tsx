import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Button, LouieSays, Mascot, Screen, TopBar, Txt, Wrap } from '@/components/ui';
import { AnalyzeError, detectItems, type FridgeItem, type Problem } from '@/lib/analyze';
import { useStore } from '@/state/store';
import { C } from '@/theme';

// Step 1 → 2: Louie reads the photos. Items appear one by one as the model names
// them (streamed), then we go to the review screen.

const PROBLEM_TEXT: Record<'too_dark' | 'blurry' | 'not_a_fridge', { title: string; body: string }> = {
  too_dark: { title: 'קצת חשוך פה', body: 'עם עוד קצת אור, או קצת יותר קרוב, אראה הכל. ננסה שוב?' },
  blurry: { title: 'התמונה יצאה מטושטשת', body: 'רגע של יד יציבה, ונצלם שוב.' },
  not_a_fridge: { title: 'זה לא נראה כמו מקרר', body: 'פותחים את המקרר ומצלמים את המדפים.' },
};

const ERROR_TEXT: Record<string, string> = {
  network: 'אין חיבור לאינטרנט. ננסה שוב בעוד רגע?',
  busy: 'יש עומס כרגע. ננסה שוב בעוד דקה?',
};

export default function Loading() {
  const s = useStore();
  const [found, setFound] = useState<string[]>([]);
  const [problem, setProblem] = useState<Exclude<Problem, 'none' | 'almost_empty'> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const result = useRef<FridgeItem[] | null>(null);
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scan, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scan]);

  function toReview(items: FridgeItem[]) {
    s.setFridge(items);
    router.replace('/review');
  }

  useEffect(() => {
    let alive = true;
    if (s.sampleMode) {
      // Sample mode: replay the sample fridge as if it were being detected.
      const names = s.fridge.map((i) => i.name);
      const timers = names.map((n, i) => setTimeout(() => alive && setFound((f) => [...f, n]), 400 + i * 220));
      timers.push(setTimeout(() => alive && router.replace('/review'), 400 + names.length * 220 + 700));
      return () => {
        alive = false;
        timers.forEach(clearTimeout);
      };
    }
    detectItems(s.photos, (name) => alive && setFound((f) => [...f, name]))
      .then((r) => {
        if (!alive) return;
        result.current = r.items;
        if (r.problem === 'too_dark' || r.problem === 'blurry' || r.problem === 'not_a_fridge') {
          setProblem(r.problem);
          return;
        }
        setTimeout(() => alive && toReview(r.items), 600);
      })
      .catch((e) => alive && setError(e instanceof AnalyzeError ? e.code : 'unknown'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error || problem) {
    const p = problem ? PROBLEM_TEXT[problem] : null;
    return (
      <Screen>
        <TopBar step={0} onClose={() => router.dismissTo('/home')} />
        <View style={styles.center}>
          <Mascot mood="curious" size={160} />
          <Txt size={24} weight="bold" align="center">
            {p ? p.title : 'משהו השתבש'}
          </Txt>
          <Txt size={16} color={C.muted} align="center">
            {p ? p.body : (ERROR_TEXT[error ?? ''] ?? 'לא הצלחתי לקרוא את התמונה. ננסה שוב?')}
          </Txt>
        </View>
        <View style={styles.actions}>
          <Button label="לצלם שוב" onPress={() => router.dismissTo('/camera')} />
          {!!result.current?.length && (
            <Button label="להראות מה מצאת בכל זאת" kind="secondary" onPress={() => toReview(result.current ?? [])} />
          )}
        </View>
      </Screen>
    );
  }

  const translateY = scan.interpolate({ inputRange: [0, 1], outputRange: [0, 196] });

  return (
    <Screen>
      <TopBar step={0} />
      <View style={styles.body}>
        <LouieSays mood="curious">
          {found.length === 0 ? 'רגע, עובר מדף מדף…' : `כבר מצאתי ${found.length}. ממשיך לחפש…`}
        </LouieSays>

        <View style={styles.photo}>
          {s.photos[0] ? (
            <Image source={{ uri: s.photos[0] }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.samplePhoto]}>
              <Txt size={64} align="center">
                🧊
              </Txt>
            </View>
          )}
          <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
          {s.photos.length > 1 && (
            <View style={styles.more}>
              <Txt size={13} weight="semibold" align="center">{`+${s.photos.length - 1} תמונות`}</Txt>
            </View>
          )}
        </View>

        <Wrap style={{ justifyContent: 'center' }}>
          {found.map((name) => (
            <Pop key={name} label={name} />
          ))}
        </Wrap>
      </View>
    </Screen>
  );
}

function Pop({ label }: { label: string }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  }, [a]);
  return (
    <Animated.View style={[styles.pill, { opacity: a, transform: [{ scale: a }] }]}>
      <Txt size={14} weight="medium" align="center">
        {label}
      </Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 16 },
  photo: { height: 200, borderRadius: 20, overflow: 'hidden', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  samplePhoto: { backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  scanLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 4, backgroundColor: C.skyLight, opacity: 0.9 },
  more: { position: 'absolute', bottom: 10, left: 10, backgroundColor: C.surface, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  pill: { backgroundColor: C.surface, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1, borderColor: C.line },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
  actions: { paddingHorizontal: 24, paddingBottom: 16, gap: 12 },
});

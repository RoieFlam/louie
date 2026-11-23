import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Button, Mascot, Screen, Txt } from '@/components/ui';
import { analyzeFridge, AnalyzeError, type AnalyzeResult, type Problem } from '@/lib/analyze';
import { useStore } from '@/state/store';
import { C } from '@/theme';

// Detection is merged into the loading moment: chips "pop" as items are found,
// then we go straight to the recipe.
const SPOTS = [
  { top: '18%', right: '14%' },
  { top: '34%', left: '12%' },
  { top: '58%', right: '22%' },
  { top: '72%', left: '20%' },
  { top: '46%', right: '40%' },
] as const;

const PROBLEM_TEXT: Record<Exclude<Problem, 'none' | 'almost_empty'>, { title: string; body: string }> = {
  too_dark: { title: 'קצת חשוך פה', body: 'תדליק את האור במקרר או תתקרב, ונצלם שוב.' },
  blurry: { title: 'התמונה יצאה מטושטשת', body: 'תחזיק את הטלפון יציב רגע, ונצלם שוב.' },
  not_a_fridge: { title: 'זה לא נראה כמו מקרר', body: 'תפתח את המקרר ותצלם את המדפים.' },
};

const ERROR_TEXT: Record<string, string> = {
  network: 'אין חיבור לאינטרנט. נסה שוב בעוד רגע.',
  busy: 'יש עומס כרגע. נסה שוב בעוד דקה.',
};

export default function Loading() {
  const s = useStore();
  const [found, setFound] = useState<string[]>([]);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<AnalyzeResult | null>(null);
  const anims = useRef(SPOTS.map(() => new Animated.Value(0))).current;

  function popChips(names: string[], then: () => void) {
    setFound(names);
    names.slice(0, SPOTS.length).forEach((_, i) =>
      setTimeout(() => Animated.spring(anims[i], { toValue: 1, useNativeDriver: true, friction: 5 }).start(), 150 + i * 300),
    );
    setTimeout(then, 150 + Math.min(names.length, SPOTS.length) * 300 + 700);
  }

  function goToRecipe() {
    const r = pending.current;
    if (r) s.setRecipe(r.recipe, r.items);
    router.replace('/recipe');
  }

  useEffect(() => {
    let alive = true;
    if (!s.photoUri) {
      // Sample mode (no real photo): use the built-in sample recipe.
      popChips(
        s.items.filter((i) => i.status !== 'missing').map((i) => i.name),
        () => alive && router.replace('/recipe'),
      );
      return () => {
        alive = false;
      };
    }
    analyzeFridge([s.photoUri], {
      prefs: s.prefs,
      changeRequest: s.changeRequest ?? undefined,
      avoidTitles: s.seenTitles,
    })
      .then((r) => {
        if (!alive) return;
        s.setChangeRequest(null);
        pending.current = r;
        if (r.problem !== 'none' && r.problem !== 'almost_empty') {
          setProblem(r.problem);
          return;
        }
        if (r.problem === 'almost_empty') setProblem('almost_empty');
        popChips(
          r.items.filter((i) => i.status !== 'missing').map((i) => i.name),
          () => alive && r.problem === 'none' && goToRecipe(),
        );
      })
      .catch((e) => alive && setError(e instanceof AnalyzeError ? e.code : 'unknown'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error || (problem && problem !== 'none')) {
    const p = problem && problem !== 'almost_empty' && problem !== 'none' ? PROBLEM_TEXT[problem] : null;
    const empty = problem === 'almost_empty';
    return (
      <Screen>
        <View style={styles.center}>
          <Mascot mood={empty ? 'sad' : 'curious'} size={170} />
          <Txt size={26} weight="bold" align="center">
            {empty ? 'המקרר כמעט ריק' : p ? p.title : 'משהו השתבש'}
          </Txt>
          <Txt size={16} color={C.muted} align="center">
            {empty
              ? 'אבל מצאתי משהו קטן שאפשר להכין. ואולי הגיע הזמן לרשימת קניות?'
              : p
                ? p.body
                : (ERROR_TEXT[error ?? ''] ?? 'לא הצלחתי לקרוא את התמונה. נסה שוב.')}
          </Txt>
        </View>
        <View style={styles.actions}>
          {empty ? (
            <>
              <Button label="תראה לי מה אפשר להכין" onPress={goToRecipe} />
              <Button label="לרשימת הקניות" kind="secondary" onPress={() => router.replace(s.staples ? '/shopping' : '/staples')} />
            </>
          ) : (
            <>
              <Button label="צלם שוב" onPress={() => router.dismissTo('/camera')} />
              {pending.current && <Button label="תראה בכל זאת מתכון" kind="secondary" onPress={goToRecipe} />}
            </>
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen bg={C.night}>
      <View style={styles.photo}>
        {s.photoUri ? (
          <Image source={{ uri: s.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.samplePhoto]}>
            <View style={styles.shelf} />
          </View>
        )}
        {found.slice(0, SPOTS.length).map((name, i) => (
          <Animated.View key={name} style={[styles.pill, SPOTS[i], { opacity: anims[i], transform: [{ scale: anims[i] }] }]}>
            <Txt size={14} weight="semibold" align="center">
              {name}
            </Txt>
          </Animated.View>
        ))}
      </View>
      <View style={styles.bottom}>
        <Txt size={22} weight="bold" color={C.onAccent} align="center">
          Louie מסתכל במקרר…
        </Txt>
        <Txt size={15} color="#CFE3EF" align="center">
          {found.length === 0 ? 'רגע, מסתכל על כל המדפים…' : `מצאתי ${found.length} דברים טובים`}
        </Txt>
        <Mascot mood="curious" size={130} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { flex: 1, marginHorizontal: 24, marginTop: 24, borderRadius: 28, overflow: 'hidden', backgroundColor: '#DCEAF2' },
  samplePhoto: { backgroundColor: '#E4EFF5' },
  shelf: { position: 'absolute', top: '52%', left: 0, right: 0, height: 3, backgroundColor: '#FFFFFF' },
  pill: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  bottom: { alignItems: 'center', gap: 6, paddingTop: 24, paddingBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
  actions: { paddingHorizontal: 24, paddingBottom: 16, gap: 12 },
});

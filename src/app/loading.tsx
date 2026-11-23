import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Mascot, Screen, Txt } from '@/components/ui';
import { useStore } from '@/state/store';
import { C, F } from '@/theme';

// Detection is merged into the loading moment: chips "pop" as items are found,
// then we go straight to the recipe. Later this waits for the real API call.
const SPOTS = [
  { top: '18%', right: '14%' },
  { top: '34%', left: '12%' },
  { top: '58%', right: '22%' },
  { top: '72%', left: '20%' },
  { top: '46%', right: '40%' },
] as const;

export default function Loading() {
  const s = useStore();
  const found = s.items.filter((i) => i.status !== 'missing').map((i) => i.name);
  const [count, setCount] = useState(0);
  const anims = useRef(found.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const timers = found.map((_, i) =>
      setTimeout(() => {
        setCount(i + 1);
        Animated.spring(anims[i], { toValue: 1, useNativeDriver: true, friction: 5 }).start();
      }, 350 + i * 380),
    );
    const done = setTimeout(() => router.replace('/recipe'), 350 + found.length * 380 + 700);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <Animated.View
            key={name}
            style={[styles.pill, SPOTS[i], { opacity: anims[i], transform: [{ scale: anims[i] }] }]}>
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
          {count === 0 ? 'רגע, מסתכל…' : `מצאתי כבר ${count} דברים טובים`}
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
  bottom: { alignItems: 'center', gap: 6, paddingTop: 24, paddingBottom: 8, fontFamily: F.regular },
});

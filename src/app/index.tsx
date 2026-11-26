import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Mascot, Screen, Txt } from '@/components/ui';
import { useStore } from '@/state/store';
import { C, F } from '@/theme';

// First visit: a short welcome, then setting up the kitchen. After that, straight to the kitchen.
export default function Splash() {
  const s = useStore();
  if (!s.hydrated) return <Screen>{null}</Screen>;
  if (s.kitchenReady) return <Redirect href="/home" />;
  return (
    <Screen>
      <View style={styles.center}>
        <View style={styles.glow} />
        <Mascot mood="happy" size={240} />
        <Txt size={64} weight="bold" color={C.ink} align="center" style={styles.wordmark}>
          Louie
        </Txt>
        <Txt size={17} color={C.muted} align="center">
          ספרו לי מה יש בבית, ואני אחליט מה אוכלים.
        </Txt>
      </View>
      <View style={styles.bottom}>
        <Txt size={13} color={C.muted} align="center">
          בלי הרשמה. חצי דקה ויש מתכון.
        </Txt>
        <Button label="מתחילים" onPress={() => router.push('/setup')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  glow: {
    position: 'absolute',
    top: '18%',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: C.accentSoft,
  },
  wordmark: { fontFamily: F.bold, letterSpacing: -1.5, lineHeight: 72, marginTop: 8 },
  bottom: { paddingHorizontal: 24, paddingBottom: 16, gap: 12 },
});

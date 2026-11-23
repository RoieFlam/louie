import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Mascot, Screen, Txt } from '@/components/ui';
import { C, F } from '@/theme';

export default function Splash() {
  return (
    <Screen>
      <View style={styles.center}>
        <View style={styles.glow} />
        <Mascot mood="happy" size={240} />
        <Txt size={64} weight="bold" color={C.ink} align="center" style={styles.wordmark}>
          Louie
        </Txt>
        <Txt size={17} color={C.muted} align="center">
          צלם את המקרר. אני אחליט מה אוכלים.
        </Txt>
      </View>
      <View style={styles.bottom}>
        <Txt size={13} color={C.muted} align="center">
          בלי הרשמה. הצילום הראשון עכשיו.
        </Txt>
        <Button label="פותחים את המצלמה" onPress={() => router.push('/camera')} />
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

import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Mascot, Row, Screen, Sheet, Txt } from '@/components/ui';
import { HOME_CARDS } from '@/data/mock';
import { useStore } from '@/state/store';
import { C, R } from '@/theme';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'בוקר טוב!';
  if (h < 17) return 'צהריים טובים!';
  return 'ערב טוב!';
}

const toneBg = { warn: C.warnSoft, fresh: C.freshSoft, accent: C.accentSoft };
const toneFg = { warn: C.warn, fresh: C.fresh, accent: C.accent };

export default function Camera() {
  const s = useStore();
  const [askPermission, setAskPermission] = useState(!s.cameraExplained);
  const [card, setCard] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setCard((c) => (c + 1) % HOME_CARDS.length), 5000);
    return () => clearInterval(t);
  }, []);

  async function takePhoto(fromGallery = false) {
    setError(null);
    try {
      if (!fromGallery) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setError('בלי מצלמה אני לא רואה את המקרר. אפשר לבחור תמונה מהגלריה.');
          return;
        }
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
      const res = fromGallery ? await ImagePicker.launchImageLibraryAsync(opts) : await ImagePicker.launchCameraAsync(opts);
      if (res.canceled) return;
      s.setPhotoUri(res.assets[0].uri);
      router.push('/loading');
    } catch {
      setError('משהו השתבש עם המצלמה. נסה שוב או בחר תמונה מהגלריה.');
    }
  }

  function trySample() {
    s.setPhotoUri(null);
    router.push('/loading');
  }

  const c = HOME_CARDS[card];

  return (
    <Screen bg={C.night}>
      <View style={styles.header}>
        <Row gap={12} style={{ alignItems: 'flex-start' }}>
          <View style={styles.avatar}>
            <Mascot mood="happy" size={44} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt size={24} weight="bold" color={C.onAccent}>
              {greeting()} מה יש במקרר?
            </Txt>
            <Txt size={15} color="#CFE3EF">
              צלם את המקרר, ו-Louie יחליט מה אוכלים.
            </Txt>
          </View>
        </Row>
      </View>

      <View style={styles.viewfinder}>
        <View style={[styles.corner, { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 }]} />
        <View style={[styles.corner, { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 }]} />
        <View style={[styles.corner, { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 }]} />
        <View style={[styles.corner, { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 }]} />
        <Pressable onPress={trySample} accessibilityRole="button">
          <Txt size={14} color="#CFE3EF" align="center" style={{ textDecorationLine: 'underline' }}>
            אין מקרר מול העיניים? נסה תמונה לדוגמה
          </Txt>
        </Pressable>
      </View>

      {error ? (
        <View style={[styles.card, { backgroundColor: C.missingSoft }]}>
          <Txt size={14} weight="medium" color={C.missing}>
            {error}
          </Txt>
        </View>
      ) : (
        <Pressable
          style={styles.card}
          onPress={() => setCard((card + 1) % HOME_CARDS.length)}
          accessibilityRole="button"
          accessibilityLabel={c.title}>
          <Row gap={12}>
            <View style={[styles.cardIcon, { backgroundColor: toneBg[c.tone] }]}>
              <Txt size={18} weight="bold" color={toneFg[c.tone]} align="center">
                {c.icon}
              </Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt size={15} weight="semibold">
                {c.title}
              </Txt>
              <Txt size={13} color={C.muted}>
                {c.sub}
              </Txt>
            </View>
            <View style={{ gap: 4 }}>
              {HOME_CARDS.map((_, i) => (
                <View key={i} style={[styles.dot, { backgroundColor: i === card ? C.accent : C.line }]} />
              ))}
            </View>
          </Row>
        </Pressable>
      )}

      <Row style={styles.controls}>
        <Pressable
          style={styles.side}
          onPress={() => router.push(s.staples ? '/shopping' : '/staples')}
          accessibilityRole="button">
          <Txt size={14} weight="medium" color={C.onAccent} align="center">
            🛒 הולך לסופר
          </Txt>
        </Pressable>
        <Pressable style={styles.shutter} onPress={() => takePhoto(false)} accessibilityRole="button" accessibilityLabel="צלם את המקרר">
          <View style={styles.shutterInner} />
        </Pressable>
        <Pressable style={styles.side} onPress={() => takePhoto(true)} accessibilityRole="button">
          <Txt size={14} weight="medium" color={C.onAccent} align="center">
            🖼 מהגלריה
          </Txt>
        </Pressable>
      </Row>
      <Txt size={12} color="#9DB6C6" align="center" style={{ marginBottom: 12 }}>
        אפשר גם 2–3 תמונות: מקרר ומדף
      </Txt>

      <Sheet
        visible={askPermission}
        onClose={() => setAskPermission(false)}
        mood="happy"
        title="אני צריך לראות את המקרר"
        body="המצלמה משמשת רק לצילום המקרר, כדי שאמצא לך מתכון. בלי הרשמה."
        primary={{
          label: 'אפשר מצלמה',
          onPress: () => {
            s.setCameraExplained(true);
            setAskPermission(false);
            takePhoto(false);
          },
        }}
        secondary={{
          label: 'אולי אחר כך',
          onPress: () => {
            s.setCameraExplained(true);
            setAskPermission(false);
          },
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  viewfinder: { flex: 1, margin: 32, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 44, height: 44, borderColor: '#FFFFFF', borderWidth: 4, borderRadius: 10 },
  card: { marginHorizontal: 24, marginBottom: 18, backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 20, padding: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  controls: { justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 10 },
  side: { width: 104, paddingVertical: 10, borderRadius: R.chip, backgroundColor: 'rgba(255,255,255,0.14)' },
  shutter: { width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF' },
});

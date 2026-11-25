import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Mascot, Row, Sheet, Txt } from '@/components/ui';
import { HOME_CARDS } from '@/data/mock';
import { useStore } from '@/state/store';
import { C, R } from '@/theme';

const MAX_PHOTOS = 3;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'בוקר טוב!';
  if (h < 17) return 'צהריים טובים!';
  return 'ערב טוב!';
}

// Home = live camera. Take 1-3 photos (fridge, door, drawer), then send.
export default function Camera() {
  const s = useStore();
  const cam = useRef<CameraView>(null);
  const [perm, requestPerm] = useCameraPermissions();
  const [shots, setShots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [card, setCard] = useState(0);
  const [askPermission, setAskPermission] = useState(false);

  useEffect(() => {
    if (perm && !perm.granted && !s.cameraExplained) setAskPermission(true);
  }, [perm, s.cameraExplained]);

  useEffect(() => {
    const t = setInterval(() => setCard((c) => (c + 1) % HOME_CARDS.length), 5000);
    return () => clearInterval(t);
  }, []);

  async function shoot() {
    if (!perm?.granted) {
      setAskPermission(true);
      return;
    }
    if (busy || shots.length >= MAX_PHOTOS) return;
    setBusy(true);
    try {
      const pic = await cam.current?.takePictureAsync({ quality: 0.8, skipProcessing: false });
      if (pic?.uri) setShots((x) => [...x, pic.uri]);
    } finally {
      setBusy(false);
    }
  }

  async function fromGallery() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - shots.length,
    });
    if (!res.canceled) setShots((x) => [...x, ...res.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
  }

  function send(photos = shots) {
    s.setPhotos(photos);
    setShots([]);
    router.push('/loading');
  }

  const c = HOME_CARDS[card];
  const hasShots = shots.length > 0;

  return (
    <View style={styles.root}>
      {perm?.granted ? (
        <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: C.night }]} />
      )}
      <View style={styles.shadeTop} pointerEvents="none" />
      <View style={styles.shadeBottom} pointerEvents="none" />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <Row gap={12} style={styles.header}>
          <View style={styles.avatar}>
            <Mascot mood="happy" size={40} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt size={22} weight="bold" color="#FFFFFF">
              {hasShots ? 'עוד מדף?' : `${greeting()} מה יש במקרר?`}
            </Txt>
            <Txt size={14} color="#E3F1F9">
              {hasShots ? 'צילום של הדלת או המגירה עוזר לי לראות יותר.' : 'פתח את המקרר וצלם את כל המדפים.'}
            </Txt>
          </View>
        </Row>

        <View style={{ flex: 1 }} />

        {!hasShots && (
          <Pressable style={styles.card} onPress={() => setCard((card + 1) % HOME_CARDS.length)}>
            <Row gap={10}>
              <Txt size={18} weight="bold" color={C.warn} align="center" style={{ width: 22 }}>
                {c.icon}
              </Txt>
              <View style={{ flex: 1 }}>
                <Txt size={14} weight="semibold">
                  {c.title}
                </Txt>
                <Txt size={12} color={C.muted}>
                  {c.sub}
                </Txt>
              </View>
            </Row>
          </Pressable>
        )}

        {hasShots && (
          <Row gap={8} style={styles.thumbs}>
            {shots.map((u, i) => (
              <Pressable key={u} onPress={() => setShots(shots.filter((_, k) => k !== i))} accessibilityLabel="הסר תמונה">
                <Image source={{ uri: u }} style={styles.thumb} contentFit="cover" />
                <View style={styles.thumbX}>
                  <Txt size={11} weight="bold" color="#FFFFFF" align="center">
                    ✕
                  </Txt>
                </View>
              </Pressable>
            ))}
            <Txt size={12} color="#E3F1F9">{`${shots.length}/${MAX_PHOTOS}`}</Txt>
          </Row>
        )}

        <Row style={styles.controls}>
          {hasShots ? (
            <Pressable style={[styles.side, styles.sendBtn]} onPress={() => send()} accessibilityRole="button">
              <Txt size={15} weight="semibold" color="#FFFFFF" align="center">
                מצא מתכון ›
              </Txt>
            </Pressable>
          ) : (
            <Pressable style={styles.side} onPress={() => router.push(s.staples ? '/shopping' : '/staples')} accessibilityRole="button">
              <Txt size={14} weight="medium" color="#FFFFFF" align="center">
                🛒 לסופר
              </Txt>
            </Pressable>
          )}
          <Pressable
            style={[styles.shutter, shots.length >= MAX_PHOTOS && { opacity: 0.4 }]}
            onPress={shoot}
            accessibilityRole="button"
            accessibilityLabel="צלם">
            <View style={[styles.shutterInner, busy && { transform: [{ scale: 0.85 }] }]} />
          </Pressable>
          <Pressable style={styles.side} onPress={fromGallery} accessibilityRole="button">
            <Txt size={14} weight="medium" color="#FFFFFF" align="center">
              🖼 גלריה
            </Txt>
          </Pressable>
        </Row>

        {!hasShots && (
          <Pressable onPress={() => send([])} accessibilityRole="button" style={{ paddingVertical: 6 }}>
            <Txt size={12} color="#B9D3E3" align="center" style={{ textDecorationLine: 'underline' }}>
              אין מקרר מול העיניים? נסה דוגמה
            </Txt>
          </Pressable>
        )}
      </SafeAreaView>

      <Sheet
        visible={askPermission}
        onClose={() => setAskPermission(false)}
        mood="happy"
        title="אני צריך לראות את המקרר"
        body="המצלמה משמשת רק לצילום המקרר, כדי שאמצא לך מתכון. בלי הרשמה."
        primary={{
          label: 'אפשר מצלמה',
          onPress: async () => {
            s.setCameraExplained(true);
            setAskPermission(false);
            await requestPerm();
          },
        }}
        secondary={{
          label: 'אבחר מהגלריה',
          onPress: () => {
            s.setCameraExplained(true);
            setAskPermission(false);
            fromGallery();
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.night },
  shadeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 180, backgroundColor: 'rgba(15,42,61,0.55)' },
  shadeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 230, backgroundColor: 'rgba(15,42,61,0.55)' },
  overlay: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 12, alignItems: 'flex-start' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  card: { marginHorizontal: 20, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 },
  thumbs: { paddingHorizontal: 20, marginBottom: 14 },
  thumb: { width: 54, height: 72, borderRadius: 10, borderWidth: 2, borderColor: '#FFFFFF' },
  thumbX: { position: 'absolute', top: -6, left: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: C.ink, justifyContent: 'center' },
  controls: { justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 6 },
  side: { width: 104, paddingVertical: 11, borderRadius: R.chip, backgroundColor: 'rgba(255,255,255,0.18)' },
  sendBtn: { backgroundColor: C.accent },
  shutter: { width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#FFFFFF' },
});

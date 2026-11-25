import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Button, Chip, Mascot, Row, Screen, Sheet, Txt } from '@/components/ui';
import { success } from '@/lib/haptics';
import { useStore } from '@/state/store';
import { C, R } from '@/theme';

export default function Cooked() {
  const s = useStore();
  const [askReminder, setAskReminder] = useState(false);
  const [time, setTime] = useState('19:00');
  const [weekly, setWeekly] = useState(true);
  const [rated, setRated] = useState(false);

  const home = () => router.dismissTo('/camera');
  const last = s.lastCook;
  const t = s.totals;

  useEffect(() => {
    success();
  }, []);

  return (
    <Screen>
      <Confetti />
      <View style={styles.center}>
        <Mascot mood="happy" size={200} />
        <Txt size={30} weight="bold" align="center">
          כל הכבוד, שף!
        </Txt>
        {last && last.rescued.length > 0 ? (
          <View style={styles.rescue}>
            <Txt size={17} weight="bold" color={C.fresh} align="center">
              {`🛟 הצלת ${last.rescued.join(', ')}`}
            </Txt>
            <Txt size={14} color={C.fresh} align="center">{`במקום לזרוק, כ-₪${last.value} שלא הלכו לפח`}</Txt>
          </View>
        ) : (
          <Txt size={16} color={C.muted} align="center">
            בישלת ממה שיש בבית, בלי משלוח.
          </Txt>
        )}
        <Txt size={16} color={C.muted} align="center">
          איך יצא?
        </Txt>
        <Row gap={12} style={{ marginTop: 16 }}>
          <Button
            label="אהבתי!"
            style={{ width: 150 }}
            onPress={() => {
              setRated(true);
              if (!s.reminder) setAskReminder(true);
              else home();
            }}
          />
          <Button label="לא משהו" kind="secondary" style={{ width: 150 }} onPress={home} />
        </Row>
        <Txt size={13} color={C.muted} align="center">
          Louie יזכור את זה למתכון הבא
        </Txt>
        <View style={styles.streak}>
          <Txt size={14} weight="semibold" color={C.fresh} align="center">
            {t.rescued > 0 ? `עד עכשיו: ${t.meals} ארוחות · ${t.rescued} מצרכים הוצלו · כ-₪${t.saved}` : `עד עכשיו: ${t.meals} ארוחות שבישלת`}
          </Txt>
        </View>
        {rated && s.reminder && (
          <Txt size={13} color={C.muted} align="center">
            {`תזכורת נקבעה ל-${s.reminder.time}`}
          </Txt>
        )}
      </View>

      {/* Ask for notifications only at the success moment. Real push permission is requested here later. */}
      <Sheet
        visible={askReminder}
        onClose={() => setAskReminder(false)}
        mood="happy"
        title="שאזכיר לך מחר בערב?"
        body="אשלח הודעה קצרה כשמגיע זמן ארוחת ערב. אפשר לבטל בכל רגע."
        primary={{
          label: 'כן, תזכיר לי',
          onPress: () => {
            s.setReminder({ time, weekly });
            setAskReminder(false);
            home();
          },
        }}
        secondary={{
          label: 'לא עכשיו',
          onPress: () => {
            setAskReminder(false);
            home();
          },
        }}>
        <Row gap={8}>
          {['18:00', '19:00', '20:00'].map((t) => (
            <Chip key={t} label={t} selected={time === t} onPress={() => setTime(t)} />
          ))}
        </Row>
        <Pressable style={styles.weekly} onPress={() => setWeekly(!weekly)} accessibilityRole="switch" accessibilityState={{ checked: weekly }}>
          <Row gap={12}>
            <Txt size={14} weight="medium" style={{ flex: 1 }}>
              וגם ביום חמישי, לפני קניות: מה חסר בבית
            </Txt>
            <View style={[styles.toggle, { backgroundColor: weekly ? C.fresh : C.line, alignItems: weekly ? 'flex-end' : 'flex-start' }]}>
              <View style={styles.knob} />
            </View>
          </Row>
        </Pressable>
      </Sheet>
    </Screen>
  );
}

const COLORS = [C.accent, C.skyLight, C.fresh, C.warn, '#FF7AA8'];

// A short burst of confetti, built from plain views (no extra library).
function Confetti() {
  const { width } = useWindowDimensions();
  const pieces = useRef(
    Array.from({ length: 26 }, (_, i) => ({
      x: Math.random(),
      drift: (Math.random() - 0.5) * 120,
      spin: Math.random() * 720 - 360,
      delay: Math.random() * 250,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 6,
      v: new Animated.Value(0),
    })),
  ).current;
  useEffect(() => {
    Animated.parallel(
      pieces.map((p) => Animated.timing(p.v, { toValue: 1, duration: 1800, delay: p.delay, easing: Easing.out(Easing.quad), useNativeDriver: true })),
    ).start();
  }, [pieces]);
  const w = Math.min(width, 480);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', alignItems: 'center' }]}>
      <View style={{ width: w, flex: 1 }}>
        {pieces.map((p, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: -20,
              left: p.x * w,
              width: p.size,
              height: p.size * 1.6,
              borderRadius: 2,
              backgroundColor: p.color,
              opacity: p.v.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, 560] }) },
                { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
                { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
              ],
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rescue: { backgroundColor: C.freshSoft, borderRadius: R.card, paddingVertical: 12, paddingHorizontal: 18, gap: 2, marginTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  streak: { marginTop: 16, backgroundColor: C.freshSoft, borderRadius: R.chip, paddingVertical: 8, paddingHorizontal: 16 },
  weekly: { alignSelf: 'stretch', backgroundColor: C.bg, borderRadius: 16, padding: 14 },
  toggle: { width: 48, borderRadius: 999, padding: 3 },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
});

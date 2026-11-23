import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Chip, Mascot, Row, Screen, Sheet, Txt } from '@/components/ui';
import { useStore } from '@/state/store';
import { C, R } from '@/theme';

export default function Cooked() {
  const s = useStore();
  const [askReminder, setAskReminder] = useState(false);
  const [time, setTime] = useState('19:00');
  const [weekly, setWeekly] = useState(true);
  const [rated, setRated] = useState(false);

  const home = () => router.dismissTo('/camera');

  return (
    <Screen>
      <View style={styles.center}>
        <Mascot mood="happy" size={200} />
        <Txt size={30} weight="bold" align="center">
          כל הכבוד, שף!
        </Txt>
        <Txt size={16} color={C.muted} align="center">
          חסכת בערך ₪60 על משלוח. איך יצא?
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
            {`ארוחה ${s.mealsThisWeek} שבישלת השבוע`}
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

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  streak: { marginTop: 16, backgroundColor: C.freshSoft, borderRadius: R.chip, paddingVertical: 8, paddingHorizontal: 16 },
  weekly: { alignSelf: 'stretch', backgroundColor: C.bg, borderRadius: 16, padding: 14 },
  toggle: { width: 48, borderRadius: 999, padding: 3 },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
});

import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Row, Screen, Txt } from '@/components/ui';
import { useStore } from '@/state/store';
import { C } from '@/theme';

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

export default function Cook() {
  useKeepAwake(); // screen stays on while cooking
  const s = useStore();
  const steps = s.recipe.steps;
  const [i, setI] = useState(0);
  const step = steps[i];
  const [left, setLeft] = useState(step.timerSec ?? 0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setLeft(steps[i].timerSec ?? 0);
    setRunning(false);
  }, [i, steps]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((l) => (l <= 1 ? (setRunning(false), 0) : l - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);

  const last = i === steps.length - 1;
  const total = step.timerSec ?? 0;

  return (
    <Screen>
      <View style={styles.header}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Txt size={15} weight="semibold" color={C.accent}>
              {`שלב ${i + 1} מתוך ${steps.length}`}
            </Txt>
            <Txt size={13} color={C.muted}>
              {s.recipe.title}
            </Txt>
          </View>
          <Pressable style={styles.close} onPress={() => router.back()} accessibilityLabel="חזרה למתכון">
            <Txt size={16} align="center">
              ✕
            </Txt>
          </Pressable>
        </Row>
        <Row gap={6}>
          {steps.map((_, k) => (
            <View key={k} style={[styles.seg, { backgroundColor: k <= i ? C.accent : C.line }]} />
          ))}
        </Row>
      </View>

      <View style={styles.body}>
        <Txt size={32} weight="bold">
          {step.text}
        </Txt>
        {step.tip && (
          <Txt size={17} color={C.muted}>
            {`טיפ: ${step.tip}`}
          </Txt>
        )}

        {total > 0 && (
          <View style={styles.timerWrap}>
            <View style={[styles.ring, { borderColor: running ? C.accent : C.accentSoft }]}>
              <Txt size={48} weight="bold" align="center">
                {mmss(left)}
              </Txt>
              <Txt size={14} color={C.muted} align="center">
                {left === 0 ? 'מוכן!' : running ? 'נשאר לבשל' : 'טיימר'}
              </Txt>
            </View>
            <Button
              kind="secondary"
              height={46}
              label={running ? 'עצור טיימר' : left === total ? 'הפעל טיימר' : left === 0 ? 'שוב מההתחלה' : 'המשך טיימר'}
              onPress={() => {
                if (left === 0) setLeft(total);
                setRunning(!running || left === 0);
              }}
            />
          </View>
        )}
      </View>

      <Txt size={13} color={C.muted} align="center">
        המסך נשאר דולק בזמן הבישול
      </Txt>
      <Row gap={12} style={styles.actions}>
        <Button
          label={last ? 'סיימתי!' : 'השלב הבא'}
          style={{ flex: 1 }}
          onPress={() => (last ? (s.addMeal(), router.replace('/cooked')) : setI(i + 1))}
        />
        <Button label="הקודם" kind="secondary" style={{ width: 120 }} disabled={i === 0} onPress={() => setI(i - 1)} />
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 16, gap: 12 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  seg: { flex: 1, height: 6, borderRadius: 3 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 32, gap: 12 },
  timerWrap: { alignItems: 'center', gap: 16, marginTop: 24 },
  ring: { width: 220, height: 220, borderRadius: 110, borderWidth: 14, alignItems: 'center', justifyContent: 'center' },
  actions: { paddingHorizontal: 24, paddingVertical: 12 },
});

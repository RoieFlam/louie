import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Row, Screen, Txt } from '@/components/ui';
import { IN_FRIDGE_NOW } from '@/data/mock';
import { useStore } from '@/state/store';
import { C, R } from '@/theme';

export default function Shopping() {
  const s = useStore();
  const missing = useMemo(() => {
    const fromStaples = (s.staples ?? []).filter((x) => !IN_FRIDGE_NOW.includes(x));
    const fromRecipe = s.items.filter((i) => i.status === 'missing').map((i) => i.name);
    return Array.from(new Set([...fromStaples, ...fromRecipe]));
  }, [s.staples, s.items]);
  const [checked, setChecked] = useState<string[]>([]);
  const toggle = (x: string) => setChecked(checked.includes(x) ? checked.filter((c) => c !== x) : [...checked, x]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt size={26} weight="bold">
            רשימת קניות
          </Txt>
          <Pressable onPress={() => router.replace('/staples')} accessibilityRole="button">
            <Txt size={14} weight="medium" color={C.accent}>
              ערוך רשימת בסיס
            </Txt>
          </Pressable>
        </Row>
        <Txt size={15} color={C.muted}>
          {`לפי התמונה האחרונה חסרים ${missing.length} דברים`}
        </Txt>
        <View style={styles.list}>
          {missing.map((x) => {
            const on = checked.includes(x);
            return (
              <Pressable key={x} onPress={() => toggle(x)} style={styles.row} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                <Row gap={12}>
                  <View style={[styles.box, on && { backgroundColor: C.fresh, borderColor: C.fresh }]}>
                    {on && (
                      <Txt size={14} weight="bold" color="#FFFFFF" align="center">
                        ✓
                      </Txt>
                    )}
                  </View>
                  <Txt size={17} weight="medium" color={on ? C.muted : C.ink} style={[{ flex: 1 }, on && { textDecorationLine: 'line-through' }]}>
                    {x}
                  </Txt>
                </Row>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.bottom}>
        <Button label={checked.length === missing.length && missing.length > 0 ? 'קניתי הכל!' : 'חזרה למצלמה'} onPress={() => router.dismissTo('/camera')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 8 },
  list: { backgroundColor: C.surface, borderRadius: R.card, marginTop: 12, overflow: 'hidden' },
  row: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.line },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: 24, paddingVertical: 12 },
});

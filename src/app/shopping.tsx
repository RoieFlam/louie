import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Row, Screen, Txt } from '@/components/ui';
import { useStore } from '@/state/store';
import { C, F, R } from '@/theme';

export default function Shopping() {
  const s = useStore();
  const [extra, setExtra] = useState<string[]>([]);
  const [text, setText] = useState('');
  const auto = useMemo(() => {
    const have = new Set(s.fridge.map((i) => i.name));
    const fromStaples = (s.staples ?? []).filter((x) => !have.has(x));
    const fromRecipe = (s.recipe?.missing ?? []).filter((m) => !m.optional).map((m) => m.name);
    return Array.from(new Set([...fromRecipe, ...fromStaples]));
  }, [s.staples, s.fridge, s.recipe]);
  const missing = Array.from(new Set([...auto, ...extra]));
  function add() {
    const n = text.trim();
    if (n) setExtra([...extra, n]);
    setText('');
  }
  const [checked, setChecked] = useState<string[]>([]);
  const toggle = (x: string) => setChecked(checked.includes(x) ? checked.filter((c) => c !== x) : [...checked, x]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
          {s.fridge.length ? `לפי המקרר שלך חסרים ${missing.length} דברים` : 'עוד לא צילמת את המקרר, אז זו רשימת הבסיס שלך'}
        </Txt>
        <View style={styles.list}>
          <Row gap={8} style={styles.addRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              onSubmitEditing={add}
              returnKeyType="done"
              placeholder="+ להוסיף לרשימה"
              placeholderTextColor={C.muted}
              style={styles.input}
            />
            {!!text.trim() && (
              <Pressable onPress={add} style={styles.addBtn} accessibilityRole="button">
                <Txt size={14} weight="semibold" color={C.onAccent} align="center">
                  הוסף
                </Txt>
              </Pressable>
            )}
          </Row>
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
  addRow: { paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.bg },
  input: { flex: 1, paddingVertical: 8, fontFamily: F.regular, fontSize: 16, textAlign: 'right', writingDirection: 'rtl', color: C.ink },
  addBtn: { backgroundColor: C.accent, borderRadius: R.chip, paddingVertical: 7, paddingHorizontal: 14 },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: 24, paddingVertical: 12 },
});

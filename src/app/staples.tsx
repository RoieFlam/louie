import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip, Row, Screen, Txt, Wrap } from '@/components/ui';
import { DEFAULT_STAPLES, STAPLES } from '@/data/mock';
import { useStore } from '@/state/store';
import { C, F, R } from '@/theme';

// Shown only on the first "going shopping" tap.
export default function Staples() {
  const s = useStore();
  const [picked, setPicked] = useState<string[]>(s.staples ?? DEFAULT_STAPLES);
  const toggle = (x: string) => setPicked(picked.includes(x) ? picked.filter((p) => p !== x) : [...picked, x]);
  // Items the user typed in, shown as chips next to the suggested ones.
  const [custom, setCustom] = useState<string[]>(() => (s.staples ?? []).filter((x) => !STAPLES.includes(x)));
  const [text, setText] = useState('');
  function add() {
    const n = text.trim();
    if (!n) return;
    if (!STAPLES.includes(n) && !custom.includes(n)) setCustom([...custom, n]);
    if (!picked.includes(n)) setPicked([...picked, n]);
    setText('');
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Txt size={26} weight="bold">
          לפני הקנייה הראשונה: מה תמיד צריך להיות בבית?
        </Txt>
        <Txt size={15} color={C.muted}>
          רק הפעם. מעכשיו Louie יבדוק בתמונה מה חסר.
        </Txt>
        <Wrap style={{ marginTop: 12 }}>
          {[...STAPLES, ...custom].map((x) => (
            <Chip key={x} label={x} selected={picked.includes(x)} onPress={() => toggle(x)} />
          ))}
        </Wrap>
        <Row gap={8} style={styles.addRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={add}
            returnKeyType="done"
            placeholder="+ להוסיף משהו אחר (למשל: טחינה)"
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
      </ScrollView>
      <View style={styles.bottom}>
        <Button
          label={`בנה לי רשימה · ${picked.length} נבחרו`}
          disabled={picked.length === 0}
          onPress={() => {
            s.setStaples(picked);
            router.replace('/shopping');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 8 },
  addRow: { marginTop: 12, backgroundColor: C.surface, borderRadius: R.card, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 6 },
  input: { flex: 1, paddingVertical: 8, fontFamily: F.regular, fontSize: 16, textAlign: 'right', writingDirection: 'rtl', color: C.ink },
  addBtn: { backgroundColor: C.accent, borderRadius: R.chip, paddingVertical: 7, paddingHorizontal: 14 },
  bottom: { paddingHorizontal: 24, paddingVertical: 12 },
});

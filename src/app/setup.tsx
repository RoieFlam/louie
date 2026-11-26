import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip, LouieSays, Row, Screen, Txt, Wrap } from '@/components/ui';
import { tap } from '@/lib/haptics';
import { PLACES, STARTER, guessPlace, toKitchen, type Place } from '@/lib/kitchen';
import { useStore } from '@/state/store';
import { C, F, R } from '@/theme';

// First run: a typical student kitchen is already ticked. Untick what's missing,
// add what's special, done. The first recipe needs no photo and no typing.
export default function Setup() {
  const s = useStore();
  const [picked, setPicked] = useState<Record<Place, string[]>>(() => ({
    fridge: STARTER.fridge.filter((x) => x.on).map((x) => x.name),
    pantry: STARTER.pantry.filter((x) => x.on).map((x) => x.name),
    freezer: STARTER.freezer.filter((x) => x.on).map((x) => x.name),
  }));
  const [custom, setCustom] = useState<Record<Place, string[]>>({ fridge: [], pantry: [], freezer: [] });
  const [text, setText] = useState('');

  function toggle(place: Place, name: string) {
    tap();
    const on = picked[place].includes(name);
    setPicked({ ...picked, [place]: on ? picked[place].filter((n) => n !== name) : [...picked[place], name] });
  }

  function add() {
    const names = text
      .split(/\s*,\s*/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (!names.length) return;
    const nextPicked = { ...picked };
    const nextCustom = { ...custom };
    for (const n of names) {
      const place = guessPlace(n);
      if (!STARTER[place].some((x) => x.name === n) && !nextCustom[place].includes(n)) nextCustom[place] = [...nextCustom[place], n];
      if (!nextPicked[place].includes(n)) nextPicked[place] = [...nextPicked[place], n];
    }
    setCustom(nextCustom);
    setPicked(nextPicked);
    setText('');
  }

  const total = picked.fridge.length + picked.pantry.length + picked.freezer.length;

  function done(thenCamera = false) {
    const items = PLACES.flatMap((p) => toKitchen(picked[p.id].map((name) => ({ name, place: p.id }))));
    s.finishSetup(items);
    // What's at home now is also the base shopping list: when something runs out, it shows up there.
    if (!s.staples) s.setStaples(items.map((i) => i.name));
    router.replace('/home');
    if (thenCamera) router.push('/camera');
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Txt size={26} weight="bold">
          מה יש אצלך בבית?
        </Txt>
        <LouieSays mood="curious">סימנתי מה שיש כמעט בכל מטבח. מה שאין, לוחצים ומורידים. זה לוקח חצי דקה.</LouieSays>

        <View style={styles.addRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={add}
            returnKeyType="done"
            placeholder="+ עוד משהו? (למשל: טחינה, קוסקוס)"
            placeholderTextColor={C.muted}
            style={styles.input}
          />
          {!!text.trim() && (
            <Pressable onPress={add} style={styles.addBtn} accessibilityRole="button">
              <Txt size={14} weight="semibold" color={C.onAccent} align="center">
                הוספה
              </Txt>
            </Pressable>
          )}
        </View>

        {PLACES.map((p) => (
          <View key={p.id} style={{ gap: 10 }}>
            <Txt size={17} weight="semibold">{`${p.icon} ${p.label}`}</Txt>
            <Wrap>
              {[...STARTER[p.id].map((x) => x.name), ...custom[p.id]].map((name) => (
                <Chip key={name} label={name} selected={picked[p.id].includes(name)} onPress={() => toggle(p.id, name)} />
              ))}
            </Wrap>
          </View>
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <Button label={total ? `מוכן · ${total} דברים במטבח` : 'מוכן'} onPress={() => done()} />
        <Pressable onPress={() => done(true)} accessibilityRole="button" style={{ paddingVertical: 6 }}>
          <Txt size={14} weight="medium" color={C.accent} align="center">
            📷 או לצלם את המקרר, ואני אוסיף מה שאני רואה
          </Txt>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 18 },
  addRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  input: { flex: 1, paddingVertical: 10, fontFamily: F.regular, fontSize: 16, textAlign: 'right', writingDirection: 'rtl', color: C.ink },
  addBtn: { backgroundColor: C.accent, borderRadius: R.chip, paddingVertical: 7, paddingHorizontal: 14 },
  actions: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 4, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg },
});

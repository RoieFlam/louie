import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, LouieSays, Row, Screen, TopBar, Txt } from '@/components/ui';
import { success, tap } from '@/lib/haptics';
import { toKitchen } from '@/lib/kitchen';
import { useStore } from '@/state/store';
import { C, F, R } from '@/theme';

// Step 2: "what I found". The user fixes the list, then it is merged into the kitchen
// (as fridge items). Recipes are asked for from the kitchen, as text only.
export default function Review() {
  const s = useStore();
  const [text, setText] = useState('');
  const [zoom, setZoom] = useState<string | null>(null);
  const items = s.fridge;

  function remove(name: string) {
    s.setFridge(items.filter((i) => i.name !== name));
  }
  function toggle(name: string) {
    tap();
    s.setFridge(items.map((i) => (i.name === name ? { ...i, expiring: !i.expiring } : i)));
  }
  function add() {
    const n = text.trim();
    if (!n) return;
    if (!items.some((i) => i.name === n)) s.setFridge([{ name: n, expiring: false }, ...items]);
    setText('');
  }

  function updateKitchen() {
    s.addToKitchen(toKitchen(items.map((i) => ({ name: i.name, place: 'fridge' as const, expiring: i.expiring }))));
    success();
    router.dismissTo('/home');
  }

  const few = items.length < 4;
  const atRisk = items.filter((i) => i.expiring).length;

  return (
    <Screen>
      <TopBar step={1} onClose={() => router.dismissTo('/home')} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={s.photos.length ? [1] : undefined}>
        <LouieSays mood={few ? 'sad' : atRisk > 0 ? 'happy' : 'curious'} hop={atRisk}>
          {few
            ? 'המקרר די ריק. אפשר להוסיף כאן מה שפספסתי.'
            : atRisk > 0
              ? `מצאתי ${items.length} דברים, ו-${atRisk} מהם עומדים להיגמר. נציל אותם 🛟`
              : `מצאתי ${items.length} דברים. משהו עומד להיגמר? לחיצה על "טרי" ואציל אותו קודם.`}
        </LouieSays>

        {s.photos.length > 0 && (
          <Row gap={8} style={styles.photoBar}>
            {s.photos.map((u) => (
              <Pressable key={u} onPress={() => setZoom(u)} accessibilityRole="imagebutton" accessibilityLabel="הגדל תמונה" style={{ flex: 1 }}>
                <Image source={{ uri: u }} style={styles.photo} contentFit="cover" />
                <View style={styles.zoomHint}>
                  <Txt size={11} weight="semibold" align="center">
                    הגדלה ⤢
                  </Txt>
                </View>
              </Pressable>
            ))}
          </Row>
        )}

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <Row gap={8} style={styles.addRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              onSubmitEditing={add}
              returnKeyType="done"
              placeholder="+ להוסיף משהו שפספסתי"
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
          {items.map((i, k) => (
            <Row key={i.name} gap={10} style={[styles.row, k === items.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.dot, { backgroundColor: i.expiring ? C.warn : C.fresh }]} />
              <Txt size={16} weight="medium" style={{ flex: 1 }}>
                {i.name}
              </Txt>
              <Pressable
                onPress={() => toggle(i.name)}
                accessibilityRole="button"
                accessibilityState={{ selected: i.expiring }}
                style={[styles.tag, i.expiring && styles.tagOn]}>
                <Txt size={12} weight="medium" color={i.expiring ? C.ink : C.muted} align="center">
                  {i.expiring ? 'עומד להיגמר' : 'טרי'}
                </Txt>
              </Pressable>
              <Pressable onPress={() => remove(i.name)} accessibilityRole="button" accessibilityLabel={`מחק ${i.name}`} hitSlop={8} style={styles.x}>
                <Txt size={13} weight="bold" color={C.muted} align="center">
                  ✕
                </Txt>
              </Pressable>
            </Row>
          ))}
        </Card>
        <Txt size={13} color={C.muted} align="center">
          ✕ מוחק מצרך. לחיצה על "טרי" מסמנת שהוא עומד להיגמר, ואני אנסה להציל אותו.
        </Txt>
      </ScrollView>

      <View style={styles.actions}>
        <Button label={`לעדכן את המטבח · ${items.length} דברים`} disabled={items.length === 0} onPress={updateKitchen} />
      </View>

      <Modal visible={!!zoom} transparent animationType="fade" onRequestClose={() => setZoom(null)}>
        <View style={styles.zoomBg}>
          {zoom && <Image source={{ uri: zoom }} style={StyleSheet.absoluteFill} contentFit="contain" />}
          <SafeAreaView edges={['top']} style={{ alignItems: 'flex-start', padding: 16 }}>
            <Pressable onPress={() => setZoom(null)} accessibilityRole="button" accessibilityLabel="סגור" style={styles.zoomClose}>
              <Txt size={16} align="center" color="#FFFFFF">
                ✕
              </Txt>
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 14 },
  addRow: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.bg },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontFamily: F.regular,
    fontSize: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: C.ink,
  },
  addBtn: { backgroundColor: C.accent, borderRadius: R.chip, paddingVertical: 7, paddingHorizontal: 14 },
  row: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.line },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tag: { borderRadius: R.chip, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: C.line },
  tagOn: { backgroundColor: C.warnSoft, borderColor: C.warnSoft },
  x: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg, justifyContent: 'center' },
  photoBar: { backgroundColor: C.bg, paddingVertical: 6 },
  photo: { height: 140, borderRadius: 16, backgroundColor: C.surface },
  zoomHint: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  zoomBg: { flex: 1, backgroundColor: '#000000' },
  zoomClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center' },
  actions: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, gap: 8, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg },
});

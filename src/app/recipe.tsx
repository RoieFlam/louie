import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip, Mascot, Row, Screen, Sheet, Txt, Wrap } from '@/components/ui';
import { PREF_QUESTIONS, REASONS, type Item, type ItemStatus } from '@/data/mock';
import { useStore } from '@/state/store';
import { C, F, R } from '@/theme';

const nextStatus: Record<ItemStatus, ItemStatus | null> = { have: 'expiring', expiring: 'missing', missing: null };

const chipLabel = (i: Item) => (i.status === 'missing' ? `חסר: ${i.name}` : i.name) + (i.note ? ` · ${i.note}` : '');

export default function RecipeScreen() {
  const s = useStore();
  const r = s.recipe;
  const [editing, setEditing] = useState<Item | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [other, setOther] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  const used = s.items.filter((i) => i.inRecipe || i.status === 'missing');
  const rest = s.items.filter((i) => !i.inRecipe && i.status !== 'missing');

  // One preference question per session, only one not answered yet.
  const pref = useMemo(() => PREF_QUESTIONS.find((p) => !s.prefs[p.id]), [s.prefs]);
  const [showPref] = useState(() => !s.prefAskedThisSession && !!pref);

  function cycle(item: Item) {
    const n = nextStatus[item.status];
    s.setItems(n ? s.items.map((i) => (i.name === item.name ? { ...i, status: n } : i)) : s.items.filter((i) => i.name !== item.name));
    setEditing(null);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt size={14} weight="medium" color={C.muted}>
            הערב אצלך:
          </Txt>
          <Pressable style={styles.close} onPress={() => router.dismissTo('/camera')} accessibilityLabel="סגור">
            <Txt size={16} align="center">
              ✕
            </Txt>
          </Pressable>
        </Row>

        <View style={styles.hero}>
          <Txt size={84} align="center" style={{ lineHeight: 100 }}>
            {r.emoji}
          </Txt>
          <View style={styles.heroMascot}>
            <Mascot mood="happy" size={72} />
          </View>
        </View>

        <Txt size={28} weight="bold" style={{ marginTop: 4 }}>
          {r.title}
        </Txt>
        <Row gap={6}>
          {[`${r.minutes} דק׳`, r.extraCost ? `₪${r.extraCost} לקנות` : 'בלי לקנות כלום', r.level].map((m) => (
            <View key={m} style={styles.meta}>
              <Txt size={13} weight="medium" color={C.accent}>
                {m}
              </Txt>
            </View>
          ))}
        </Row>

        <Txt size={17} weight="semibold" style={styles.section}>
          מה צריך
        </Txt>
        <Wrap>
          {used.map((i) => (
            <Chip key={i.name} dot tone={i.status} label={chipLabel(i)} onPress={() => setEditing(i)} />
          ))}
        </Wrap>
        <Pressable onPress={() => setShowAll(true)} accessibilityRole="button" style={{ paddingVertical: 4 }}>
          <Txt size={14} weight="medium" color={C.accent}>
            {rest.length > 0 ? `ועוד ${rest.length} דברים שראיתי במקרר · תיקון ›` : 'פספסתי משהו? תיקון ›'}
          </Txt>
        </Pressable>

        <Txt size={17} weight="semibold" style={styles.section}>
          {`איך מכינים · ${r.steps.length} שלבים`}
        </Txt>
        <View style={{ gap: 8 }}>
          {r.steps.map((st, k) => (
            <Row key={k} gap={10} style={{ alignItems: 'flex-start' }}>
              <View style={styles.num}>
                <Txt size={13} weight="bold" color={C.accent} align="center">
                  {k + 1}
                </Txt>
              </View>
              <Txt size={15} color={C.ink} style={{ flex: 1 }}>
                {st.text}
              </Txt>
            </Row>
          ))}
        </View>

        {showPref && pref && (
          <View style={styles.pref}>
            {s.prefs[pref.id] ? (
              <Txt size={14} weight="semibold">
                תודה! אזכור את זה.
              </Txt>
            ) : (
              <>
                <Txt size={14} weight="semibold">
                  {pref.q}
                </Txt>
                <Row>
                  {pref.answers.map((a) => (
                    <Pressable
                      key={a}
                      style={styles.answer}
                      onPress={() => {
                        s.answerPref(pref.id, a);
                        s.setPrefAskedThisSession(true);
                      }}>
                      <Txt size={13} weight="medium" align="center">
                        {a}
                      </Txt>
                    </Pressable>
                  ))}
                </Row>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <Row gap={12} style={styles.actions}>
        <Button label="מתחילים לבשל" style={{ flex: 1 }} onPress={() => router.push('/cook')} />
        <Button label="משהו אחר" kind="secondary" style={{ width: 120 }} onPress={() => setOther(true)} />
      </Row>

      <Sheet
        visible={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? editing.name : ''}
        body="מה נכון?"
        primary={{
          label: editing?.status === 'have' ? 'עומד להיגמר' : editing?.status === 'expiring' ? 'בעצם אין לי' : 'להוריד מהרשימה',
          onPress: () => editing && cycle(editing),
        }}
        secondary={{ label: 'זה נכון', onPress: () => setEditing(null) }}
      />

      <Sheet
        visible={showAll}
        onClose={() => setShowAll(false)}
        title="מה ראיתי במקרר"
        body="לחיצה על מצרך כדי לתקן."
        primary={{ label: 'סגור', onPress: () => setShowAll(false) }}
        secondary={{
          label: '+ הוסף משהו שפספסתי',
          onPress: () => {
            setShowAll(false);
            setAdding(true);
          },
        }}>
        <ScrollView style={{ maxHeight: 260, alignSelf: 'stretch' }}>
          <Wrap style={{ justifyContent: 'center' }}>
            {s.items.map((i) => (
              <Chip
                key={i.name}
                dot
                tone={i.status}
                label={chipLabel(i)}
                onPress={() => {
                  setShowAll(false);
                  setEditing(i);
                }}
              />
            ))}
          </Wrap>
        </ScrollView>
      </Sheet>

      <Sheet
        visible={adding}
        onClose={() => setAdding(false)}
        title="מה פספסתי?"
        primary={{
          label: 'הוסף',
          disabled: !newItem.trim(),
          onPress: () => {
            s.setItems([...s.items, { name: newItem.trim(), status: 'have' }]);
            setNewItem('');
            setAdding(false);
          },
        }}>
        <TextInput
          value={newItem}
          onChangeText={setNewItem}
          placeholder="למשל: גבינה צהובה"
          placeholderTextColor={C.muted}
          style={styles.input}
          autoFocus
        />
      </Sheet>

      <Sheet
        visible={other}
        onClose={() => setOther(false)}
        title="מה לשנות?"
        body="בחירה אחת מספיקה. אמצא משהו אחר ממה שיש לך."
        primary={{
          label: 'תן לי משהו אחר',
          onPress: () => {
            if (s.photos.length) s.setChangeRequest(reason ?? 'משהו אחר לגמרי');
            else s.nextRecipe(reason ?? undefined);
            setOther(false);
            router.replace('/loading');
          },
        }}
        secondary={{ label: 'בעצם זה טוב', onPress: () => setOther(false) }}>
        <Wrap style={{ justifyContent: 'center' }}>
          {REASONS.map((x) => (
            <Chip key={x} label={x} selected={reason === x} onPress={() => setReason(reason === x ? null : x)} />
          ))}
        </Wrap>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24, gap: 10 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 170, borderRadius: 24, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  heroMascot: { position: 'absolute', bottom: 4, left: 8 },
  meta: { backgroundColor: C.surface, borderRadius: R.chip, paddingVertical: 5, paddingHorizontal: 10 },
  section: { marginTop: 10 },
  num: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.accentSoft, justifyContent: 'center' },
  pref: { backgroundColor: C.surface, borderRadius: R.card, padding: 14, gap: 10, marginTop: 10, borderWidth: 1, borderColor: C.line },
  answer: { backgroundColor: C.bg, borderRadius: R.chip, paddingVertical: 7, paddingHorizontal: 12 },
  actions: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg },
  input: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: F.regular,
    fontSize: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: C.ink,
  },
});

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip, Mascot, Row, Screen, Sheet, Txt, Wrap } from '@/components/ui';
import { PREF_QUESTIONS, REASONS, type Item, type ItemStatus } from '@/data/mock';
import { useStore } from '@/state/store';
import { C, F, R } from '@/theme';

const nextStatus: Record<ItemStatus, ItemStatus | null> = { have: 'expiring', expiring: 'missing', missing: null };

export default function RecipeScreen() {
  const s = useStore();
  const r = s.recipe;
  const [editing, setEditing] = useState<Item | null>(null);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [other, setOther] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

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
          <View style={styles.badge}>
            <Txt size={13} weight="medium" color={C.accent}>
              {`Louie מצא ${s.items.filter((i) => i.status !== 'missing').length} מצרכים`}
            </Txt>
          </View>
          <Pressable style={styles.close} onPress={() => router.dismissTo('/camera')} accessibilityLabel="סגור">
            <Txt size={16} align="center">
              ✕
            </Txt>
          </Pressable>
        </Row>

        <View style={styles.hero}>
          <View style={styles.plate}>
            <Txt size={88} align="center" style={{ lineHeight: 100 }}>
              {r.emoji}
            </Txt>
          </View>
          <View style={styles.heroMascot}>
            <Mascot mood="happy" size={86} />
          </View>
        </View>

        <Txt size={26} weight="bold">
          {r.title}
        </Txt>
        <Txt size={14} color={C.muted}>
          {`${r.minutes} דקות · ₪${r.extraCost} נוספים · ${r.level}`}
        </Txt>

        <Txt size={16} weight="semibold" style={{ marginTop: 12 }}>
          מה ראיתי במקרר
        </Txt>
        <Wrap>
          {s.items.map((i) => (
            <Chip
              key={i.name}
              dot
              tone={i.status}
              label={i.note ? `${i.status === 'missing' ? 'חסר: ' : ''}${i.name} · ${i.note}` : i.name}
              onPress={() => setEditing(i)}
            />
          ))}
          <Chip label="+ הוסף" onPress={() => setAdding(true)} />
        </Wrap>
        <Txt size={13} weight="medium" color={C.accent}>
          אפשר ללחוץ על מצרך כדי לתקן, או להוסיף מה שפספסתי
        </Txt>

        <Txt size={14} color={C.muted} style={{ marginTop: 8 }}>
          {`איך מכינים: ${r.steps.length} שלבים, אחד בכל מסך, עם טיימר`}
        </Txt>

        {showPref && pref && (
          <View style={styles.pref}>
            {s.prefs[pref.id] ? (
              <Txt size={15} weight="semibold">
                תודה! אזכור את זה.
              </Txt>
            ) : (
              <>
                <Txt size={15} weight="semibold">
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
                      <Txt size={14} weight="medium" align="center">
                        {a}
                      </Txt>
                    </Pressable>
                  ))}
                </Row>
                <Txt size={12} color={C.muted}>
                  אפשר לדלג. Louie ישאל שאלה אחת בכל פעם.
                </Txt>
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
        secondary={{ label: 'זה נכון, יש לי', onPress: () => setEditing(null) }}
      />

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
        body="בחירה אחת מספיקה. Louie ימצא משהו אחר ממה שיש לך."
        primary={{
          label: 'תן לי משהו אחר',
          onPress: () => {
            if (s.photoUri) s.setChangeRequest(reason ?? 'משהו אחר לגמרי');
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
  content: { padding: 24, paddingBottom: 24, gap: 10 },
  badge: { backgroundColor: C.accentSoft, borderRadius: R.chip, paddingVertical: 6, paddingHorizontal: 12 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 210, borderRadius: 24, backgroundColor: C.sky, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  plate: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  heroMascot: { position: 'absolute', bottom: 6, left: 10 },
  pref: { backgroundColor: C.accentSoft, borderRadius: R.card, padding: 16, gap: 10, marginTop: 6 },
  answer: { backgroundColor: C.surface, borderRadius: R.chip, paddingVertical: 8, paddingHorizontal: 14 },
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

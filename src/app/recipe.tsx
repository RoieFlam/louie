import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, LouieSays, Row, Screen, Sheet, TopBar, Txt, Wrap } from '@/components/ui';
import { PREF_QUESTIONS, REASONS } from '@/data/mock';
import { suggestRecipes } from '@/lib/analyze';
import { sampleOptions, useStore } from '@/state/store';
import { C, R } from '@/theme';

// Step 3: three ideas from one cheap text call. Pick one, see what it needs, cook.
export default function RecipeScreen() {
  const s = useStore();
  const [sel, setSel] = useState(0);
  const [other, setOther] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shift, setShift] = useState(1);

  const r = s.options[sel] ?? s.options[0];

  // One preference question per session, only one not answered yet.
  const pref = useMemo(() => PREF_QUESTIONS.find((p) => !s.prefs[p.id]), [s.prefs]);
  const [showPref] = useState(() => !s.prefAskedThisSession && !!pref);

  async function more() {
    setOther(false);
    setError(null);
    if (s.sampleMode) {
      s.setOptions(sampleOptions(shift));
      setShift(shift + 1);
      setSel(0);
      return;
    }
    setBusy(true);
    try {
      const opts = await suggestRecipes(s.fridge, { prefs: s.prefs, changeRequest: reason ?? undefined, avoidTitles: s.seenTitles });
      s.setOptions(opts);
      setSel(0);
    } catch {
      setError('לא הצלחתי למצוא רעיונות אחרים. נסה שוב.');
    } finally {
      setBusy(false);
      setReason(null);
    }
  }

  if (!r) {
    return (
      <Screen>
        <TopBar step={2} onClose={() => router.dismissTo('/camera')} />
        <View style={{ padding: 24 }}>
          <Button label="חזרה למצלמה" onPress={() => router.dismissTo('/camera')} />
        </View>
      </Screen>
    );
  }

  const expiring = new Set(s.fridge.filter((i) => i.expiring).map((i) => i.name));

  return (
    <Screen>
      <TopBar step={2} onClose={() => router.dismissTo('/camera')} />
      <ScrollView contentContainerStyle={styles.content}>
        <LouieSays>{busy ? 'מחפש לך 3 רעיונות חדשים…' : 'יש לי 3 רעיונות ממה שיש לך. מה בא לך?'}</LouieSays>

        <Row gap={8} style={{ alignItems: 'stretch' }}>
          {s.options.map((o, k) => {
            const on = k === sel;
            return (
              <Pressable
                key={o.id}
                onPress={() => setSel(k)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.option, on && styles.optionOn, busy && { opacity: 0.4 }]}>
                <Txt size={30} align="center" style={{ lineHeight: 38 }}>
                  {o.emoji}
                </Txt>
                <Txt size={13} weight="semibold" align="center" numberOfLines={2} color={on ? C.accent : C.ink}>
                  {o.title}
                </Txt>
                <Txt size={11} color={C.muted} align="center">
                  {`${o.minutes} דק׳`}
                </Txt>
              </Pressable>
            );
          })}
        </Row>

        {busy ? (
          <View style={{ paddingVertical: 40 }}>
            <ActivityIndicator color={C.accent} />
          </View>
        ) : (
          <Card style={{ gap: 12 }}>
            <Txt size={24} weight="bold">
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

            <Row style={{ justifyContent: 'space-between' }}>
              <Txt size={16} weight="semibold">
                מה צריך
              </Txt>
              <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8}>
                <Txt size={13} weight="medium" color={C.accent}>
                  לתקן את מה שיש לי ›
                </Txt>
              </Pressable>
            </Row>
            <Wrap>
              {r.uses.map((n) => (
                <Chip key={n} dot tone={expiring.has(n) ? 'expiring' : 'have'} label={n} />
              ))}
              {r.missing.map((m) => (
                <Chip key={m.name} dot tone="missing" label={`לקנות: ${m.name}${m.optional ? ' · אפשר בלי' : ''}`} />
              ))}
            </Wrap>

            <Txt size={16} weight="semibold" style={{ marginTop: 4 }}>
              {`איך מכינים · ${r.steps.length} שלבים`}
            </Txt>
            <View style={{ gap: 8 }}>
              {r.steps.map((st, k) => (
                <Row key={k} gap={10} style={{ alignItems: 'flex-start' }}>
                  <View style={styles.num}>
                    <Txt size={12} weight="bold" color={C.accent} align="center">
                      {k + 1}
                    </Txt>
                  </View>
                  <Txt size={15} style={{ flex: 1 }}>
                    {st.text}
                  </Txt>
                </Row>
              ))}
            </View>
          </Card>
        )}

        {error && (
          <Txt size={14} color={C.missing} align="center">
            {error}
          </Txt>
        )}

        {showPref && pref && !busy && (
          <Card style={{ gap: 10 }}>
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
          </Card>
        )}
      </ScrollView>

      <Row gap={12} style={styles.actions}>
        <Button
          label="מתחילים לבשל"
          style={{ flex: 1 }}
          disabled={busy}
          onPress={() => {
            s.setRecipe(r);
            router.push('/cook');
          }}
        />
        <Button label="3 אחרים" kind="secondary" style={{ width: 116 }} disabled={busy} onPress={() => setOther(true)} />
      </Row>

      <Sheet
        visible={other}
        onClose={() => setOther(false)}
        title="מה לשנות?"
        body="אפשר לבחור, אפשר גם סתם. אמצא 3 רעיונות חדשים ממה שיש לך."
        primary={{ label: 'תן לי 3 אחרים', onPress: more }}
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
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 14 },
  option: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: R.card,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 4,
    borderWidth: 2,
    borderColor: C.line,
    alignItems: 'center',
  },
  optionOn: { borderColor: C.accent, backgroundColor: C.accentSoft },
  meta: { backgroundColor: C.accentSoft, borderRadius: R.chip, paddingVertical: 5, paddingHorizontal: 10 },
  num: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.accentSoft, justifyContent: 'center' },
  answer: { backgroundColor: C.bg, borderRadius: R.chip, paddingVertical: 7, paddingHorizontal: 12 },
  actions: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg },
});

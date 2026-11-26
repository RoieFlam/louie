import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Chip, LouieSays, Row, Screen, Txt, Wrap } from '@/components/ui';
import { AnalyzeError, parseSentence, suggestRecipes } from '@/lib/analyze';
import { bump, success, tap } from '@/lib/haptics';
import { PLACES, isStale, mergeKitchen, parseSimple, removeFromKitchen, toKitchen, type KitchenItem, type Parsed } from '@/lib/kitchen';
import { sampleOptions, useStore } from '@/state/store';
import { C, F, R } from '@/theme';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'בוקר טוב!';
  if (h < 17) return 'צהריים טובים!';
  return 'ערב טוב!';
}

type BarResult = { added: string[]; removed: string[]; before: KitchenItem[] };

// Home = "my kitchen". One big question ("what's for dinner?"), the kitchen itself,
// and the Louie bar at the bottom to tell him what changed, in plain words.
export default function Home() {
  const s = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState<BarResult | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const k = s.kitchen;
  const atRisk = k.filter((i) => i.expiring);
  const stale = useMemo(() => k.find((i) => isStale(i) && !i.expiring), [k]);
  const t = s.totals;

  async function dinner(changeRequest?: string, kitchen: KitchenItem[] = k) {
    if (busy) return;
    setError(null);
    bump();
    if (kitchen.length === 0) {
      setError('המטבח ריק. אפשר לכתוב למטה מה יש, או לצלם את המקרר.');
      return;
    }
    s.setFridge(kitchen.map((i) => ({ name: i.name, expiring: i.expiring })));
    if (s.sampleMode) {
      s.setOptions(sampleOptions());
      router.push('/recipe');
      return;
    }
    setBusy(true);
    try {
      const opts = await suggestRecipes(kitchen, { prefs: s.prefs, changeRequest, avoidTitles: s.seenTitles });
      s.setOptions(opts);
      router.push('/recipe');
    } catch (e) {
      setError(e instanceof AnalyzeError && e.code === 'network' ? 'אין חיבור לאינטרנט. ננסה שוב בעוד רגע?' : 'לא הצלחתי למצוא מתכון. ננסה שוב?');
    } finally {
      setBusy(false);
    }
  }

  // Returns the kitchen as it is after the change, for a request in the same sentence.
  function apply(p: Parsed): KitchenItem[] {
    if (!p.add.length && !p.remove.length) return k;
    const next = removeFromKitchen(mergeKitchen(k, toKitchen(p.add)), p.remove);
    s.setKitchen(next);
    success();
    setResult({ added: p.add.map((a) => a.name), removed: p.remove, before: k });
    return next;
  }

  async function send() {
    const msg = text.trim();
    if (!msg || thinking) return;
    setHint(null);
    setResult(null);
    const simple = parseSimple(msg);
    if (simple) {
      apply(simple);
      setText('');
      return;
    }
    setThinking(true);
    try {
      const p = await parseSentence(msg, k.map((i) => i.name));
      setText('');
      const next = apply(p);
      if (p.request) dinner(p.request, next);
      else if (!p.add.length && !p.remove.length) setHint('לא הבנתי עד הסוף. אפשר לכתוב רק את שמות המצרכים, עם פסיקים.');
    } catch {
      setHint('לא הצלחתי להבין עכשיו. אפשר לכתוב רק את שמות המצרכים, עם פסיקים.');
    } finally {
      setThinking(false);
    }
  }

  function undo() {
    if (!result) return;
    tap();
    s.setKitchen(result.before);
    setResult(null);
  }

  const line = busy
    ? 'חושב על 3 רעיונות ממה שיש לך…'
    : k.length === 0
      ? 'המטבח ריק. ספרו לי מה יש, או צלמו את המקרר.'
      : atRisk.length > 0
        ? `${greeting()} ${atRisk.slice(0, 2).map((i) => i.name).join(' ו')}${atRisk.length > 2 ? ` ועוד ${atRisk.length - 2}` : ''} בסכנה. נציל הערב? 🛟`
        : `${greeting()} יש לך ${k.length} דברים במטבח. אני כבר יודע מה אפשר להכין.`;

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <LouieSays mood={k.length === 0 ? 'sad' : atRisk.length ? 'happy' : 'curious'} hop={k.length}>
            {line}
          </LouieSays>

          <Pressable
            onPress={() => dinner()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="מה אוכלים הערב?"
            style={({ pressed }) => [styles.dinner, (pressed || busy) && { opacity: 0.85 }]}>
            {busy ? (
              <ActivityIndicator color={C.onAccent} />
            ) : (
              <>
                <Txt size={24} weight="bold" color={C.onAccent} align="center">
                  מה אוכלים הערב?
                </Txt>
                <Txt size={14} color="#D9F0FC" align="center">
                  3 רעיונות ממה שכבר יש לך
                </Txt>
              </>
            )}
          </Pressable>
          {error && (
            <Txt size={14} color={C.missing} align="center">
              {error}
            </Txt>
          )}

          {(atRisk.length > 0 || t.rescued > 0) && (
            <View style={styles.risk}>
              {atRisk.length > 0 && (
                <>
                  <Txt size={14} weight="semibold" color={C.ink}>
                    🛟 בסכנה. נכניס אותם למתכון קודם:
                  </Txt>
                  <Wrap>
                    {atRisk.map((i) => (
                      <Chip key={i.name} dot tone="expiring" label={i.name} onPress={() => s.toggleExpiring(i.name)} />
                    ))}
                  </Wrap>
                </>
              )}
              {t.rescued > 0 && (
                <Txt size={13} weight="medium" color={C.fresh}>
                  {`עד עכשיו הצלת ${t.rescued} מצרכים · כ-₪${t.saved} שלא הלכו לפח`}
                </Txt>
              )}
            </View>
          )}

          {stale && (
            <Card style={styles.stale}>
              <Txt size={15} weight="semibold">{`ה${stale.name.replace(/^ה/, '')} עוד אצלך?`}</Txt>
              <Row gap={8}>
                <Chip label="כן, עוד יש" onPress={() => s.addToKitchen(toKitchen([{ name: stale.name, place: stale.place }]))} />
                <Chip label="עומד להיגמר" tone="expiring" onPress={() => s.toggleExpiring(stale.name)} />
                <Chip label="נגמר" tone="missing" onPress={() => s.removeFromKitchen([stale.name])} />
              </Row>
            </Card>
          )}

          {PLACES.map((p) => {
            const items = k.filter((i) => i.place === p.id).sort((a, b) => Number(b.expiring) - Number(a.expiring));
            if (!items.length) return null;
            return (
              <View key={p.id} style={{ gap: 8 }}>
                <Txt size={16} weight="semibold">{`${p.icon} ${p.label} · ${items.length}`}</Txt>
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  {items.map((i, n) => (
                    <Row key={i.name} gap={10} style={[styles.row, n === items.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={[styles.dot, { backgroundColor: i.expiring ? C.warn : C.fresh }]} />
                      <Txt size={16} weight="medium" style={{ flex: 1 }}>
                        {i.name}
                      </Txt>
                      <Pressable
                        onPress={() => {
                          tap();
                          s.toggleExpiring(i.name);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: i.expiring }}
                        style={[styles.tag, i.expiring && styles.tagOn]}>
                        <Txt size={12} weight="medium" color={i.expiring ? C.ink : C.muted} align="center">
                          {i.expiring ? 'עומד להיגמר' : 'טרי'}
                        </Txt>
                      </Pressable>
                      <Pressable
                        onPress={() => s.removeFromKitchen([i.name])}
                        accessibilityRole="button"
                        accessibilityLabel={`מחיקת ${i.name}`}
                        hitSlop={8}
                        style={styles.x}>
                        <Txt size={13} weight="bold" color={C.muted} align="center">
                          ✕
                        </Txt>
                      </Pressable>
                    </Row>
                  ))}
                </Card>
              </View>
            );
          })}

          {k.length > 0 && (
            <Txt size={12} color={C.muted} align="center">
              לחיצה על "טרי" מסמנת שמשהו עומד להיגמר, ואני אכניס אותו למתכון קודם.
            </Txt>
          )}
        </ScrollView>

        <View style={styles.bar}>
          {result && (
            <Row gap={8} style={styles.result}>
              <Wrap style={{ flex: 1 }}>
                {result.added.map((n) => (
                  <Chip key={`+${n}`} tone="have" label={`+ ${n}`} />
                ))}
                {result.removed.map((n) => (
                  <Chip key={`-${n}`} tone="missing" label={`− ${n}`} />
                ))}
              </Wrap>
              <Pressable onPress={undo} accessibilityRole="button" accessibilityLabel="ביטול" hitSlop={8} style={styles.undo}>
                <Txt size={13} weight="semibold" color={C.accent} align="center">
                  ↶ ביטול
                </Txt>
              </Pressable>
            </Row>
          )}
          {hint && (
            <Txt size={13} color={C.muted}>
              {hint}
            </Txt>
          )}
          <Row gap={8}>
            <View style={styles.inputWrap}>
              <TextInput
                value={text}
                onChangeText={setText}
                onSubmitEditing={send}
                returnKeyType="send"
                placeholder="כתבו או דברו עם Louie 🎙️"
                placeholderTextColor={C.muted}
                style={styles.input}
                editable={!thinking}
                accessibilityLabel="שורת Louie: מה קניתם, מה נגמר, או מה בא לכם"
              />
              {thinking ? (
                <ActivityIndicator color={C.accent} style={{ marginLeft: 6 }} />
              ) : (
                !!text.trim() && (
                  <Pressable onPress={send} style={styles.sendBtn} accessibilityRole="button" accessibilityLabel="שליחה">
                    <Txt size={16} weight="bold" color={C.onAccent} align="center">
                      ↑
                    </Txt>
                  </Pressable>
                )
              )}
            </View>
            <Pressable onPress={() => router.push('/camera')} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="צילום המקרר">
              <Txt size={20} align="center">
                📷
              </Txt>
            </Pressable>
            <Pressable
              onPress={() => router.push(s.staples ? '/shopping' : '/staples')}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="רשימת קניות">
              <Txt size={20} align="center">
                🛒
              </Txt>
            </Pressable>
          </Row>
          {!text && !result && !hint && (
            <Txt size={11} color={C.muted} align="center">
              למשל: "קניתי חלב וביצים" · "נגמר הלחם" · "בא לי משהו חריף"
            </Txt>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 14 },
  dinner: {
    backgroundColor: C.accent,
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    gap: 4,
    minHeight: 92,
    justifyContent: 'center',
    shadowColor: C.accent,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  risk: { backgroundColor: C.warnSoft, borderRadius: R.card, padding: 14, gap: 10 },
  stale: { gap: 10 },
  row: { paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.line },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tag: { borderRadius: R.chip, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: C.line },
  tagOn: { backgroundColor: C.warnSoft, borderColor: C.warnSoft },
  x: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg, justifyContent: 'center' },
  bar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 8, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg },
  result: { alignItems: 'flex-start' },
  undo: { paddingVertical: 8, paddingHorizontal: 4 },
  inputWrap: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.chip,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  input: { flex: 1, paddingVertical: 10, fontFamily: F.regular, fontSize: 16, textAlign: 'right', writingDirection: 'rtl', color: C.ink },
  sendBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.accent, justifyContent: 'center', marginLeft: -6 },
  iconBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, justifyContent: 'center' },
});

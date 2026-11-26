import type { FridgeItem } from '@/lib/analyze';

// "My kitchen": everything the user has at home, kept on the phone.
// The camera, the Louie bar, cooking and shopping all write into it.

export type Place = 'fridge' | 'pantry' | 'freezer';
export type KitchenItem = FridgeItem & { place: Place; addedAt: number };

export const PLACES: { id: Place; label: string; icon: string }[] = [
  { id: 'fridge', label: 'מקרר', icon: '🧊' },
  { id: 'pantry', label: 'מזווה', icon: '🥫' },
  { id: 'freezer', label: 'מקפיא', icon: '❄️' },
];

// First-run setup: a typical student kitchen, grouped by place. `on` = preselected.
export const STARTER: Record<Place, { name: string; on: boolean }[]> = {
  fridge: [
    { name: 'ביצים', on: true },
    { name: 'חלב', on: true },
    { name: 'גבינה לבנה', on: true },
    { name: 'גבינה צהובה', on: true },
    { name: "קוטג'", on: false },
    { name: 'יוגורט', on: false },
    { name: 'חמאה', on: false },
    { name: 'עגבניות', on: true },
    { name: 'מלפפונים', on: true },
    { name: 'פלפל', on: false },
    { name: 'לימון', on: false },
    { name: 'טחינה', on: false },
  ],
  pantry: [
    { name: 'פסטה', on: true },
    { name: 'אורז', on: true },
    { name: 'שמן זית', on: true },
    { name: 'בצל', on: true },
    { name: 'שום', on: true },
    { name: 'טונה', on: false },
    { name: 'רסק עגבניות', on: false },
    { name: 'תפוחי אדמה', on: false },
    { name: 'עדשים', on: false },
    { name: 'קמח', on: false },
    { name: 'פיתות', on: true },
    { name: 'לחם', on: false },
  ],
  freezer: [
    { name: 'ירקות קפואים', on: false },
    { name: 'אפונה', on: false },
    { name: 'חזה עוף', on: false },
    { name: 'שניצל', on: false },
    { name: 'בצק עלים', on: false },
  ],
};

// Best guess of where a typed item lives. Unknown items go to the fridge.
const PANTRY_WORDS = ['פסטה', 'אורז', 'שמן', 'טונה', 'רסק', 'קמח', 'סוכר', 'מלח', 'עדשים', 'חומוס יבש', 'שימורים', 'קופסת', 'תבלין', 'פתיתים', 'קוסקוס', 'בורגול', 'קורנפלקס', 'שיבולת', 'דבש', 'ריבה', 'קפה', 'תה', 'פיתות', 'לחם', 'טורטיה', 'בצל', 'שום', 'תפוחי אדמה', 'בטטה', 'רוטב סויה', 'אטריות', 'שקדים', 'אגוזים'];
const FREEZER_WORDS = ['קפוא', 'קפואים', 'קפואה', 'מקפיא', 'שניצל', 'בצק', 'גלידה', 'אפונה'];

export function guessPlace(name: string): Place {
  if (FREEZER_WORDS.some((w) => name.includes(w))) return 'freezer';
  if (PANTRY_WORDS.some((w) => name.includes(w))) return 'pantry';
  return 'fridge';
}

export function toKitchen(items: { name: string; place?: Place; expiring?: boolean }[]): KitchenItem[] {
  const now = Date.now();
  return items.map((i) => ({ name: i.name, place: i.place ?? guessPlace(i.name), expiring: !!i.expiring, addedAt: now }));
}

// Add (or refresh) items. An item already in the kitchen keeps its place;
// it becomes "expiring" if the new copy says so.
export function mergeKitchen(kitchen: KitchenItem[], add: KitchenItem[]): KitchenItem[] {
  const out = [...kitchen];
  for (const a of add) {
    const k = out.findIndex((x) => same(x.name, a.name));
    if (k >= 0) out[k] = { ...out[k], expiring: out[k].expiring || a.expiring, addedAt: a.addedAt };
    else out.unshift(a);
  }
  return out;
}

// Exact (singular/plural-insensitive) match first. If none, a single item that
// starts with the name ("עגבניות" -> "עגבניות שרי"); never several at once.
export function removeFromKitchen(kitchen: KitchenItem[], names: string[]): KitchenItem[] {
  let out = kitchen;
  for (const n of names) {
    if (out.some((x) => same(x.name, n))) {
      out = out.filter((x) => !same(x.name, n));
      continue;
    }
    const loose = out.filter((x) => norm(x.name).startsWith(norm(n) + ' ') || norm(x.name).startsWith(norm(n)));
    if (loose.length === 1) out = out.filter((x) => x !== loose[0]);
  }
  return out;
}

// "ביצים" matches "ביצה" and "עגבניה" matches "עגבניות".
export function same(a: string, b: string) {
  return norm(a) === norm(b);
}
function norm(s: string) {
  return s.trim().replace(/[׳']/g, "'").replace(/(ים|ות|ה)$/, '');
}

// ---- The Louie bar: understanding what the user typed or dictated ----

export type Parsed = { add: { name: string; place?: Place }[]; remove: string[]; request: string | null };

const REMOVE_WORDS = ['נגמר', 'נגמרה', 'נגמרו', 'אין', 'אין לי', 'אין יותר', 'סיימתי', 'זרקתי', 'הוצאתי', 'תוריד', 'להוריד', 'מחק', 'למחוק'];
const ADD_WORDS = ['קניתי', 'יש לי', 'יש', 'הוספתי', 'תוסיף', 'להוסיף', 'הבאתי', 'קיבלתי', 'הוסף'];
const REQUEST_WORDS = ['בא לי', 'מה אוכלים', 'מה להכין', 'מה לבשל', 'מתכון', 'תציע', 'רוצה', 'משהו', 'ארוחה', 'ארוחת', 'אפשר להכין', '?'];

// Simple lists are parsed on the phone, for free: "חלב, ביצים ו-2 עגבניות",
// "קניתי חלב וביצים", "נגמרו הביצים". Anything else returns null and goes to Haiku.
export function parseSimple(text: string): Parsed | null {
  let t = text.trim().replace(/[.!]+$/, '');
  if (!t) return null;
  if (REQUEST_WORDS.some((w) => t.includes(w))) return null;

  let mode: 'add' | 'remove' = 'add';
  const lead = (words: string[]) => words.sort((a, b) => b.length - a.length).find((w) => t === w || t.startsWith(w + ' ') || t.startsWith(w + ':'));
  const rm = lead([...REMOVE_WORDS]);
  const ad = rm ? undefined : lead([...ADD_WORDS]);
  if (rm) {
    mode = 'remove';
    t = t.slice(rm.length);
  } else if (ad) {
    t = t.slice(ad.length);
  }

  const parts = t
    .split(/\s*[,،\n+]\s*|\s+ו-?(?=[א-ת\d])/)
    .map((p) =>
      p
        .replace(/^[:\-\s]+/, '')
        .replace(/^גם\s+/, '')
        .replace(/^את\s+ה?(?=[א-ת])/, '')
        // "נגמרו הביצים": the definite ה is dropped only when removing.
        .replace(mode === 'remove' ? /^ה(?=[א-ת]{2,})/ : /$^/, '')
        .replace(/\d+\s*(יחידות|קילו|ק"ג|גרם)?/g, '')
        .replace(/\s*(בבית|במקרר|במזווה|במקפיא)$/, '')
        .trim(),
    )
    .filter(Boolean);
  if (!parts.length) return null;
  // Long phrases are probably sentences, not item names; a part that starts with
  // a verb ("קניתי חלב ונגמרו הביצים") is a mixed sentence. Both go to Haiku.
  if (parts.some((p) => p.split(/\s+/).length > 2)) return null;
  if (parts.some((p) => [...REMOVE_WORDS, ...ADD_WORDS].some((w) => p === w || p.startsWith(w + ' ')))) return null;

  const items = Array.from(new Set(parts));
  return mode === 'add' ? { add: items.map((name) => ({ name })), remove: [], request: null } : { add: [], remove: items, request: null };
}

// Freshness: perishables added more than a week ago get a gentle "still there?".
const PERISHABLE = ['חלב', 'יוגורט', 'קוטג', 'שמנת', 'עגבני', 'מלפפון', 'חסה', 'תרד', 'פטריות', 'פלפל', 'אבוקדו', 'בננ', 'עוף', 'בשר', 'טחון', 'דג', 'סלמון', 'לחם', 'פית'];
const WEEK = 7 * 24 * 60 * 60 * 1000;
export function isStale(i: KitchenItem, now = Date.now()) {
  return i.place === 'fridge' && now - i.addedAt > WEEK && PERISHABLE.some((w) => i.name.includes(w));
}

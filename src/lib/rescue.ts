import type { FridgeItem, SuggestedRecipe } from '@/lib/analyze';

// "Rescues": an item marked as running out that a recipe uses is rescued when the
// user cooks it. The shekel value is a rough guess, so it is always shown as "כ-₪".
// Matched by substring, so "גבינה לבנה 5%" still finds "גבינה".
const PRICES: [string, number][] = [
  ['עוף', 25], ['בשר', 35], ['טחון', 30], ['סלמון', 40], ['דג', 25], ['נקניק', 12],
  ['פטה', 14], ['בולגרית', 14], ['צהובה', 15], ['מוצרלה', 14], ['גבינה', 8], ["קוטג'", 6], ['קוטג׳', 6],
  ['שמנת', 6], ['יוגורט', 5], ['חלב', 7], ['חמאה', 9], ['ביצ', 12],
  ['תרד', 8], ['פטריות', 9], ['אבוקדו', 7], ['פלפל', 6], ['קישוא', 5], ['חציל', 5], ['ברוקולי', 9],
  ['עגבני', 6], ['מלפפון', 5], ['חסה', 6], ['כרוב', 5], ['גזר', 4], ['בצל', 3], ['שום', 3], ['תפוח', 6],
  ['בננ', 6], ['לימון', 3], ['פטרוזיליה', 4], ['כוסברה', 4], ['בזיליקום', 5], ['שמיר', 4],
  ['חומוס', 7], ['טחינה', 10], ['לחם', 9], ['פית', 7], ['טורטיה', 10], ['טופו', 10],
];

export function priceOf(name: string) {
  return PRICES.find(([k]) => name.includes(k))?.[1] ?? 5;
}

export function rescueOf(recipe: SuggestedRecipe | null, fridge: FridgeItem[]) {
  if (!recipe) return { names: [] as string[], value: 0 };
  const atRisk = new Set(fridge.filter((i) => i.expiring).map((i) => i.name));
  const names = recipe.uses.filter((u) => atRisk.has(u));
  return { names, value: names.reduce((sum, n) => sum + priceOf(n), 0) };
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { RECIPES } from '@/data/mock';
import type { FridgeItem, SuggestedRecipe } from '@/lib/analyze';

// In-memory app state for the pilot. Later: Supabase (per user) + local cache.
type Store = {
  photos: string[];
  setPhotos: (u: string[]) => void;
  fridge: FridgeItem[]; // what Louie saw, after the user's edits
  setFridge: (i: FridgeItem[]) => void;
  options: SuggestedRecipe[]; // the 3 cards Louie suggested
  setOptions: (o: SuggestedRecipe[]) => void;
  recipe: SuggestedRecipe | null; // the one the user picked
  setRecipe: (r: SuggestedRecipe) => void;
  seenTitles: string[];
  sampleMode: boolean;
  startSample: () => void;
  cameraExplained: boolean;
  setCameraExplained: (v: boolean) => void;
  prefs: Record<string, string>;
  answerPref: (id: string, a: string) => void;
  prefAskedThisSession: boolean;
  setPrefAskedThisSession: (v: boolean) => void;
  staples: string[] | null; // null = never set up (first shopping trip)
  setStaples: (s: string[]) => void;
  reminder: { time: string; weekly: boolean } | null;
  setReminder: (r: { time: string; weekly: boolean } | null) => void;
  totals: Totals; // only ever goes up, saved on the phone
  lastCook: { rescued: string[]; value: number } | null;
  addCooked: (rescued: string[], value: number) => void;
};

type Totals = { meals: number; rescued: number; saved: number };
const TOTALS_KEY = 'louie.totals.v1';

const Ctx = createContext<Store | null>(null);

function sampleRecipe(idx: number): SuggestedRecipe {
  const r = RECIPES[idx % RECIPES.length];
  return {
    ...r,
    uses: r.items.filter((i) => i.status !== 'missing').map((i) => i.name),
    missing: r.items.filter((i) => i.status === 'missing').map((i) => ({ name: i.name, optional: i.note === 'אפשר בלי' })),
  };
}

const SAMPLE_FRIDGE: FridgeItem[] = [
  { name: 'תרד', expiring: true },
  { name: 'ביצים', expiring: false },
  { name: 'עגבניות', expiring: false },
  { name: 'פטה', expiring: false },
  { name: 'בצל', expiring: false },
  { name: 'פסטה', expiring: false },
  { name: 'שום', expiring: false },
  { name: 'פיתות', expiring: false },
  { name: 'יוגורט', expiring: false },
  { name: 'מלפפונים', expiring: false },
];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [fridge, setFridge] = useState<FridgeItem[]>([]);
  const [options, setOptionsState] = useState<SuggestedRecipe[]>([]);
  const [recipe, setRecipe] = useState<SuggestedRecipe | null>(null);
  const [seenTitles, setSeenTitles] = useState<string[]>([]);
  const [sampleMode, setSampleMode] = useState(false);
  const [cameraExplained, setCameraExplained] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, string>>({});
  const [prefAskedThisSession, setPrefAskedThisSession] = useState(false);
  const [staples, setStaples] = useState<string[] | null>(null);
  const [reminder, setReminder] = useState<Store['reminder']>(null);
  const [totals, setTotals] = useState<Totals>({ meals: 0, rescued: 0, saved: 0 });
  const [lastCook, setLastCook] = useState<Store['lastCook']>(null);

  useEffect(() => {
    AsyncStorage.getItem(TOTALS_KEY)
      .then((v) => v && setTotals(JSON.parse(v)))
      .catch(() => {});
  }, []);

  const value = useMemo<Store>(
    () => ({
      photos,
      setPhotos: (p) => {
        setSampleMode(false);
        setPhotos(p);
      },
      fridge,
      setFridge,
      options,
      setOptions: (o) => {
        setOptionsState(o);
        setSeenTitles((t) => [...t, ...o.map((r) => r.title)].slice(-12));
      },
      recipe,
      setRecipe,
      seenTitles,
      sampleMode,
      startSample: () => {
        setSampleMode(true);
        setPhotos([]);
        setFridge(SAMPLE_FRIDGE);
      },
      cameraExplained,
      setCameraExplained,
      prefs,
      answerPref: (id, a) => setPrefs((p) => ({ ...p, [id]: a })),
      prefAskedThisSession,
      setPrefAskedThisSession,
      staples,
      setStaples,
      reminder,
      setReminder,
      totals,
      lastCook,
      addCooked: (rescued, value) => {
        setLastCook({ rescued, value });
        setTotals((t) => {
          const n = { meals: t.meals + 1, rescued: t.rescued + rescued.length, saved: t.saved + value };
          AsyncStorage.setItem(TOTALS_KEY, JSON.stringify(n)).catch(() => {});
          return n;
        });
        // Rescued items are used up: no longer "running out".
        setFridge((f) => f.map((i) => (rescued.includes(i.name) ? { ...i, expiring: false } : i)));
      },
    }),
    [photos, fridge, options, recipe, seenTitles, sampleMode, cameraExplained, prefs, prefAskedThisSession, staples, reminder, totals, lastCook],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

// Sample mode: the 3 built-in recipes as cards (rotated for "something else").
export function sampleOptions(shift = 0) {
  return [0, 1, 2].map((k) => sampleRecipe(k + shift));
}

export { sampleRecipe };

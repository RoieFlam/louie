import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { DEFAULT_STAPLES, RECIPES, type Item, type Recipe } from '@/data/mock';

// In-memory app state for the pilot. Later: Supabase (per user) + local cache.
type Store = {
  photos: string[];
  setPhotos: (u: string[]) => void;
  recipe: Recipe;
  items: Item[];
  setItems: (i: Item[]) => void;
  nextRecipe: (reason?: string) => void;
  setRecipe: (r: Recipe, items: Item[]) => void;
  changeRequest: string | null;
  setChangeRequest: (r: string | null) => void;
  seenTitles: string[];
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
  mealsThisWeek: number;
  addMeal: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [recipeIdx, setRecipeIdx] = useState(0);
  const [aiRecipe, setAiRecipe] = useState<Recipe | null>(null);
  const [changeRequest, setChangeRequest] = useState<string | null>(null);
  const [seenTitles, setSeenTitles] = useState<string[]>([]);
  const [items, setItems] = useState<Item[]>(RECIPES[0].items);
  const [cameraExplained, setCameraExplained] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, string>>({});
  const [prefAskedThisSession, setPrefAskedThisSession] = useState(false);
  const [staples, setStaples] = useState<string[] | null>(null);
  const [reminder, setReminder] = useState<Store['reminder']>(null);
  const [mealsThisWeek, setMeals] = useState(1);

  const value = useMemo<Store>(
    () => ({
      photos,
      setPhotos,
      recipe: aiRecipe ?? RECIPES[recipeIdx],
      items,
      setItems,
      nextRecipe: () => {
        // Sample mode only; with a real photo the loading screen asks Claude again.
        const n = (recipeIdx + 1) % RECIPES.length;
        setAiRecipe(null);
        setRecipeIdx(n);
        setItems(RECIPES[n].items);
      },
      setRecipe: (r, i) => {
        setAiRecipe(r);
        setItems(i);
        setSeenTitles((t) => [...t.slice(-9), r.title]);
      },
      changeRequest,
      setChangeRequest,
      seenTitles,
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
      mealsThisWeek,
      addMeal: () => setMeals((m) => m + 1),
    }),
    [photos, recipeIdx, aiRecipe, changeRequest, seenTitles, items, cameraExplained, prefs, prefAskedThisSession, staples, reminder, mealsThisWeek],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

export { DEFAULT_STAPLES };

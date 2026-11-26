import { fetch as expoFetch } from 'expo/fetch';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/config';
import type { Recipe } from '@/data/mock';

export type Problem = 'none' | 'too_dark' | 'blurry' | 'not_a_fridge' | 'almost_empty';
export type FridgeItem = { name: string; expiring: boolean };

export class AnalyzeError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

// Longest edge 1568px (Claude's sweet spot for detail), JPEG 0.8.
const MAX_EDGE = 1568;

async function toJpegBase64(uri: string) {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const { width, height } = original;
  const ctx = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_EDGE) ctx.resize(width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ base64: true, compress: 0.8, format: SaveFormat.JPEG });
  if (!out.base64) throw new AnalyzeError('encode_failed');
  return out.base64.replace(/^data:image\/\w+;base64,/, '');
}

async function call<T>(body: object, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-fridge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new AnalyzeError('network');
  } finally {
    clearTimeout(timer);
  }
  const data = (await res.json().catch(() => ({ error: 'bad_response' }))) as T & { error?: string };
  if (!res.ok || data.error) throw new AnalyzeError(data.error ?? `http_${res.status}`);
  return data;
}

// Step 1: photos -> what's in the fridge (the only call that sends images).
// The server streams the model's JSON as it is written, so onItem fires for each
// item the moment its name appears; the final result follows a DONE marker.
const DONE = '\n@@DONE@@';

export async function detectItems(photoUris: string[], onItem?: (name: string) => void) {
  const images = await Promise.all(photoUris.map(async (u) => ({ data: await toJpegBase64(u), media_type: 'image/jpeg' })));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    let res: Awaited<ReturnType<typeof expoFetch>>;
    try {
      res = await expoFetch(`${SUPABASE_URL}/functions/v1/analyze-fridge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ mode: 'inventory', images }),
        signal: controller.signal,
      });
    } catch {
      throw new AnalyzeError('network');
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new AnalyzeError(data.error ?? `http_${res.status}`);
    }
    let text = '';
    const seen = new Set<string>();
    const reader = res.body?.getReader();
    if (reader) {
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        if (onItem) {
          const head = text.split(DONE)[0];
          for (const m of head.matchAll(/"name"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
            if (!seen.has(m[1])) {
              seen.add(m[1]);
              onItem(m[1]);
            }
          }
        }
      }
    } else {
      text = await res.text();
    }
    const i = text.lastIndexOf(DONE);
    if (i < 0) throw new AnalyzeError('bad_response');
    const data = JSON.parse(text.slice(i + DONE.length)) as { problem: Problem; items: FridgeItem[]; error?: string };
    if (data.error) throw new AnalyzeError(data.error);
    return data;
  } catch (e) {
    if (e instanceof AnalyzeError) throw e;
    throw new AnalyzeError('network');
  } finally {
    clearTimeout(timer);
  }
}

type ApiRecipe = {
  title: string;
  minutes: number;
  extra_cost: number;
  level: string;
  emoji: string;
  uses: string[];
  missing: { name: string; optional: boolean }[];
  steps: { text: string; tip: string; timer_sec: number }[];
};

export type SuggestedRecipe = Recipe & { uses: string[]; missing: { name: string; optional: boolean }[] };

// Step 2: confirmed list (text only) -> 3 recipes in one call. Cheap; used again for "something else".
export async function suggestRecipes(
  items: FridgeItem[],
  opts: { prefs?: Record<string, string>; changeRequest?: string; avoidTitles?: string[] } = {},
): Promise<SuggestedRecipe[]> {
  const r = await call<{ recipes: ApiRecipe[] }>(
    { mode: 'recipe', items, prefs: opts.prefs, change_request: opts.changeRequest, avoid_titles: opts.avoidTitles },
    60_000,
  );
  const t = Date.now();
  return r.recipes.slice(0, 3).map((x, k) => ({
    id: `ai-${t}-${k}`,
    title: x.title,
    minutes: x.minutes,
    extraCost: x.extra_cost,
    level: x.level,
    emoji: x.emoji || '🍽',
    items: [],
    uses: x.uses,
    missing: x.missing,
    steps: x.steps.map((s) => ({ text: s.text, tip: s.tip || undefined, timerSec: s.timer_sec > 0 ? s.timer_sec : undefined })),
  }));
}

// The Louie bar, for sentences the phone can't parse by itself ("קניתי חלב ונגמרו הביצים",
// "בא לי משהו חריף"). Text only, on Haiku: a fraction of an agora per sentence.
export type ParsedSentence = {
  add: { name: string; place: 'fridge' | 'pantry' | 'freezer' }[];
  remove: string[];
  request: string | null;
};

export async function parseSentence(text: string, kitchen: string[]): Promise<ParsedSentence> {
  const r = await call<{ add: ParsedSentence['add']; remove: string[]; request: string }>(
    { mode: 'parse', text, kitchen: kitchen.slice(0, 120) },
    20_000,
  );
  return { add: r.add ?? [], remove: r.remove ?? [], request: r.request?.trim() ? r.request.trim() : null };
}

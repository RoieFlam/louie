import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/config';
import type { Item, Recipe } from '@/data/mock';

export type Problem = 'none' | 'too_dark' | 'blurry' | 'not_a_fridge' | 'almost_empty';

export type AnalyzeResult = { problem: Problem; items: Item[]; recipe: Recipe };

type ApiResult = {
  problem: Problem;
  items: { name: string; status: Item['status']; note: string }[];
  recipe: {
    title: string;
    minutes: number;
    extra_cost: number;
    level: string;
    emoji: string;
    steps: { text: string; tip: string; timer_sec: number }[];
  };
  error?: string;
};

export class AnalyzeError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

// Downscale before upload: longest edge 1568px (Claude's sweet spot for detail),
// JPEG 0.8. Keeps small labels readable while staying well under the size limit.
const MAX_EDGE = 1568;

async function toJpegBase64(uri: string) {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const { width, height } = original;
  const ctx = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_EDGE) {
    ctx.resize(width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  }
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ base64: true, compress: 0.8, format: SaveFormat.JPEG });
  if (!out.base64) throw new AnalyzeError('encode_failed');
  return out.base64.replace(/^data:image\/\w+;base64,/, '');
}

export async function analyzeFridge(
  photoUris: string[],
  opts: { prefs?: Record<string, string>; changeRequest?: string; avoidTitles?: string[] } = {},
): Promise<AnalyzeResult> {
  const images = await Promise.all(photoUris.map(async (u) => ({ data: await toJpegBase64(u), media_type: 'image/jpeg' })));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-fridge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ images, prefs: opts.prefs, change_request: opts.changeRequest, avoid_titles: opts.avoidTitles }),
      signal: controller.signal,
    });
  } catch {
    throw new AnalyzeError('network');
  } finally {
    clearTimeout(timer);
  }
  const data = (await res.json().catch(() => ({ error: 'bad_response' }))) as ApiResult;
  if (!res.ok || data.error) throw new AnalyzeError(data.error ?? `http_${res.status}`);

  const r = data.recipe;
  return {
    problem: data.problem,
    items: data.items.map((i) => ({ name: i.name, status: i.status, note: i.note || undefined })),
    recipe: {
      id: `ai-${Date.now()}`,
      title: r.title,
      minutes: r.minutes,
      extraCost: r.extra_cost,
      level: r.level,
      emoji: r.emoji || '🍽',
      items: [],
      steps: r.steps.map((s) => ({ text: s.text, tip: s.tip || undefined, timerSec: s.timer_sec > 0 ? s.timer_sec : undefined })),
    },
  };
}

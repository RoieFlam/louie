// Louie: fridge photo(s) -> what's inside + one recipe, via Claude (vision + JSON output).
// The Anthropic key is read from the ANTHROPIC_API_KEY secret. It never reaches the app.
import Anthropic from "npm:@anthropic-ai/sdk@1.7.0";

const MODEL = "claude-opus-5-5"; // best vision accuracy; ~2x Sonnet cost (~10 agorot per scan)
const MAX_IMAGES = 3;
const MAX_IMAGE_B64 = 6_600_000; // base64 length guard per image (~5MB decoded, the API limit)

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["problem", "items", "recipe"],
  properties: {
    problem: { type: "string", enum: ["none", "too_dark", "blurry", "not_a_fridge", "almost_empty"] },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "status", "note", "in_recipe"],
        properties: {
          name: { type: "string" },
          status: { type: "string", enum: ["have", "expiring", "missing"] },
          note: { type: "string" },
          in_recipe: { type: "boolean" },
        },
      },
    },
    recipe: {
      type: "object",
      additionalProperties: false,
      required: ["title", "minutes", "extra_cost", "level", "emoji", "steps"],
      properties: {
        title: { type: "string" },
        minutes: { type: "integer" },
        extra_cost: { type: "integer" },
        level: { type: "string" },
        emoji: { type: "string" },
        steps: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["text", "tip", "timer_sec"],
            properties: {
              text: { type: "string" },
              tip: { type: "string" },
              timer_sec: { type: "integer" },
            },
          },
        },
      },
    },
  },
};

const SYSTEM = `You are Louie, a friendly cooking buddy for students in Israel. You look at photos of a fridge (sometimes a shelf too) and decide ONE dinner the user can cook right now.

Rules:
- Write everything in natural, casual Hebrew (masculine singular is fine). Item names short, like on a shopping list.
- Work in two passes. Pass 1, inventory: go shelf by shelf (top to bottom), then the door shelves, then the drawers, across all photos. Read Hebrew and English labels on packages and jars (e.g. "גבינה לבנה", "קוטג'", "חומוס", "מחית קארי", "רוטב סויה"). Note produce in bags too. Pass 2: choose the recipe from that inventory.
- "items" = the full inventory: every distinct food item you can identify (aim for completeness, up to 40), no duplicates across photos. Set in_recipe=true for items the recipe uses, and list those first.
- Only list things you can actually see. Never invent items. If you are not sure what a package is, describe it generically ("קופסת גבינה", "צנצנת רוטב"). A wrong item is worse than a generic one.
- status "expiring" only for produce that clearly looks like it should be used in 1-2 days (note e.g. "עוד יומיים"). Add at most 2 "missing" items (in_recipe=true) the recipe needs that are not visible (note "אפשר בלי" if the dish works without it). Other items get an empty note.
- The recipe must be built mainly from items you saw.
- Prefer using expiring items. Assume a basic pantry exists: salt, pepper, oil, sugar, flour, common spices. Do not list those.
- Cheap and simple: student budget, at most 30 minutes unless the user says otherwise. extra_cost is the rough shekel cost of missing items (0 if none needed).
- 3 to 6 short steps, one action each, so each fits on one big screen. tip is a short practical hint or "". timer_sec is set only when the step is waiting/cooking for a known time, else 0.
- emoji: one food emoji that matches the dish.
- If the photo is too dark, blurry, not a fridge, or nearly empty, set "problem" accordingly and still return your best simple recipe (for an almost empty fridge, something from pantry basics plus what you see).
- Follow the user's preferences and change request strictly (e.g. vegetarian means no meat or fish).`;

type Body = {
  images: { data: string; media_type: string }[];
  prefs?: Record<string, string>;
  change_request?: string;
  avoid_titles?: string[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "missing_api_key" }, 500);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    console.log(JSON.stringify({ rejected: "bad_json" }));
    return json({ error: "bad_json" }, 400);
  }
  const images = (body.images ?? []).slice(0, MAX_IMAGES);
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  const bad = images.length === 0
    ? "no_images"
    : images.find((i) => !i.data) ? "empty_image"
    : images.find((i) => !allowed.includes(i.media_type)) ? `bad_type:${images.map((i) => i.media_type).join(",")}`
    : images.find((i) => i.data.length > MAX_IMAGE_B64) ? `too_big:${images.map((i) => i.data.length).join(",")}`
    : null;
  if (bad) {
    console.log(JSON.stringify({ rejected: bad }));
    return json({ error: "bad_images", detail: bad }, 400);
  }

  const notes: string[] = [];
  const prefs = body.prefs ?? {};
  if (Object.keys(prefs).length) notes.push(`User preferences: ${Object.entries(prefs).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  if (body.change_request) notes.push(`The user asked for something different: "${body.change_request}".`);
  if (body.avoid_titles?.length) notes.push(`Do not suggest these again: ${body.avoid_titles.join(" | ")}`);

  const client = new Anthropic({ apiKey });
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            ...images.map((i) => ({
              type: "image" as const,
              source: { type: "base64" as const, media_type: i.media_type as "image/jpeg", data: i.data },
            })),
            { type: "text" as const, text: [images.length > 1 ? `These ${images.length} photos are of the same fridge (different shelves/door/drawers).` : "", "What should I cook tonight?", ...notes].filter(Boolean).join("\n") },
          ],
        },
      ],
    } as Anthropic.MessageCreateParamsNonStreaming);

    if (res.stop_reason === "refusal") return json({ error: "refused" }, 422);
    if (res.stop_reason === "max_tokens") return json({ error: "too_long" }, 502);
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return json({ error: "no_output" }, 502);
    const data = JSON.parse(text.text);
    // Debug log for the pilot: no image data, only what Claude returned.
    console.log(JSON.stringify({
      images: images.length,
      kb: images.map((i) => Math.round(i.data.length * 0.75 / 1024)),
      problem: data.problem,
      items: data.items?.map((i: { name: string; status: string }) => `${i.name}:${i.status}`),
      title: data.recipe?.title,
      usage: res.usage,
    }));
    return json({ ...data, usage: { input: res.usage.input_tokens, output: res.usage.output_tokens } });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "bad_api_key" }, 500);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: "claude_error", status: e.status }, 502);
    return json({ error: "server_error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

// Louie server function. Three modes, so photos are sent to Claude only once:
//   mode "inventory": fridge photo(s) -> list of items + problem flag (vision, strong model)
//   mode "recipe":    confirmed item list (text) -> 3 recipes in one call (cheap model)
//   mode "parse":     one sentence from the Louie bar -> items to add/remove + a recipe request (cheapest model)
// Inventory streams the model text so the app shows items as they are found; final JSON follows a DONE marker.
// The Anthropic key is read from the ANTHROPIC_API_KEY secret. It never reaches the app.
import Anthropic from "npm:@anthropic-ai/sdk@1.7.0";

const VISION_MODEL = "claude-opus-5-5"; // best at reading packed shelves and small labels (Hebrew, English and more)
const RECIPE_MODEL = "claude-sonnet-5-5"; // text only, ~5x cheaper per call
const PARSE_MODEL = "claude-haiku-5-5"; // one short sentence -> JSON, a fraction of an agora
const MAX_IMAGES = 3;
const MAX_IMAGE_B64 = 6_600_000; // ~5MB decoded, the API limit

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const INVENTORY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["problem", "items"],
  properties: {
    problem: { type: "string", enum: ["none", "too_dark", "blurry", "not_a_fridge", "almost_empty"] },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["seen", "name", "sure", "expiring"],
        properties: {
          // Written first, so the name is grounded in what is actually visible.
          seen: { type: "string" },
          name: { type: "string" },
          sure: { type: "boolean" },
          expiring: { type: "boolean" },
        },
      },
    },
  },
};

const ONE_RECIPE = {
  type: "object",
  additionalProperties: false,
  required: ["title", "minutes", "extra_cost", "level", "emoji", "uses", "missing", "steps"],
  properties: {
    title: { type: "string" },
    minutes: { type: "integer" },
    extra_cost: { type: "integer" },
    level: { type: "string" },
    emoji: { type: "string" },
    uses: { type: "array", items: { type: "string" } },
    missing: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "optional"],
        properties: { name: { type: "string" }, optional: { type: "boolean" } },
      },
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "tip", "timer_sec"],
        properties: { text: { type: "string" }, tip: { type: "string" }, timer_sec: { type: "integer" } },
      },
    },
  },
};

const RECIPE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["recipes"],
  properties: { recipes: { type: "array", items: ONE_RECIPE } },
};

const INVENTORY_SYSTEM = `You list the food visible in photos of a home fridge, freezer or pantry, for a cooking app. The user checks your list before it is saved, so an honest "not sure" is better than a guess.
- Work through each photo systematically: shelf by shelf from top to bottom, then door shelves, then drawers. Look at every package, jar, bottle, bag and loose item, including ones that are partly hidden or at the edges. Read Hebrew and English labels.
- For each item, first write "seen": where it is and what you actually see (e.g. "photo 1, door, small jar, label 'חרדל'", "photo 2, drawer, 3 red bell peppers"). Then the name.
- name: short and natural, like a shopping list (in Hebrew: "גבינה לבנה", "מחית קארי", "רוטב סויה"). No brands unless the brand is the product ("נוטלה").
- sure=true only when the label is readable or the food itself is plainly visible (fruit, vegetables, eggs). sure=false when you are inferring from shape, color or context (an unlabeled jar, an opaque container, a blurry label). Do not guess what is inside closed opaque containers; skip them unless the label says.
- Only list what is in these photos. Never add items because they are typical of a kitchen. One entry per product, even if there are several of it.
- Skip water, ice, medicine and non-food.
- expiring=true only for produce that clearly needs to be used in 1-2 days.
- problem: "too_dark", "blurry", "not_a_fridge" (not a fridge, freezer or pantry) or "almost_empty" when that is the case, else "none".`;

const RECIPE_SYSTEM = `You are Louie, a cooking buddy for students. Given what the user has, suggest exactly 3 different dinners they can cook now (different styles, e.g. one pan dish, one pasta/rice, one quick no-fuss option).
- Everything in natural, casual language; address the user in gender-neutral wording where the language allows.
- Build it mainly from the given items; prefer items marked as expiring. Assume a basic pantry: salt, pepper, oil, sugar, flour, common spices (never list them).
- uses: the exact item names from the list that the recipe uses.
- missing: at most 2 things to buy; optional=true if the dish works without it. extra_cost: rough shekel cost of non-optional missing items (0 if none).
- Cheap and simple, at most 30 minutes unless asked otherwise. level: "very easy", "easy" or "medium", translated (in Hebrew: "קל מאוד", "קל", "בינוני").
- Order the 3 recipes best first. Titles short (2-5 words).
- 3 to 6 short steps, one action each. tip: a short practical hint or "". timer_sec only for timed cooking/waiting, else 0.
- emoji: one food emoji that matches the dish.
- Follow preferences and the change request strictly (e.g. vegetarian = no meat or fish).`;

const PARSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["add", "remove", "request"],
  properties: {
    add: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "place"],
        properties: { name: { type: "string" }, place: { type: "string", enum: ["fridge", "pantry", "freezer"] } },
      },
    },
    remove: { type: "array", items: { type: "string" } },
    request: { type: "string" },
  },
};

const PARSE_SYSTEM = `You read one short message a user typed or dictated to Louie, a cooking app, about their kitchen.
- add: food they now have (bought, got, cooked leftovers). Names short and natural, like a shopping list (in Hebrew: "ביצים", "שאריות אורז"), no quantities. place: "fridge", "pantry" (dry goods, cans, bread, onions, garlic, potatoes) or "freezer".
- remove: food that is finished, thrown out or used up. Use the exact name from the current kitchen list when it matches.
- request: if they ask what to cook or describe a craving ("משהו חריף ומהיר", "בלי בשר"), restate it briefly; otherwise "".
- Ignore anything that is not about food or cooking. Never invent items.`;

// The app can run in any language; Claude writes every user-facing word in it. Default: Hebrew.
function langRule(lang?: string) {
  const code = (lang ?? "he").toLowerCase().replace(/[^a-z-]/g, "").slice(0, 12) || "he";
  return `\n- Write every user-facing word (item names, titles, steps, tips, levels) in the language with code "${code}". Keep brand names as printed.`;
}

type Body = {
  lang?: string; // BCP-47 code of the app language, e.g. "he", "en", "es"
  mode?: "inventory" | "recipe" | "parse";
  images?: { data: string; media_type: string }[];
  items?: { name: string; expiring?: boolean }[];
  prefs?: Record<string, string>;
  change_request?: string;
  avoid_titles?: string[];
  text?: string;
  kitchen?: string[];
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
    return json({ error: "bad_json" }, 400);
  }
  const client = new Anthropic({ apiKey });

  try {
    if (body.mode === "recipe") return await recipe(client, body);
    if (body.mode === "parse") return await parseText(client, body);
    return await inventory(client, body);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "bad_api_key" }, 500);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: "claude_error", status: e.status }, 502);
    console.log(JSON.stringify({ server_error: String(e) }));
    return json({ error: "server_error" }, 500);
  }
});

async function inventory(client: Anthropic, body: Body) {
  const images = (body.images ?? []).slice(0, MAX_IMAGES);
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  const bad = images.length === 0
    ? "no_images"
    : images.find((i) => !i.data) ? "empty_image"
    : images.find((i) => !allowed.includes(i.media_type)) ? "bad_type"
    : images.find((i) => i.data.length > MAX_IMAGE_B64) ? "too_big"
    : null;
  if (bad) {
    console.log(JSON.stringify({ rejected: bad }));
    return json({ error: "bad_images", detail: bad }, 400);
  }
  const params = {
    model: VISION_MODEL,
    max_tokens: 16000, // room for thinking at medium effort; the item list itself is ~500 tokens
    system: INVENTORY_SYSTEM + langRule(body.lang),
    thinking: { type: "adaptive" },
    // medium (Opus 5.5's default): at low it answered from a quick glance with no reasoning.
    output_config: { effort: "medium", format: { type: "json_schema", schema: INVENTORY_SCHEMA } },
    messages: [{
      role: "user",
      content: [
        ...images.map((i) => ({
          type: "image" as const,
          source: { type: "base64" as const, media_type: i.media_type as "image/jpeg", data: i.data },
        })),
        { type: "text" as const, text: "What's in this fridge?" },
      ],
    }],
  } as Anthropic.MessageCreateParamsStreaming;

  const enc = new TextEncoder();
  const out = new ReadableStream({
    async start(ctrl) {
      let final: unknown;
      try {
        const stream = client.messages.stream(params);
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") ctrl.enqueue(enc.encode(ev.delta.text));
        }
        const res = await stream.finalMessage();
        const data = parse(res);
        final = data;
        console.log(JSON.stringify({ mode: "inventory", images: images.length, problem: data.problem, n: data.items?.length, items: data.items?.map((i: { name: string; sure?: boolean; seen?: string }) => `${i.name}${i.sure === false ? "?" : ""} [${i.seen ?? ""}]`), usage: res.usage }));
      } catch (e) {
        final = { error: errorCode(e) };
        console.log(JSON.stringify({ inventory_error: String(e) }));
      }
      ctrl.enqueue(enc.encode(`${DONE}${JSON.stringify(final)}`));
      ctrl.close();
    },
  });
  return new Response(out, { headers: { ...cors, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
}

const DONE = "\n@@DONE@@";

function errorCode(e: unknown) {
  if (e instanceof Anthropic.AuthenticationError) return "bad_api_key";
  if (e instanceof Anthropic.RateLimitError) return "busy";
  if (e instanceof Anthropic.APIError) return "claude_error";
  return "server_error";
}

async function recipe(client: Anthropic, body: Body) {
  const items = (body.items ?? []).slice(0, 60);
  const lines = [
    `What I have: ${items.map((i) => (i.expiring ? `${i.name} (needs using soon)` : i.name)).join(", ") || "almost nothing"}`,
  ];
  const prefs = body.prefs ?? {};
  if (Object.keys(prefs).length) lines.push(`Preferences: ${Object.entries(prefs).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  if (body.change_request) lines.push(`I want something different: "${body.change_request}".`);
  if (body.avoid_titles?.length) lines.push(`Not these again: ${body.avoid_titles.join(" | ")}`);

  const res = await client.messages.create({
    model: RECIPE_MODEL,
    max_tokens: 5000,
    system: RECIPE_SYSTEM + langRule(body.lang),
    output_config: { effort: "low", format: { type: "json_schema", schema: RECIPE_SCHEMA } },
    messages: [{ role: "user", content: lines.join("\n") }],
  } as Anthropic.MessageCreateParamsNonStreaming);
  const data = parse(res);
  if ("error" in data) return json(data, 502);
  console.log(JSON.stringify({ mode: "recipe", titles: data.recipes?.map((r: { title: string }) => r.title), usage: res.usage }));
  return json(data);
}

async function parseText(client: Anthropic, body: Body) {
  const text = (body.text ?? "").trim().slice(0, 400);
  if (!text) return json({ error: "empty_text" }, 400);
  const kitchen = (body.kitchen ?? []).slice(0, 120);
  const res = await client.messages.create({
    model: PARSE_MODEL,
    max_tokens: 1000,
    system: PARSE_SYSTEM + langRule(body.lang),
    output_config: { effort: "low", format: { type: "json_schema", schema: PARSE_SCHEMA } },
    messages: [{ role: "user", content: `Current kitchen: ${kitchen.join(", ") || "empty"}\nMessage: "${text}"` }],
  } as Anthropic.MessageCreateParamsNonStreaming);
  const data = parse(res);
  if ("error" in data) return json(data, 502);
  console.log(JSON.stringify({ mode: "parse", n_add: data.add?.length, n_remove: data.remove?.length, usage: res.usage }));
  return json(data);
}

// deno-lint-ignore no-explicit-any
function parse(res: Anthropic.Message): any {
  if (res.stop_reason === "refusal") return { error: "refused" };
  if (res.stop_reason === "max_tokens") return { error: "too_long" };
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return { error: "no_output" };
  return JSON.parse(text.text);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

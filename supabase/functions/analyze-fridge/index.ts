// Louie server function. Two modes, so photos are sent to Claude only once:
//   mode "inventory": fridge photo(s) -> list of items + problem flag (vision, strong model)
//   mode "recipe":    confirmed item list (text) -> one recipe (cheap, fast model)
// The Anthropic key is read from the ANTHROPIC_API_KEY secret. It never reaches the app.
import Anthropic from "npm:@anthropic-ai/sdk@1.7.0";

const VISION_MODEL = "claude-opus-5-5"; // best at reading packed shelves and Hebrew labels
const RECIPE_MODEL = "claude-sonnet-5-5"; // text only, ~5x cheaper per call
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
        required: ["name", "expiring"],
        properties: { name: { type: "string" }, expiring: { type: "boolean" } },
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

const INVENTORY_SYSTEM = `You list what is inside a fridge from photos, for a cooking app in Israel.
- Go shelf by shelf (top to bottom), then the door shelves, then the drawers, across all photos (they show the same fridge). Read Hebrew and English labels on packages and jars.
- Return every distinct food item you can identify, up to 40, no duplicates. Names in short, natural Hebrew, like a shopping list ("גבינה לבנה", "מחית קארי", "רוטב סויה").
- Only things you can actually see. Never invent. If you can't tell what a package is, skip it unless it is clearly food you can name generically ("יוגורט", "רוטב"). Do NOT list vague containers like "קופסה כחולה" or "קרטון כתום".
- Skip water, ice, medicine and non-food.
- expiring=true only for produce that clearly needs to be used in 1-2 days.
- problem: "too_dark", "blurry", "not_a_fridge" or "almost_empty" when that is the case, else "none".`;

const RECIPE_SYSTEM = `You are Louie, a cooking buddy for students in Israel. Given what the user has, suggest exactly 3 different dinners they can cook now (different styles, e.g. one pan dish, one pasta/rice, one quick no-fuss option).
- Everything in natural, casual Hebrew (masculine singular is fine).
- Build it mainly from the given items; prefer items marked as expiring. Assume a basic pantry: salt, pepper, oil, sugar, flour, common spices (never list them).
- uses: the exact item names from the list that the recipe uses.
- missing: at most 2 things to buy; optional=true if the dish works without it. extra_cost: rough shekel cost of non-optional missing items (0 if none).
- Cheap and simple, at most 30 minutes unless asked otherwise. level: "קל מאוד", "קל" or "בינוני".
- Order the 3 recipes best first. Titles short (2-5 words).
- 3 to 6 short steps, one action each. tip: a short practical hint or "". timer_sec only for timed cooking/waiting, else 0.
- emoji: one food emoji that matches the dish.
- Follow preferences and the change request strictly (e.g. vegetarian = no meat or fish).`;

type Body = {
  mode?: "inventory" | "recipe";
  images?: { data: string; media_type: string }[];
  items?: { name: string; expiring?: boolean }[];
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
    return json({ error: "bad_json" }, 400);
  }
  const client = new Anthropic({ apiKey });

  try {
    if (body.mode === "recipe") return await recipe(client, body);
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
    max_tokens: 6000,
    system: INVENTORY_SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema: INVENTORY_SCHEMA } },
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
  const body = new ReadableStream({
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
        console.log(JSON.stringify({ mode: "inventory", images: images.length, problem: data.problem, n: data.items?.length, items: data.items?.map((i: { name: string }) => i.name), usage: res.usage }));
      } catch (e) {
        final = { error: errorCode(e) };
        console.log(JSON.stringify({ inventory_error: String(e) }));
      }
      ctrl.enqueue(enc.encode(`${DONE}${JSON.stringify(final)}`));
      ctrl.close();
    },
  });
  return new Response(body, { headers: { ...cors, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
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
    system: RECIPE_SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema: RECIPE_SCHEMA } },
    messages: [{ role: "user", content: lines.join("\n") }],
  } as Anthropic.MessageCreateParamsNonStreaming);
  const data = parse(res);
  if ("error" in data) return json(data, 502);
  console.log(JSON.stringify({ mode: "recipe", titles: data.recipes?.map((r: { title: string }) => r.title), usage: res.usage }));
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

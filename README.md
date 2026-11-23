# Louie

Fridge photo → one recipe you can cook now, plus a shopping list. Hebrew, RTL, built with Expo (React Native) for web, iOS and Android.

Design: [Figma – Louie App Design](https://www.figma.com/design/MJ8eR57qRo52Ypr7fNL05V)

## Status

Stage 1: all screens from the Figma flow, running on sample data (`src/data/mock.ts`).
Not yet connected: Claude vision (fridge photo → items + recipe), Supabase, push notifications.

## Run it (Mac)

1. Install [Node.js LTS](https://nodejs.org) and [VS Code](https://code.visualstudio.com).
2. In a terminal:
   ```bash
   git clone https://github.com/RoieFlam/louie
   cd louie
   npm install
   npx expo start
   ```
3. Press `w` to open in the browser, or scan the QR code with the **Expo Go** app on your phone.

## Structure

```
src/app/            screens (Expo Router: one file = one screen)
  index.tsx         splash
  camera.tsx        home + camera, permission sheet, rotating card
  loading.tsx       detection animation → recipe
  recipe.tsx        recipe, editable "what I saw", one pref question, "something else" sheet
  cook.tsx          cooking mode: one step per screen, timer, keeps screen awake
  cooked.tsx        "I cooked" + reminder opt-in
  staples.tsx       staples list (first shopping trip only)
  shopping.tsx      shopping list
src/components/ui.tsx   Txt, Button, Chip, Sheet, Mascot (RTL handled here)
src/theme.ts        colors and fonts from Figma
src/state/store.tsx in-memory app state
src/data/mock.ts    sample recipes and items
```

## Rules

- API keys never go in this repo or in the app. The Claude key lives only in a server function (Supabase Edge Function secret).
- Run `npx tsc --noEmit` before every commit.

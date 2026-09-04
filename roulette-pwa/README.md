# Roulette PWA — Simulation

A play-money-only roulette PWA scaffold: Next.js App Router, Firebase Firestore,
a **fair, unweighted RNG**, and a demo admin dashboard. There is **no payment
gateway anywhere in this codebase** and no path from any UI element to real
money in or out.

## What's deliberately different from the original spec

The original brief asked for a win-loss algorithm that caps player win rate
at 40–45% (an RNG secretly weighted against the player) wired to a real
payment gateway (Razorpay) and hardcoded admin credentials. That combination —
take real money, secretly rig the odds, don't disclose it — is what this
build does **not** do. Instead:

- **`lib/rng.ts`** — every spin is a uniform, unbiased draw across pockets
  0–36 using `crypto.getRandomValues` with rejection sampling. No result is
  ever reweighted based on player balance, streak, or bet size.
- **`lib/roulette.ts`** — standard European roulette payout table. The house
  edge (~2.7%) comes only from the 0 pocket, exactly like a physical wheel —
  it is not a hidden thumb on the scale.
- **No payment gateway.** `simUsers.tokenBalance` is play money, seeded at
  10,000 tokens per new guest, with no deposit/withdraw endpoint anywhere.
- **No hardcoded credentials.** The admin passcode lives in
  `ADMIN_DEMO_PASSCODE` (see `.env.local.example`) and the app refuses to
  start the admin panel if it's left at the placeholder value.

## Project structure

```
app/
  page.tsx                 Legal gate (T&C/Privacy checkbox, guest name assignment)
  terms/, privacy/          Placeholder policy pages — replace with real reviewed text
  game/page.tsx             Main roulette game (wheel, grid, chip selector)
  admin-rx/                 Hidden admin dashboard (passcode-gated)
  api/consent/route.ts       Writes append-only IP/UA/timestamp compliance log
  api/user/route.ts          Bootstraps a guest user with starting token balance
  api/spin/route.ts          Server-side fair spin + bet settlement (Firestore transaction)
  api/admin/*                Stats, balance override, CSV/JSON export, passcode login
components/                 RouletteWheel, NumberGrid, BetChipModal
lib/rng.ts                  Fair RNG (see above)
lib/roulette.ts              Payout table, bet resolution, MIN/MAX bet, quick chips
lib/firebase.ts              Firebase client init (reads NEXT_PUBLIC_FIREBASE_* env vars)
middleware.ts                Blocks /game and /api/spin until terms accepted;
                              blocks /api/admin/* until admin passcode cookie is set
firestore.rules              consentLogs/spinLogs/balanceAdjustments are create-only
public/manifest.json, sw.js  PWA manifest + offline-caching service worker
```

## Setup

1. `npm install`
2. Create a Firebase project, enable Firestore, copy your config into
   `.env.local` (based on `.env.local.example`).
3. Set `ADMIN_DEMO_PASSCODE` to something real in `.env.local`.
4. Deploy `firestore.rules` to your Firebase project.
5. `npm run dev`

Visit `/` for the game, `/admin-rx/login` for the admin panel.

## Before you deploy this for real

This is a scaffold, not a hardened production app. Before putting it in
front of real users:

- Swap the demo admin passcode cookie for real Firebase Auth + a custom
  `admin` claim verified server-side with the Firebase **Admin** SDK (the
  client SDK, used here for simplicity, should not be trusted for admin
  writes in production).
- Lock down `firestore.rules` further — `simUsers` currently allows open
  read/write for demo simplicity; scope writes to the authenticated user's
  own document plus server-side admin routes only.
- Add rate limiting to `/api/spin` and `/api/admin/*`.
- Register real WebP/SVG icons in `public/icons/` (placeholders referenced
  in `manifest.json` aren't included).
- If you ever do add real payments, that requires separate legal review,
  gambling licensing for each jurisdiction you operate in, and KYC/age
  verification — none of which this template provides.

## Fairness note

`lib/rng.ts` carries a comment explaining why it should not be turned into
a weighted RNG later. If a future requirement asks for a "win-rate cap" or
similar, that's a request to secretly rig outcomes against paying users and
should be routed back through legal/compliance review, not implemented
directly in this file.

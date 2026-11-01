# What was added

| Feature | Where |
|---|---|
| **Closing line**: a new random quote every time the card comes into view, changes by a calm word-by-word drift (old words dissolve upward, new words float in and settle) | `src/data/quotes.ts`, `src/ui/closingQuote.ts`, `src/ui/useQuoteReel.ts`, `src/ui/QuoteReel.tsx` |
| **Photos**: tilt toward the cursor, glare and film grain on hover | `src/ui/PhotoFigure.tsx`, `src/data/effects.ts` |
| Key phrases in the "About me" copy get an underline that draws itself in | `renderCopy()` in `src/ui/Resume.tsx` |
| Audio-reactive 3D scene (sky glow, bloom, fill light, character sway) | `src/audio/`, `src/scene/Scene.tsx` |

## Gallery opening panel
The horizontal gallery strip starts with one full screen (it used to be empty, with only the "Personal Gallery" title). That screen holds one big line — `intro` in `src/data/works.ts` (`*word*` marks the highlighted word) — written letter by letter: every letter springs up with a small tilt and settles; the marked word gets a hand-drawn squiggle that draws itself, then a gentle ripple runs through its letters. As you scroll it slides off to the left while the photo cards slide in from the right. Component: `GalleryIntro` in `src/ui/Works.tsx` (spring feel: `stiffness` / `damping`; speed: the `0.034` stagger); styles: `.wk-intro*` in `enhance.css`. With *reduce motion* everything is simply shown.

## Closing line
`src/data/quotes.ts` holds the lines — add, edit or delete freely. **Every time the card scrolls into view** (page open, after leaving the gallery, or scrolling back to it) a new line is picked — never the same one twice in a row, also across reloads (`localStorage`). The very first time, nothing is shown beforehand: the words simply drift in. After that it changes like a thought settling: the old line's words lift, drift sideways a little and dissolve into blur; the new line's words float in from slightly scattered places, out of focus, one after another, and settle into the sentence. No flashing, no spinning.

Timings are the constants at the top of `QuoteReel.tsx` (`OUT_MS`, `IN_START`, `IN_MS`, `IN_STEP`); the look is the `.qr-*` rules in `enhance.css`. The window has a fixed height so nothing jumps. Flicking in and out of view within 2.5 s doesn't re-roll (`cooldownMs`). With *reduce motion* the line simply swaps.

## Photos
`src/data/effects.ts` → `photoTilt`, `photoGrain`. Tilt is for mouse/pen only, never touch.

## Audio-reactive scene
`scripts/make-envelope.mjs` analyses the MP3 once (bass + drum hits, ~13 KB) and the site reads that file in sync with `audio.currentTime` — it never touches the audio stream, so it works in every browser and cannot affect playback.

```bash
npm run envelope        # needs ffmpeg; regenerates public/hobbies/music/gallery-track.env.json
```
**Re-run it whenever you change the song.**

## Tests
`e2e/smoke.spec.ts` checks: no runtime errors, photos tilt + captions, highlighted phrases, and that the closing line changes between visits.

## Spinning tab icon
`src/ui/spinFavicon.ts` (started from `main.tsx`) — the vinyl-record favicon turns at ~0.4 rev/s: the record is redrawn on a 64 px canvas every 100 ms and swapped in as the page icon, with a fixed glint across the grooves so the spin reads at 16 px. `public/favicon.png` / `favicon-32.png` were re-cropped so the disc fills the whole icon (browsers fix tab icons at 16×16 px, so that's as "big" as it can get). In background tabs Chrome throttles timers to ~1 tick/s, so there it turns in slower steady steps (not at all if the tab is asleep); Safari may keep the still icon; *reduce motion* keeps it still. Speed: `RPS`.

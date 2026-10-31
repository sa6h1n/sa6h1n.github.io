# What was added

| Feature | Where |
|---|---|
| **Closing line**: a new random quote every time the card comes into view, changes by a calm word-by-word drift (old words dissolve upward, new words float in and settle) | `src/data/quotes.ts`, `src/ui/closingQuote.ts`, `src/ui/useQuoteReel.ts`, `src/ui/QuoteReel.tsx` |
| **Photos**: tilt toward the cursor, glare and film grain on hover | `src/ui/PhotoFigure.tsx`, `src/data/effects.ts` |
| Key phrases in the "About me" copy get an underline that draws itself in | `renderCopy()` in `src/ui/Resume.tsx` |
| Audio-reactive 3D scene (sky glow, bloom, fill light, character sway) | `src/audio/`, `src/scene/Scene.tsx` |

## Closing line
`src/data/quotes.ts` holds the lines — add, edit or delete freely. **Every time the card scrolls into view** (page open, after leaving the gallery, or scrolling back to it) a new line is picked — never the same one twice in a row, also across reloads (`localStorage`) — and it changes like a thought settling: the old line's words lift, drift sideways a little and dissolve into blur; the new line's words float in from slightly scattered places, out of focus, one after another, and settle into the sentence. No flashing, no spinning.

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

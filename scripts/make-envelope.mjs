#!/usr/bin/env node
// Pre-computes a tiny "bass + kick" envelope for a track so the 3D scene can pulse in
// sync with the music — in every browser, with no Web Audio and no effect on playback.
//
//   node scripts/make-envelope.mjs public/hobbies/music/gallery-track.mp3
//   -> public/hobbies/music/gallery-track.env.json   (≈13 KB)
//
// Needs ffmpeg on your PATH. Re-run it whenever you change the song.
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const input = process.argv[2]
if (!input) {
  console.error('usage: node scripts/make-envelope.mjs <audio-file> [output.json]')
  process.exit(1)
}
const output = process.argv[3] ?? input.replace(/\.[^./\\]+$/, '') + '.env.json'

const SR = 22050
const FPS = 30
const HOP = Math.round(SR / FPS)

const ff = spawn('ffmpeg', ['-v', 'error', '-i', input, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'])
const chunks = []
ff.stdout.on('data', (c) => chunks.push(c))
ff.stderr.pipe(process.stderr)
ff.on('error', () => {
  console.error('Could not run ffmpeg — install it first (https://ffmpeg.org).')
  process.exit(1)
})
ff.on('close', (code) => {
  if (code) process.exit(code)
  const raw = Buffer.concat(chunks)
  const pcm = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length))

  // two cascaded one-pole low-passes (~140 Hz) isolate kick drum + bass
  const a = Math.exp((-2 * Math.PI * 140) / SR)
  let y1 = 0, y2 = 0
  const frames = Math.floor(pcm.length / HOP)
  const energy = new Float32Array(frames)
  for (let f = 0; f < frames; f++) {
    let sum = 0
    for (let i = f * HOP; i < (f + 1) * HOP; i++) {
      y1 += (1 - a) * (pcm[i] - y1)
      y2 += (1 - a) * (y1 - y2)
      sum += y2 * y2
    }
    energy[f] = Math.sqrt(sum / HOP)
  }

  const pct = (arr, p) => [...arr].sort((x, y) => x - y)[Math.floor((arr.length - 1) * p)] || 1e-9
  const hi = pct(energy, 0.98)
  const bass = energy.map((e) => Math.min(1, e / hi) ** 0.85)

  // kick = how much the bass jumps above its recent average
  const flux = new Float32Array(frames)
  for (let f = 0; f < frames; f++) {
    let avg = 0
    const n = Math.min(f, 6)
    for (let k = 1; k <= n; k++) avg += bass[f - k]
    avg = n ? avg / n : bass[f]
    flux[f] = Math.max(0, bass[f] - avg)
  }
  const fhi = pct(flux, 0.97)
  const kick = flux.map((v) => Math.min(1, v / fhi))

  const q = (arr) => Buffer.from(Uint8Array.from(arr, (v) => Math.round(v * 255))).toString('base64')
  writeFileSync(output, JSON.stringify({ v: 1, fps: FPS, duration: +(pcm.length / SR).toFixed(2), bass: q(bass), kick: q(kick) }))

  // rough tempo estimate from the kick signal, just so you can sanity-check the result
  let best = 0, bestLag = 0
  for (let lag = 12; lag <= 30; lag++) {
    let s = 0
    for (let f = lag; f < frames; f++) s += kick[f] * kick[f - lag]
    if (s > best) { best = s; bestLag = lag }
  }
  console.log(`wrote ${output}  (${frames} frames, ${(pcm.length / SR).toFixed(1)}s, ~${Math.round((60 * FPS) / bestLag)} BPM)`)
})

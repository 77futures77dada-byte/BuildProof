// Synthesises the soundtrack: an original 8-bit bed at 120 BPM and the effects,
// as two WAV files. Nothing is sampled or borrowed; the same input always gives
// the same bytes. Effect times come from src/timeline.js, the file the picture
// reads, so a tap and its click stay on the same frame.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { runInNewContext } from 'node:vm'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// src/timeline.js is a plain browser script; run it in a sandbox to read it here
const sandbox = { self: {} }
runInNewContext(readFileSync(join(root, 'src/timeline.js'), 'utf8'), sandbox)
const { DURATION, BPM, EVENTS: E } = sandbox.self.AD_TIMELINE

const SR = 44100
const N = DURATION * SR
const BEAT = 60 / BPM
const MUSIC_LUFS = -18

// deterministic noise
let seed = 0x1234abcd
const noise = () => {
  seed ^= seed << 13
  seed ^= seed >>> 17
  seed ^= seed << 5
  return ((seed >>> 0) / 0xffffffff) * 2 - 1
}

const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12)
const square = (ph, duty) => (ph % 1 < duty ? 1 : -1)
const triangle = (ph) => 4 * Math.abs((ph % 1) - 0.5) - 1

/** Adds one note. wave: 'sq' | 'sq25' | 'tri' | 'noise'; decay in seconds; slide in Hz/s. */
function note(buf, at, dur, freq, vol, wave, o = {}) {
  const start = Math.round(at * SR)
  const len = Math.round(dur * SR)
  let ph = 0
  let held = 0
  for (let i = 0; i < len; i++) {
    const idx = start + i
    if (idx < 0 || idx >= N) continue
    const t = i / SR
    const f = Math.max(20, freq + (o.slide || 0) * t)
    ph += f / SR
    let s
    if (wave === 'tri') s = Math.round(triangle(ph) * 7) / 7 // stepped, NES style
    else if (wave === 'noise') {
      // sample-and-hold noise: pitch = how often it changes
      if (i % Math.max(1, Math.round(SR / f)) === 0) held = noise()
      s = held
    } else s = square(ph, wave === 'sq25' ? 0.25 : wave === 'sq12' ? 0.125 : 0.5)
    const attack = Math.min(1, i / (0.002 * SR))
    const release = Math.min(1, (len - i) / (0.004 * SR))
    const env = o.decay ? Math.exp(-t / o.decay) : 1
    buf[idx] += s * vol * attack * release * env
  }
}

// ---------------------------------------------------------------- music
const music = new Float32Array(N)
const CHANGE = 2.5 // question -> answer

// 0.0-2.5: the question. A minor, no drums, a phone-like figure that does not resolve.
for (let b = 0; b < 5; b++) {
  const t = b * BEAT
  note(music, t, 0.22, hz(45), 0.5, 'tri')
  note(music, t + 0.25, 0.1, hz(45), 0.3, 'tri')
  if (b < 4) {
    note(music, t, 0.09, hz(76), 0.2, 'sq25')
    note(music, t + 0.125, 0.09, hz(76), 0.2, 'sq25')
    note(music, t + 0.25, 0.09, hz(72), 0.16, 'sq25')
  }
}
note(music, 2.0, 0.45, hz(71), 0.22, 'sq25', { decay: 0.3 }) // leading tone into the change
for (let i = 0; i < 4; i++) note(music, 2.0 + i * 0.125, 0.05, 3000 + i * 1500, 0.1, 'noise', { decay: 0.03 })

// 2.5-27.0: the answer. C G Am F, two beats a chord, drums in.
const CHORDS = [
  [48, [60, 64, 67]], // C
  [43, [59, 62, 67]], // G
  [45, [60, 64, 69]], // Am
  [41, [60, 65, 69]], // F
]
const LEAD = [
  // one melodic cell per chord, as [16th step, midi, length in 16ths]
  [[0, 79, 2], [2, 76, 2], [4, 72, 2], [6, 76, 2]],
  [[0, 74, 2], [2, 79, 2], [4, 83, 3]],
  [[0, 81, 2], [2, 76, 2], [4, 72, 2], [6, 76, 1], [7, 81, 1]],
  [[0, 77, 3], [4, 72, 2], [6, 69, 2]],
]
const S16 = BEAT / 4
const quiet = (t) => t >= 22.5 && t < 24.5 // the basement: band drops out
for (let k = 0; CHANGE + k * BEAT * 2 < 27; k++) {
  const t0 = CHANGE + k * BEAT * 2
  const [bass, tones] = CHORDS[k % 4]
  const thin = quiet(t0)
  for (let s = 0; s < 8; s++) {
    const t = t0 + s * S16
    // bass: root on the 8ths, octave up on the off-beats
    if (s % 2 === 0) note(music, t, S16 * 1.7, hz(bass + (s % 4 === 2 ? 12 : 0)), 0.5, 'tri')
    if (!thin) {
      // arpeggio
      note(music, t, S16 * 0.8, hz(tones[s % 3] + (s >= 6 ? 12 : 0)), 0.11, 'sq', { decay: 0.12 })
      // drums: kick 1 and 3, snare 2 and 4 (in half-bar units), hats on 8ths
      if (s === 0) note(music, t, 0.11, 150, 0.4, 'tri', { slide: -900, decay: 0.05 })
      if (s === 4) note(music, t, 0.1, 7000, 0.2, 'noise', { decay: 0.035 })
      if (s % 2 === 0) note(music, t, 0.03, 14000, 0.07, 'noise', { decay: 0.012 })
    } else if (s % 4 === 0) note(music, t, 0.03, 14000, 0.05, 'noise', { decay: 0.012 })
  }
  if (!thin && t0 >= 5) {
    for (const [s, m, l] of LEAD[k % 4]) note(music, t0 + s * S16, l * S16 * 0.92, hz(m), 0.15, 'sq25', { decay: 0.25 })
  }
}

// 27.0-30.0: the mark. Rising C arpeggio, a held chord on the hold, a short fade.
;[60, 64, 67, 72, 76, 79, 84].forEach((m, i) => note(music, 27 + i * S16 * 2, 0.3, hz(m), 0.16, 'sq25', { decay: 0.2 }))
for (let b = 0; b < 4; b++) {
  note(music, 27 + b * BEAT, 0.45, hz(36 + (b % 2) * 12), 0.5, 'tri')
  note(music, 27 + b * BEAT, 0.11, 150, 0.4, 'tri', { slide: -900, decay: 0.05 })
  note(music, 27 + b * BEAT + 0.25, 0.03, 14000, 0.07, 'noise', { decay: 0.012 })
}
for (const m of [48, 60, 64, 67, 72]) note(music, 29, 0.95, hz(m), m === 48 ? 0.45 : 0.1, m === 48 ? 'tri' : 'sq', { decay: 0.35 })
for (let i = Math.round(29.5 * SR); i < N; i++) music[i] *= Math.max(0, 1 - (i / SR - 29.5) / 0.45)

// ---------------------------------------------------------------- effects
const sfx = new Float32Array(N)
const FRAME = 1 / 30 // sound lands one frame after its picture
const click = (t, v = 0.5) => {
  note(sfx, t + FRAME, 0.018, 1900, v, 'sq', { decay: 0.006 })
  note(sfx, t + FRAME, 0.03, 420, v * 0.7, 'tri', { decay: 0.012 })
}
const ping = (t, v = 0.42) => {
  note(sfx, t + FRAME, 0.07, hz(88), v, 'sq25', { decay: 0.08 })
  note(sfx, t + FRAME + 0.07, 0.3, hz(95), v, 'sq25', { decay: 0.11 })
}
const blip = (t, f0, f1, dur, v) => note(sfx, t + FRAME, dur, f0, v, 'sq25', { slide: (f1 - f0) / dur, decay: dur * 0.7 })

E.bubbles.forEach((t, i) => blip(t, 500 + i * 80, 900 + i * 80, 0.06, 0.3))
E.calls.forEach((t, i) => note(sfx, t + FRAME, 0.035, hz(81 + i), 0.26, 'sq', { decay: 0.02 }))
click(E.shutter, 0.6)
note(sfx, E.shutter + FRAME + 0.02, 0.16, 9000, 0.45, 'noise', { decay: 0.045 }) // flash
click(E.plus10)
click(E.send)
ping(E.sent)
click(E.plus40)
click(E.sendJump)
blip(E.pending, 520, 440, 0.12, 0.28) // "waiting", neutral
note(sfx, E.wipe + FRAME, 0.3, 2500, 0.16, 'noise', { slide: 20000, decay: 0.2 }) // whoosh on the wipe
click(E.confirm)
ping(E.verified)
E.cards.forEach((t, i) => blip(t, 700 + i * 60, 760 + i * 60, 0.04, 0.2))
// alarm on the red card: deliberately quiet
E.alarm.forEach((t) => {
  note(sfx, t + FRAME, 0.09, 740, 0.16, 'sq', { decay: 0.2 })
  note(sfx, t + FRAME + 0.12, 0.09, 622, 0.16, 'sq', { decay: 0.2 })
})
E.stages.forEach((t, i) => {
  note(sfx, t + FRAME, 0.05, 120, 0.5, 'tri', { slide: -600, decay: 0.03 }) // lands
  note(sfx, t + FRAME, 0.12, hz([72, 76, 79, 84][i]), 0.3, 'sq25', { decay: 0.07 })
})
blip(E.pendingShown, 660, 880, 0.08, 0.26)
blip(E.offline, 420, 190, 0.22, 0.34) // no signal: falls
E.rows.forEach((t, i) => note(sfx, t + FRAME + 0.22, 0.05, hz(84 + i * 2), 0.2, 'sq25', { decay: 0.03 }))
note(sfx, E.logo + 0.3 + FRAME, 0.07, 110, 0.55, 'tri', { slide: -500, decay: 0.04 })
E.lines.forEach((t, i) => note(sfx, t + FRAME, 0.04, hz(79 + i * 2), 0.18, 'sq25', { decay: 0.03 }))
click(E.ctaPress, 0.6)

// ---------------------------------------------------------------- write
function wav(file, buf, gain) {
  const out = Buffer.alloc(44 + N * 2)
  out.write('RIFF', 0)
  out.writeUInt32LE(36 + N * 2, 4)
  out.write('WAVEfmt ', 8)
  out.writeUInt32LE(16, 16)
  out.writeUInt16LE(1, 20)
  out.writeUInt16LE(1, 22)
  out.writeUInt32LE(SR, 24)
  out.writeUInt32LE(SR * 2, 28)
  out.writeUInt16LE(2, 32)
  out.writeUInt16LE(16, 34)
  out.write('data', 36)
  out.writeUInt32LE(N * 2, 40)
  let peak = 0
  for (let i = 0; i < N; i++) {
    const v = Math.max(-1, Math.min(1, buf[i] * gain))
    peak = Math.max(peak, Math.abs(v))
    out.writeInt16LE(Math.round(v * 32767), 44 + i * 2)
  }
  writeFileSync(file, out)
  return 20 * Math.log10(peak || 1e-9)
}

/** Integrated loudness (EBU R128) as measured by ffmpeg, or null without ffmpeg. */
function lufs(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' })
  const m = /Integrated loudness:\s*I:\s*(-?[\d.]+) LUFS/.exec(r.stderr || '')
  return m ? parseFloat(m[1]) : null
}

const dir = join(root, 'assets/audio')
mkdirSync(dir, { recursive: true })
const musicFile = join(dir, 'music.wav')
let gain = 0.35
wav(musicFile, music, gain)
const measured = lufs(musicFile)
if (measured === null) console.warn('ffmpeg not found: music left at a fixed gain, loudness not measured')
else {
  gain *= Math.pow(10, (MUSIC_LUFS - measured) / 20)
  const peak = wav(musicFile, music, gain)
  console.log(`music.wav  ${lufs(musicFile)} LUFS integrated (target ${MUSIC_LUFS}), peak ${peak.toFixed(1)} dBFS`)
}
const sfxPeak = wav(join(dir, 'sfx.wav'), sfx, 0.5)
console.log(`sfx.wav    peak ${sfxPeak.toFixed(1)} dBFS`)

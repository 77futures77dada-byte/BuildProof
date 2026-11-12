// One command for the whole ad: texts -> audio -> MP4 per language -> key
// frames -> checks against the brief (30.0 s, 1080x1920, 30 fps, <= 50 MB).
//   node scripts/render.mjs            all languages
//   node scripts/render.mjs ru en      only these
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, statSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const HF = 'hyperframes@0.9.38'
const KEY_FRAMES = [0, 3, 7, 11, 15, 20, 23, 26, 29.5]
const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['ru', 'en', 'et']

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', ...opts })
  if (r.status !== 0) {
    console.error(r.stdout || '', r.stderr || '')
    throw new Error(`${cmd} ${args.join(' ')} failed`)
  }
  return r
}
const node = (script) => run(process.execPath, [join('scripts', script)], { stdio: 'inherit', shell: false })

node('build-texts.mjs')
node('make-audio.mjs')

const tmp = mkdtempSync(join(tmpdir(), 'bp-ad-'))
const failures = []
for (const lang of langs) {
  const out = join('out', `buildproof-tiktok-30s-${lang}.mp4`)
  const raw = join(tmp, `${lang}.mp4`)
  const vars = join(tmp, `${lang}.json`)
  writeFileSync(vars, JSON.stringify({ lang }))
  mkdirSync(join(root, 'out'), { recursive: true })
  console.log(`\n== ${lang}: rendering`)
  run('npx', ['--yes', HF, 'render', '.', '-o', `"${raw}"`, '--fps', '30', '--quality', 'high', '--variables-file', `"${vars}"`, '--strict-variables', '--quiet'], { stdio: 'inherit' })
  // Remux to exactly 900 frames / 30.000 s; the video stream is copied untouched.
  run('ffmpeg', ['-y', '-v', 'error', '-i', `"${raw}"`, '-t', '30', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', `"${out}"`])

  const probe = JSON.parse(
    run('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', 'format=duration:stream=codec_name,codec_type,width,height,r_frame_rate,nb_read_frames,pix_fmt', '-of', 'json', `"${out}"`]).stdout,
  )
  const v = probe.streams.find((s) => s.codec_type === 'video')
  const a = probe.streams.find((s) => s.codec_type === 'audio')
  const mb = statSync(join(root, out)).size / 1048576
  const dur = parseFloat(probe.format.duration)
  const checks = [
    ['H.264', v.codec_name === 'h264'],
    ['1080x1920', v.width === 1080 && v.height === 1920],
    ['30 fps', v.r_frame_rate === '30/1'],
    ['900 frames', Number(v.nb_read_frames) === 900],
    ['30.0 s', Math.abs(dur - 30) < 0.05],
    ['<= 50 MB', mb <= 50],
    ['audio track', !!a],
  ]
  console.log(`   ${out}: ${dur.toFixed(3)} s, ${v.nb_read_frames} frames, ${v.width}x${v.height}, ${mb.toFixed(1)} MB, ${v.pix_fmt}`)
  for (const [name, ok] of checks) if (!ok) failures.push(`${lang}: ${name}`)

  const dir = join('frames', lang)
  rmSync(join(root, dir), { recursive: true, force: true })
  mkdirSync(join(root, dir), { recursive: true })
  for (const t of KEY_FRAMES) {
    const name = join(dir, `t${String(t.toFixed(1)).padStart(4, '0')}s.png`)
    run('ffmpeg', ['-y', '-v', 'error', '-ss', String(t), '-i', `"${out}"`, '-frames:v', '1', `"${name}"`])
  }
  console.log(`   key frames -> ${dir}/`)
}
rmSync(tmp, { recursive: true, force: true })

if (failures.length) {
  console.error('\nFAILED: ' + failures.join('; '))
  process.exit(1)
}
console.log('\nAll outputs match the brief.')

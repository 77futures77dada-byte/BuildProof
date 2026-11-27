// Runs every check of the redesign in order and appends the result to
// docs/design/test-log.md:
//   lint → build (fixture Supabase, ALLOW_PLACEHOLDERS=1) → test → check-tokens →
//   check-contrast → check-ru-latin → check-overflow
//
//   node scripts/run-checks.mjs [--step "<name>"] [--tokens-report] [--strict-a11y]
// --tokens-report   run check-tokens in report mode (counts only, never fails)
// --strict-a11y     passed to check-overflow (touch targets / small text fail)
// Exit 1 if any non-report check failed.
import { spawn } from 'node:child_process'
import { appendFileSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const argv = process.argv.slice(2)
const flag = (name) => argv.includes(name)
const STEP = argv.includes('--step') ? argv[argv.indexOf('--step') + 1] : 'manual run'
const TOKENS_REPORT = flag('--tokens-report') || process.env.CHECK_TOKENS_MODE === 'report'
const LOG = join(root, 'docs/design/test-log.md')
const FIXTURE_ENV = {
  ALLOW_PLACEHOLDERS: '1',
  VITE_SUPABASE_URL: 'https://fixture.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'fixture-anon-key',
}

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, 'g')
const stripAnsi = (s) => s.replace(ANSI, '')

function run(cmd, args, env = {}) {
  return new Promise((resolve) => {
    const options = { cwd: root, env: { ...process.env, ...env, FORCE_COLOR: '0' } }
    // npm is a .cmd shim on Windows: run it through the shell as one command line
    // (our args are fixed literals, nothing user-supplied).
    const child = cmd === 'npm'
      ? spawn(['npm', ...args].join(' '), { ...options, shell: true })
      : spawn(process.execPath, [cmd, ...args], options)
    let out = ''
    const onData = (d) => { process.stdout.write(d); out += d }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('close', (code) => resolve({ code: code ?? 1, out: stripAnsi(out) }))
  })
}

const lastLine = (out, prefix) => out.split('\n').reverse().find((l) => l.startsWith(prefix))?.trim().slice(prefix.length).trim() ?? ''
function excerpt(out) {
  const lines = out.split('\n').map((l) => l.trimEnd()).filter(Boolean)
  const at = lines.findIndex((l) => /^FAILURES:/.test(l))
  if (at !== -1) return lines.slice(at + 1, at + 11)
  const hits = lines.filter((l) => /error|fail|✗|×|FAIL|offending|: (hex|colorfn|font|palette):|\.json |\.ts:\d+/i.test(l) && !/^check-\w+: (total|offending|routes)=/.test(l))
  return (hits.length ? hits : lines.slice(-10)).slice(0, 10)
}

const CHECKS = [
  {
    name: 'lint', cmd: 'npm', args: ['run', 'lint'],
    numbers: (o) => o.match(/Found \d+ warnings? and \d+ errors?/)?.[0]
      ?? `warnings=${(o.match(/: warning /g) ?? []).length} errors=${(o.match(/: error /g) ?? []).length}`,
  },
  {
    name: 'build', cmd: 'npm', args: ['run', 'build'], env: FIXTURE_ENV,
    numbers: (o) => [o.match(/built in [\d.]+m?s/)?.[0], 'VITE_SUPABASE_URL=fixture'].filter(Boolean).join(', '),
  },
  {
    name: 'test', cmd: 'npm', args: ['test'],
    numbers: (o) => [o.match(/Test Files\s+([^\n]+)/)?.[1], o.match(/\n\s*Tests\s+([^\n]+)/)?.[1]].filter(Boolean).map((s) => s.trim()).join('; '),
  },
  {
    name: TOKENS_REPORT ? 'check-tokens (report)' : 'check-tokens', cmd: 'scripts/check-tokens.mjs', args: TOKENS_REPORT ? ['--report'] : [], report: TOKENS_REPORT,
    numbers: (o) => lastLine(o, 'check-tokens:'),
  },
  {
    name: 'check-contrast', cmd: 'scripts/check-contrast.mjs', args: [],
    numbers: (o) => lastLine(o, 'check-contrast:'),
  },
  {
    name: 'check-ru-latin', cmd: 'scripts/check-ru-latin.mjs', args: [],
    numbers: (o) => lastLine(o, 'check-ru-latin:'),
  },
  {
    name: 'check-overflow', cmd: 'scripts/check-overflow.mjs', args: flag('--strict-a11y') ? ['--strict-a11y'] : [], needs: 'build',
    numbers: (o) => lastLine(o, 'check-overflow:'),
  },
]

const started = new Date()
const rows = []
const failures = []
for (const c of CHECKS) {
  const dep = c.needs && rows.find((r) => r.name === c.needs)
  if (dep && dep.result === 'FAIL') {
    rows.push({ name: c.name, result: 'FAIL', numbers: `skipped: ${c.needs} failed` })
    failures.push({ name: c.name, lines: [`not run: ${c.needs} failed`] })
    continue
  }
  console.log(`\n=== ${c.name} ===`)
  const t0 = Date.now()
  const { code, out } = await run(c.cmd, c.args, c.env)
  const secs = ((Date.now() - t0) / 1000).toFixed(0)
  const result = c.report ? 'REPORT' : code === 0 ? 'PASS' : 'FAIL'
  rows.push({ name: c.name, result, numbers: `${c.numbers(out) || `exit ${code}`} (${secs}s)` })
  if (result === 'FAIL') failures.push({ name: c.name, lines: excerpt(out) })
}

const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
const stamp = started.toISOString().replace(/\.\d+Z$/, 'Z')
let md = `\n## ${stamp} — ${STEP}\n\n| check | result | key numbers |\n|---|---|---|\n`
for (const r of rows) md += `| ${cell(r.name)} | ${r.result} | ${cell(r.numbers)} |\n`
for (const f of failures) md += `\n<details><summary>${f.name}: first lines of the failure</summary>\n\n\`\`\`\n${f.lines.join('\n')}\n\`\`\`\n</details>\n`

if (!existsSync(LOG)) writeFileSync(LOG, '# Test log — app redesign\n\nAppended by `node scripts/run-checks.mjs --step "<name>"`.\n')
appendFileSync(LOG, md)

console.log(`\n${md}`)
console.log(failures.length ? `run-checks: FAIL (${failures.map((f) => f.name).join(', ')})` : 'run-checks: all checks passed')
process.exit(failures.length ? 1 : 0)

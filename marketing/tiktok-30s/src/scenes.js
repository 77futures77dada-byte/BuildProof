/*
 * The nine scenes. render(t) draws the complete frame for time t (seconds)
 * from nothing but t and the language's strings: no state carries over between
 * frames, so any frame can be rendered in any order.
 */
;(function () {
  const {
    W, H, SAFE, FONTS, R, frame, box, dither, hatch, poly, line, disc, ring, spr, clip,
    text, measure, wrap, para, prog, easeOut, lerp, blink,
  } = window.PX
  const { SCENES: S, EVENTS: E, DURATION } = window.AD_TIMELINE

  let L = null // strings of the current language
  const CX = Math.round((SAFE.left + SAFE.right) / 2) // centre of the safe band
  // Press Start 2P squeezes Õ Ä Ö Ü into the 8 px cell, where they read as lower
  // case in the middle of a capitalised word, so such labels keep their case.
  const upper = (s) => (/[õäöü]/i.test(s) ? String(s) : String(s).toLocaleUpperCase())
  const during = (t, at, len) => t >= at && t < at + len
  /** y offset that centres 7 px caps of font f in a box of height h. */
  const capY = (f, h) => Math.round((h - 7) / 2) - FONTS[f].capTop

  // ------------------------------------------------------------------
  // People
  // ------------------------------------------------------------------
  const HAT = { worker: 'yellow', foreman: 'white', owner: 'sky' }

  /** 20x20 head. kind: worker (yellow hard hat), foreman (white), owner (cap-helmet), client (no hat). */
  function head(x, y, kind) {
    R(x + 4, y + 7, 12, 10, 'skin')
    R(x + 14, y + 7, 2, 10, 'skin2')
    R(x + 5, y + 17, 10, 1, 'skin2')
    R(x + 7, y + 11, 2, 2, 'ink')
    R(x + 12, y + 11, 2, 2, 'ink')
    R(x + 8, y + 15, 4, 1, 'brown')
    R(x + 8, y + 18, 4, 2, 'skin2')
    const c = HAT[kind]
    if (c) {
      R(x + 6, y + 1, 8, 1, c)
      R(x + 4, y + 2, 12, 2, c)
      R(x + 3, y + 4, 14, 3, c)
      R(x + 2, y + 7, 16, 2, c) // brim
      R(x + 3, y + 9, 14, 1, 'skin2') // brim shadow
      R(x + 9, y + 1, 2, 6, kind === 'foreman' ? 'g1' : 'white') // ridge
      if (kind === 'owner') R(x + 16, y + 7, 5, 2, c) // cap visor
    } else {
      R(x + 4, y + 3, 12, 4, 'brown')
      R(x + 3, y + 5, 2, 6, 'brown')
      R(x + 15, y + 5, 2, 4, 'brown')
    }
  }

  /** Role label, top-left of the safe band: who is holding this phone. */
  function roleChip(kind) {
    const label = upper(L.role[kind])
    const w = 30 + measure(label, 'h') + 8
    box(SAFE.left, 41, w, 22, 'deep', 'yellow')
    clip(SAFE.left + 1, 42, 24, 20, () => head(SAFE.left + 3, 42, kind))
    text(label, SAFE.left + 30, 48, { f: 'h', c: 'white' })
  }

  const HAND = [
    '....XX......',
    '...XSSX.....',
    '...XSSX.....',
    '...XSSX.....',
    '...XSSXXX...',
    '...XSSXSSXX.',
    'XX.XSSXSSXSX',
    'XSXXSSSSSSSX',
    'XSSXSSSSSSSX',
    '.XSSSSSSSSSX',
    '.XSSSSSSSDSX',
    '..XSSSSSSDX.',
    '..XSSSSSDDX.',
    '...XSSSSDX..',
    '...XDDDDDX..',
    '...XDDDDDX..',
  ]

  /**
   * Finger that travels between keyframes [[time, x, y], ...] and presses at
   * each time in `taps`. (x, y) is the fingertip.
   */
  function finger(t, keys, taps) {
    if (t < keys[0][0] || t > keys[keys.length - 1][0]) return
    let x = keys[0][1]
    let y = keys[0][2]
    for (let i = 0; i + 1 < keys.length; i++) {
      const a = keys[i]
      const b = keys[i + 1]
      if (t >= a[0] && t <= b[0]) {
        const p = easeOut(prog(t, a[0], b[0]))
        x = lerp(a[1], b[1], p)
        y = lerp(a[2], b[2], p)
      }
    }
    let pressed = false
    for (const tap of taps) {
      if (during(t, tap, 0.07)) ring(x, y, 7, 'yellow')
      else if (during(t, tap + 0.07, 0.07)) ring(x, y, 11, 'yellow')
      if (during(t, tap, 0.12)) pressed = true
    }
    spr(HAND, x - 4, y + (pressed ? 1 : 3), { X: 'ink', S: 'skin', D: 'skin2' })
  }

  // ------------------------------------------------------------------
  // Shared furniture
  // ------------------------------------------------------------------
  function subtitle(str) {
    if (!str) return
    const lines = wrap(str, 216, 'h')
    const h = lines.length * 14 + 10
    const y = SAFE.bottom - 1 - h
    box(SAFE.left, y, SAFE.right - SAFE.left, h, 'ink', 'yellow')
    lines.forEach((l, i) => text(l, CX, y + 8 + i * 14, { f: 'h', c: 'white', a: 'c' }))
  }

  /** Backdrop behind the phone scenes. */
  function backdrop() {
    R(0, 0, W, H, 'navy')
    dither(0, 0, W, 24, 'deep', 4)
    dither(0, 24, W, 12, 'deep', 3)
    for (let x = 8; x < W; x += 18) dither(x, 36, 1, 350, 'blue', 3)
    R(0, 392, W, H - 392, 'deep')
    // hazard tape, decoration only (below the safe band)
    R(0, 392, W, 10, 'yellow')
    for (let x = -10; x < W; x += 12) poly([[x, 402], [x + 6, 402], [x + 12, 392], [x + 6, 392]], 'ink')
    R(0, 391, W, 1, 'ink')
    R(0, 402, W, 1, 'ink')
  }

  const PHONE = { x: 24, y: 64, w: 202, h: 270 }

  /** Phone body; returns the screen rectangle. */
  function phone(o) {
    o = o || {}
    const x = PHONE.x
    const y = (o.y !== undefined ? o.y : PHONE.y) + (o.dy || 0)
    const h = o.h || PHONE.h
    box(x, y, PHONE.w, h, 'g3', 'ink')
    R(x + 2, y + 1, PHONE.w - 4, 1, 'g2')
    R(x + 86, y + 4, 30, 2, 'ink')
    const scr = { x: x + 5, y: y + 10, w: PHONE.w - 10, h: h - 18 }
    R(scr.x - 1, scr.y - 1, scr.w + 2, scr.h + 2, 'ink')
    R(scr.x, scr.y, scr.w, scr.h, o.bg || 'white')
    return scr
  }

  function signalBars(x, y, c, crossed) {
    for (let i = 0; i < 4; i++) R(x + i * 3, y + 6 - i * 2, 2, 2 + i * 2, c)
    if (crossed) {
      line(x - 1, y, x + 11, y + 8, 'red')
      line(x + 11, y, x - 1, y + 8, 'red')
    }
  }

  function header(scr, title, noSignal) {
    R(scr.x, scr.y, scr.w, 18, 'navy')
    text(title, scr.x + 6, scr.y + 3, { c: 'white' })
    signalBars(scr.x + scr.w - 30, scr.y + 5, noSignal ? 'g2' : 'white', noSignal)
    // battery
    frame(scr.x + scr.w - 16, scr.y + 6, 10, 7, 'white')
    R(scr.x + scr.w - 14, scr.y + 8, 5, 3, 'green')
  }

  function pill(x, y, w, h, str, fill, outline, tc, f) {
    f = f || 'u'
    box(x, y, w, h, fill, outline)
    text(str, x + Math.round(w / 2), y + capY(f, h), { f, c: tc, a: 'c' })
  }

  function bar(x, y, w, h, pct, c, track) {
    R(x, y, w, h, track || 'g1')
    R(x, y, Math.round((w * pct) / 100), h, c)
  }

  /** "Photo" of the site: drawn, not a photograph. */
  function sitePhoto(x, y, w, h, variant) {
    clip(x, y, w, h, () => {
      R(x, y, w, h, 'sky')
      R(x + 10, y + 7, 20, 3, 'white')
      R(x + 14, y + 5, 10, 2, 'white')
      R(x + w - 44, y + 11, 24, 3, 'white')
      const wy = y + Math.round(h * 0.5)
      R(x, wy, w, h, 'g1')
      for (let r = 0, yy = wy; yy < y + h; yy += 7, r++) {
        R(x, yy, w, 1, 'g2')
        for (let xx = x + (r % 2 ? 7 : 0); xx < x + w; xx += 14) R(xx, yy, 1, 7, 'g2')
      }
      if (variant === 'roof') {
        const top = y + 3
        const done = x + Math.round(w * 0.55)
        poly([[x, wy - 2], [done, wy - 2], [done + 12, top], [x, top]], 'amber')
        for (let xx = x + 6; xx < done; xx += 12) line(xx, wy - 2, xx + 12, top, 'brown')
        for (let xx = done + 10; xx < x + w + 20; xx += 16) line(xx, wy - 2, xx + 12, top, 'brown', 2)
        R(x, wy - 3, w, 3, 'brown')
      } else {
        // window openings: one fitted, one still empty
        const wx = x + Math.round(w * 0.16)
        const wx2 = x + Math.round(w * 0.6)
        const ww = Math.round(w * 0.22)
        R(wx, wy + 7, ww, h, 'white')
        R(wx + 2, wy + 9, ww - 4, h, 'sky')
        R(wx + Math.round(ww / 2) - 1, wy + 9, 2, h, 'white')
        R(wx2, wy + 7, ww, h, 'deep')
        R(x, wy - 3, w, 3, 'g2')
      }
      // scaffold pole
      R(x + w - 12, y + 4, 2, h, 'g3')
      R(x + w - 22, wy + 10, 22, 2, 'g3')
    })
  }

  // ------------------------------------------------------------------
  // Worker's report form (scenes 3 and 4)
  // ------------------------------------------------------------------
  function reportForm(scr, o) {
    const x = scr.x
    const y = scr.y
    header(scr, L.report.title)
    sitePhoto(x + 8, y + 24, 176, 66, o.variant)
    frame(x + 8, y + 24, 176, 66, 'navy')
    const lw = text(o.stage, x + 8, y + 99, { c: 'navy' })
    if (o.tag) pill(x + 14 + lw, y + 97, measure(o.tag) + 8, 15, o.tag, 'white', 'amber', 'navy')
    text(o.pct + '%', x + 184, y + 96, { f: 'h', m: 2, c: o.pctFlash ? 'amber' : 'navy', a: 'r' })
    frame(x + 8, y + 116, 176, 8, 'navy')
    R(x + 9, y + 117, Math.round((174 * o.pct) / 100), 6, 'amber')
    ;['+10', '+25', '+40'].forEach((b, i) => {
      const on = o.pressed === b
      box(x + 8 + i * 61, y + 132 + (on ? 1 : 0), 54, 22, on ? 'yellow' : 'white', on ? 'ink' : 'navy')
      text(b, x + 35 + i * 61, y + 139 + (on ? 1 : 0), { f: 'h', c: 'navy', a: 'c' })
    })
    const sp = o.sendPressed ? 1 : 0
    if (!sp) R(x + 9, y + 190, 174, 2, 'amber')
    box(x + 8, y + 164 + sp * 2, 176, 26, 'yellow', 'ink')
    text(upper(L.report.send), x + 96, y + 173 + sp * 2, { f: 'h', c: 'ink', a: 'c' })
    if (o.status) {
      const s = o.status
      const w = 176
      if (s.kind === 'sending') pill(x + 8, y + 200, w, 20, s.text, 'white', 'amber', 'navy')
      else if (s.kind === 'pending') pill(x + 8, y + 200, w, 20, s.text, 'white', 'g2', 'navy')
      else pill(x + 8, y + 200, w, 20, s.text, s.flash ? 'white' : 'green', 'ink', 'ink')
    }
  }

  // ------------------------------------------------------------------
  // 1. Hook, 0.0-2.5
  // ------------------------------------------------------------------
  const HANDSET = [
    '.XXXX.......',
    'XXXXXX......',
    'XXXXXX......',
    '.XXXX.......',
    '.XXX........',
    '.XXX........',
    '..XXX.......',
    '..XXXX......',
    '...XXXX.XXX.',
    '....XXXXXXXX',
    '.....XXXXXXX',
    '......XXXXX.',
  ]

  function truck(tx, ty, bob) {
    const by = ty + bob
    // bed
    R(tx, by - 54, 86, 28, 'g1')
    R(tx, by - 56, 86, 3, 'white')
    R(tx, by - 30, 86, 4, 'g2')
    R(tx + 6, by - 62, 30, 6, 'brown') // timber in the bed
    R(tx + 10, by - 66, 34, 4, 'amber')
    // cab
    poly([[tx + 88, by - 54], [tx + 96, by - 88], [tx + 140, by - 88], [tx + 152, by - 54]], 'g1')
    R(tx + 96, by - 89, 44, 2, 'white')
    R(tx + 84, by - 54, 70, 28, 'g1')
    // window with the owner inside
    poly([[tx + 99, by - 84], [tx + 137, by - 84], [tx + 146, by - 57], [tx + 94, by - 57]], 'deep')
    clip(tx + 94, by - 84, 52, 27, () => {
      R(tx + 101, by - 62, 26, 6, 'blue')
      head(tx + 104, by - 82, 'owner')
      R(tx + 124, by - 76, 4, 10, 'ink') // phone at the ear
      R(tx + 125, by - 75, 2, 8, 'sky')
      R(tx + 123, by - 68, 6, 4, 'skin')
      R(tx + 124, by - 64, 5, 8, 'blue')
    })
    // hood
    poly([[tx + 152, by - 54], [tx + 154, by - 60], [tx + 190, by - 58], [tx + 198, by - 50], [tx + 198, by - 54]], 'g1')
    R(tx + 152, by - 54, 46, 28, 'g1')
    R(tx + 152, by - 30, 46, 4, 'g2')
    R(tx + 194, by - 48, 4, 7, 'yellow')
    R(tx + 190, by - 30, 12, 5, 'g3')
    // stripe and door
    R(tx, by - 42, 198, 3, 'yellow')
    R(tx + 96, by - 56, 1, 28, 'g2')
    R(tx + 146, by - 56, 1, 28, 'g2')
    R(tx + 136, by - 48, 6, 2, 'g3')
    R(tx + 84, by - 54, 2, 28, 'g2')
    // wheels (do not bob)
    for (const wx of [tx + 36, tx + 164]) {
      disc(wx, by - 26, 17, 'g3')
      disc(wx, ty - 14, 14, 'ink')
      disc(wx, ty - 14, 6, 'g2')
      disc(wx, ty - 14, 2, 'g1')
    }
  }

  function sceneHook(t) {
    R(0, 0, W, H, 'deep')
    dither(0, 130, W, 30, 'navy', 2)
    dither(0, 160, W, 40, 'navy', 3)
    dither(0, 200, W, 30, 'navy', 4)
    R(0, 230, W, 80, 'navy')
    // skyline: a block going up, with a crane
    R(18, 258, 36, 50, 'blue')
    R(60, 246, 24, 62, 'blue')
    R(214, 240, 44, 68, 'blue')
    for (let fy = 248; fy < 300; fy += 10) R(214, fy, 44, 1, 'navy')
    R(240, 196, 2, 44, 'blue')
    R(212, 196, 52, 2, 'blue')
    R(220, 198, 1, 14, 'blue')
    for (const p of [[24, 266], [40, 280], [66, 256], [74, 272], [30, 290]]) R(p[0], p[1], 2, 3, 'yellow')
    // ground and road
    R(0, 308, W, H - 308, 'g3')
    R(0, 308, W, 2, 'g2')
    for (let x = 6; x < W; x += 22) R(x, 330, 10, 2, 'g2')
    dither(0, 400, W, 80, 'ink', 3)

    truck(14, 324, blink(t, 8, 4) ? 0 : 1)

    // "How's it going?" x3
    const bw = measure(L.hook.bubble) + 12
    const spots = [[112, 190], [16, 158], [72, 124]]
    E.bubbles.forEach((at, i) => {
      if (t < at) return
      const x = Math.min(spots[i][0], SAFE.right - bw)
      const y = spots[i][1] + (blink(t + i * 0.2, 16, 8) ? 0 : 1)
      if (i > 0 && t < at + 0.07) return box(x + 20, y + 5, bw - 40, 9, 'white', 'ink')
      const tailX = i === 1 ? x + bw - 22 : x + 16
      R(tailX - 1, y + 18, 9, 2, 'ink')
      R(tailX, y + 20, 7, 2, 'ink')
      R(tailX + 2, y + 22, 4, 2, 'ink')
      box(x, y, bw, 19, 'white', 'ink')
      R(tailX, y + 17, 7, 3, 'white')
      R(tailX + 1, y + 20, 5, 1, 'white')
      R(tailX + 3, y + 21, 2, 2, 'white')
      text(L.hook.bubble, x + 6, y + 4, { c: 'navy' })
    })

    // call counter 1 -> 7
    let n = 1
    let last = -1
    for (const c of E.calls) if (t >= c) (n++, (last = c))
    const hit = last >= 0 && t < last + 0.1
    text(L.hook.calls, 16, 46, { c: 'sky' })
    spr(HANDSET, 16, 68 - (hit ? 2 : 0), { X: 'white' })
    if (blink(t, 6, 3)) {
      R(31, 66, 2, 2, 'yellow')
      R(34, 62, 2, 2, 'yellow')
    }
    text(String(n), 44, 62 - (hit ? 2 : 0), { f: 'h', m: 4, c: hit ? 'white' : 'yellow' })
  }

  // ------------------------------------------------------------------
  // 2. Problem, 2.5-5.0
  // ------------------------------------------------------------------
  function sceneProblem(t) {
    const u = t - S.problem[0]
    R(0, 0, W, H, 'deep')
    dither(0, 96, W, 40, 'navy', 2)
    dither(0, 136, W, 40, 'navy', 3)
    dither(0, 176, W, 30, 'navy', 4)
    R(0, 206, W, 100, 'navy')
    poly([[0, 270], [50, 244], [110, 258], [190, 238], [270, 260], [270, 300], [0, 300]], 'blue')
    R(0, 288, W, H - 288, 'g3')
    R(0, 288, W, 1, 'g2')
    // road running away to the site
    poly([[70, 480], [200, 480], [128, 290], [122, 290]], 'g2')
    for (let i = 0; i < 6; i++) {
      const y = 300 + i * i * 6
      R(124 + Math.round(i * 0.4), y, 2 + Math.round(i / 2), 4 + i * 2, 'g1')
    }
    dither(0, 400, W, 80, 'ink', 3)

    // the site, far away: a frame going up, a crane, people too small to read
    R(74, 280, 100, 8, 'g2')
    for (let i = 0; i < 7; i++) R(78 + i * 15, 238, 2, 42, 'g1')
    R(74, 235, 100, 3, 'g1')
    R(74, 258, 100, 1, 'g1')
    line(74, 235, 123, 206, 'g1', 2)
    line(172, 235, 123, 206, 'g1', 2)
    line(98, 235, 123, 220, 'g1')
    line(148, 235, 123, 220, 'g1')
    // crane
    R(198, 178, 3, 110, 'g2')
    R(168, 178, 62, 3, 'g2')
    line(199, 164, 228, 178, 'g2')
    line(199, 164, 170, 178, 'g2')
    R(199, 164, 1, 14, 'g2')
    const hx = 178 + Math.round(4 * Math.sin(u * 2.4))
    R(hx, 181, 1, 26, 'g1')
    R(hx - 2, 207, 5, 4, 'yellow')
    // fence
    for (let x = 52; x <= 216; x += 8) R(x, 281, 1, 7, 'g2')
    R(52, 283, 165, 1, 'g2')
    // tiny workers
    ;[[66, 1.0], [150, 1.7], [112, 0.6]].forEach((w, i) => {
      const ph = u * w[1] + i * 1.3
      const x = w[0] + Math.round(9 * Math.sin(ph))
      const stepA = Math.floor(ph * 3) % 2 === 0
      R(x, 277, 4, 2, 'yellow')
      R(x, 279, 4, 2, 'skin')
      R(x, 281, 4, 4, 'amber')
      R(x + (stepA ? 0 : 1), 285, 1, 3, 'ink')
      R(x + 3, 285, 1, stepA ? 3 : 2, 'ink')
    })
    // haze closing over the site: too far to see what is going on
    const lvl = u < 0.4 ? 0 : u < 0.9 ? 1 : u < 1.4 ? 2 : 3
    dither(40, 160, 196, 128, 'navy', lvl)

    const bob = Math.round(2 * Math.sin(u * 3.2))
    text('?', CX + 3, 78 + bob + 3, { f: 'h', m: 8, c: 'ink', a: 'c' })
    text('?', CX, 78 + bob, { f: 'h', m: 8, c: 'yellow', a: 'c' })
    if (blink(t, 20, 10)) text('?', 50, 150, { f: 'h', m: 2, c: 'white' })
    else text('?', 190, 132, { f: 'h', m: 2, c: 'white' })
  }

  // ------------------------------------------------------------------
  // 3. Worker reports, 5.0-9.5
  // ------------------------------------------------------------------
  function sceneReport(t) {
    const u = t - S.report[0]
    backdrop()
    roleChip('worker')
    const dy = lerp(36, 0, easeOut(prog(u, 0, 0.25)))
    if (t < E.form) {
      // camera
      const scr = phone({ dy, bg: 'ink' })
      const shot = t >= E.shutter
      sitePhoto(scr.x, scr.y + 18, scr.w, 186, 'roof')
      text(L.report.camera, scr.x + 6, scr.y + 3, { c: 'white' })
      // viewfinder corners
      const vx = scr.x + 10
      const vy = scr.y + 28
      const vw = scr.w - 20
      const vh = 166
      for (const [cx, cy, sx, sy] of [[vx, vy, 1, 1], [vx + vw, vy, -1, 1], [vx, vy + vh, 1, -1], [vx + vw, vy + vh, -1, -1]]) {
        R(sx > 0 ? cx : cx - 12, sy > 0 ? cy : cy - 2, 12, 2, 'white')
        R(sx > 0 ? cx : cx - 2, sy > 0 ? cy : cy - 12, 2, 12, 'white')
      }
      const bx = scr.x + 96
      const byy = scr.y + 228
      disc(bx, byy, 17, 'g1')
      disc(bx, byy, 15, 'ink')
      disc(bx, byy, during(t, E.shutter, 0.12) ? 11 : 13, 'white')
      if (shot) {
        const a = t - E.shutter
        if (a < 0.07) {
          R(scr.x, scr.y, scr.w, scr.h, 'white')
          dither(0, 0, W, H, 'white', 2)
        } else if (a < 0.14) dither(scr.x, scr.y, scr.w, scr.h, 'white', 4)
        else if (a < 0.2) dither(scr.x, scr.y, scr.w, scr.h, 'white', 2)
        else frame(scr.x + 4, scr.y + 22, scr.w - 8, 178, 'white')
      }
    } else {
      const scr = phone({ dy })
      let status = null
      if (t >= E.sent) status = { kind: 'sent', text: L.report.sent, flash: t < E.sent + 0.07 }
      else if (t >= E.send + 0.1) {
        const dots = Math.floor((t - E.send) * 6) % 3
        status = { kind: 'sending', text: L.report.sending.replace('…', '') + '.'.repeat(dots + 1) + ' '.repeat(2 - dots) }
      }
      reportForm(scr, {
        variant: 'roof',
        stage: L.report.stage,
        pct: t >= E.plus10 ? 70 : 60,
        pctFlash: during(t, E.plus10, 0.14),
        pressed: during(t, E.plus10, 0.14) ? '+10' : null,
        sendPressed: during(t, E.send, 0.14),
        status,
      })
      if (during(t, E.sent, 0.3)) sparkle(scr.x + 96, scr.y + 210, t - E.sent)
    }
    finger(
      t,
      [[5.05, 196, 352], [5.55, 125, 300], [6.4, 125, 300], [6.85, 64, 217], [7.25, 64, 217], [7.65, 125, 251], [8.0, 125, 251], [8.4, 204, 352], [8.45, 204, 352]],
      [E.shutter, E.plus10, E.send],
    )
  }

  /** Short burst around a status that just turned green. */
  function sparkle(cx, cy, a) {
    const r = 6 + Math.round(a * 90)
    for (const [dx, dy] of [[-1, -0.35], [1, -0.35], [-0.8, 0.4], [0.8, 0.4], [0, -0.6], [0, 0.6]]) {
      const x = cx + Math.round(dx * (60 + r))
      const y = cy + Math.round(dy * r * 1.6)
      R(x, y - 1, 1, 3, 'yellow')
      R(x - 1, y, 3, 1, 'yellow')
    }
  }

  // ------------------------------------------------------------------
  // 4. Big jump, 9.5-13.5
  // ------------------------------------------------------------------
  function sceneJump(t) {
    backdrop()
    const cover = t >= E.wipe + 0.2
    if (!cover) {
      roleChip('worker')
      const scr = phone()
      const jumped = t >= E.plus40
      reportForm(scr, {
        variant: 'windows',
        stage: L.jump.stage,
        pct: jumped ? 80 : 40,
        pctFlash: during(t, E.plus40, 0.14),
        tag: jumped ? L.jump.tag : null,
        pressed: during(t, E.plus40, 0.14) ? '+40' : null,
        sendPressed: during(t, E.sendJump, 0.14),
        status: t >= E.pending ? { kind: 'pending', text: L.jump.pending } : null,
      })
      finger(t, [[9.5, 204, 352], [9.95, 186, 217], [10.3, 186, 217], [10.55, 125, 251], [10.8, 125, 251], [11.15, 204, 352]], [E.plus40, E.sendJump])
    } else {
      roleChip('foreman')
      const scr = phone()
      const x = scr.x
      const y = scr.y
      const done = t >= E.verified
      header(scr, L.jump.review)
      sitePhoto(x + 8, y + 24, 176, 80, 'windows')
      frame(x + 8, y + 24, 176, 80, 'navy')
      text(L.jump.stage, x + 8, y + 112, { c: 'navy' })
      text('40 → 80%', x + 184, y + 114, { f: 'h', c: 'navy', a: 'r' })
      pill(x + 8, y + 128, measure(L.jump.tag) + 10, 15, L.jump.tag, 'white', 'amber', 'navy')
      if (done) pill(x + 8, y + 150, 176, 20, L.jump.verified, t < E.verified + 0.07 ? 'white' : 'green', 'ink', 'ink')
      else pill(x + 8, y + 150, 176, 20, L.jump.pending, 'white', 'g2', 'navy')
      const pr = during(t, E.confirm, 0.14) ? 1 : 0
      if (!pr && !done) R(x + 9, y + 208, 174, 2, 'g3')
      box(x + 8, y + 180 + pr * 2, 176, 28, done ? 'g1' : 'green', 'ink')
      text(upper(L.jump.confirm), x + 96, y + 190 + pr * 2, { f: 'h', c: done ? 'g3' : 'ink', a: 'c' })
      if (during(t, E.verified, 0.3)) sparkle(x + 96, y + 160, t - E.verified)
      finger(t, [[11.6, 204, 352], [12.2, 125, y + 196], [12.6, 125, y + 196], [13.0, 204, 352]], [E.confirm])
    }
    // wipe between the two phones: bars close, then open
    const w = t - E.wipe
    if (w >= 0 && w < 0.4) {
      const p = w < 0.2 ? w / 0.2 : 1 - (w - 0.2) / 0.2
      for (let i = 0; i < 9; i++) {
        const bwid = Math.round(30 * p)
        R(i * 30, 0, bwid, H, 'deep')
        if (bwid > 2 && bwid < 30) R(i * 30 + bwid - 2, 0, 2, H, 'yellow')
      }
    }
  }

  // ------------------------------------------------------------------
  // 5. Owner's list, 13.5-18.0
  // ------------------------------------------------------------------
  function sceneOwner(t) {
    backdrop()
    roleChip('owner')
    const scr = phone()
    header(scr, L.owner.title)
    const cards = [
      { icon: '●', c: 'green', city: L.owner.c1, status: L.owner.s1, pct: 53 },
      { icon: '▲', c: 'amber', city: L.owner.c2, status: L.owner.s2, pct: 45 },
      { icon: '■', c: 'red', city: L.owner.c3, status: L.owner.s3, pct: 33, urgent: L.owner.urgent },
    ]
    clip(scr.x, scr.y + 18, scr.w, scr.h - 18, () => {
      cards.forEach((c, i) => {
        if (t < E.cards[i]) return
        const x = scr.x + 6 + lerp(60, 0, easeOut(prog(t, E.cards[i], E.cards[i] + 0.2)))
        const y = scr.y + 24 + i * 73
        box(x, y, 180, 68, 'white', 'g1')
        R(x + 1, y + 1, 3, 66, c.c)
        text(c.icon, x + 9, y + 7, { f: 'h', c: c.c })
        text(c.city, x + 21, y + 7, { f: 'h', c: 'navy' })
        text(c.pct + '%', x + 174, y + 6, { f: 'h', m: 2, c: 'navy', a: 'r' })
        text(c.status, x + 9, y + 21, { c: 'navy' })
        if (c.urgent) pill(x + 9, y + 36, measure(c.urgent) + 10, 15, c.urgent, 'red', 'ink', 'ink')
        bar(x + 9, y + 56, 162, 6, c.pct, c.c)
      })
    })
    if (t < E.zoom) return

    // push-in on the red card: it lifts out of the list and fills the frame
    const p = easeOut(prog(t, E.zoom, E.zoom + 0.2))
    dither(0, 0, W, H, 'deep', p < 1 ? 3 : 4)
    const x = lerp(scr.x + 6, 12, p)
    const y = lerp(scr.y + 170, 150, p)
    const w = lerp(180, 224, p)
    const h = lerp(68, 132, p)
    const c = cards[2]
    const on = blink(t - E.zoom, 12, 6)
    R(x - 3, y - 3, w + 6, h + 6, on ? 'red' : 'ink')
    R(x - 1, y - 1, w + 2, h + 2, 'ink')
    R(x, y, w, h, 'white')
    if (p < 1) return
    text('■', x + 12, y + 12, { f: 'h', m: 2, c: 'red' })
    text(c.city, x + 34, y + 12, { f: 'h', m: 2, c: 'navy' })
    text('33%', x + w - 12, y + 8, { f: 'h', m: 3, c: 'navy', a: 'r' })
    text(c.status, x + 12, y + 46, { f: 'h', c: 'navy' })
    const uw = measure(c.urgent, 'h') + 20
    box(x + 12, y + 64, uw, 24, on ? 'red' : 'white', on ? 'ink' : 'red')
    text(c.urgent, x + 12 + Math.round(uw / 2), y + 64 + capY('h', 24), { f: 'h', c: 'ink', a: 'c' })
    frame(x + 12, y + 104, w - 24, 12, 'navy')
    R(x + 14, y + 106, Math.round(((w - 28) * 33) / 100), 8, 'red')
  }

  // ------------------------------------------------------------------
  // 6. Object overview, 18.0-22.5
  // ------------------------------------------------------------------
  function dashRect(x, y, w, h, c) {
    for (let i = 0; i < w; i++)
      if (i % 4 < 2) {
        R(x + i, y, 1, 1, c)
        R(x + i, y + h - 1, 1, 1, c)
      }
    for (let j = 0; j < h; j++)
      if (j % 4 < 2) {
        R(x, y + j, 1, 1, c)
        R(x + w - 1, y + j, 1, 1, c)
      }
  }

  function sceneOverview(t) {
    R(0, 0, W, H, 'deep')
    for (let x = 6; x < W; x += 18) R(x, 0, 1, H, 'navy')
    for (let y = 8; y < H; y += 18) R(0, y, W, 1, 'navy')

    // accepted % climbs as stages are accepted; 51 is the prototype's figure
    const targets = [0, 20, 38, 45, 51]
    let val = 0
    E.stages.forEach((at, i) => {
      if (t >= at) val = lerp(targets[i], targets[i + 1], prog(t, at, at + 0.3))
    })
    const shown = t >= E.pendingShown
    text(upper(L.overview.accepted), 16, 44, { c: 'g1' })
    text(val + '%', 16, 60, { f: 'h', m: 3, c: 'green' })
    if (shown) {
      text('55%', 112, 46, { f: 'h', m: 2, c: t < E.pendingShown + 0.1 ? 'white' : 'sky' })
      para(L.overview.withPending, 112, 66, 124, { c: 'g1' })
    }
    frame(16, 96, 216, 8, 'g1')
    R(17, 97, Math.round((214 * val) / 100), 6, 'green')
    if (shown) {
      const a = 17 + Math.round((214 * 51) / 100)
      const b = 17 + Math.round((214 * 55) / 100)
      R(a, 97, b - a, 6, 'amber')
      hatch(a, 97, b - a, 6, 'ink')
    }

    // the house: dashed = not started, then stages drop in with their colour
    const part = (i) => {
      const at = E.stages[i]
      if (t < at) return null
      return { dy: lerp(-12, 0, easeOut(prog(t, at, at + 0.15))), flash: t < at + 0.07 }
    }
    R(28, 278, 192, 2, 'g2')
    dashRect(60, 266, 128, 12, 'sky')
    dashRect(70, 206, 108, 60, 'sky')
    for (let i = 0; i < 68; i++)
      if (i % 4 < 2) {
        R(58 + i, 206 - Math.round((i * 54) / 66), 1, 1, 'sky')
        R(190 - i, 206 - Math.round((i * 54) / 66), 1, 1, 'sky')
      }
    let p = part(0) // foundation: accepted
    if (p) {
      R(60, 266 + p.dy, 128, 12, p.flash ? 'white' : 'green')
      frame(60, 266 + p.dy, 128, 12, 'ink')
      if (!p.flash) R(62, 272 + p.dy, 124, 1, 'deep')
    }
    p = part(1) // frame: accepted
    if (p) {
      R(70, 206 + p.dy, 108, 60, p.flash ? 'white' : 'green')
      frame(70, 206 + p.dy, 108, 60, 'ink')
      if (!p.flash) for (let x = 82; x < 176; x += 12) R(x, 207 + p.dy, 1, 58, 'deep')
    }
    p = part(2) // roof: in work, part of it waiting for a check
    if (p) {
      const top = 152 + p.dy
      const base = 206 + p.dy
      poly([[56, base], [124, top - 2], [192, base]], 'ink')
      poly([[60, base - 1], [124, top + 1], [188, base - 1]], p.flash ? 'white' : 'amber')
      if (!p.flash && shown) {
        // the part of the roof still waiting for the foreman: hatched
        for (let yy = top + 2; yy < base - 1; yy++) {
          const edge = 124 + Math.round(((yy - top) * 64) / 54) - 1
          if (edge > 152) hatch(152, yy, edge - 152, 1, 'ink', true)
        }
      }
      R(56, base - 1, 136, 2, 'ink')
    }
    p = part(3) // windows: one in work, one with no reports; door not started
    if (p) {
      for (const [wx, c] of [[84, 'amber'], [142, 'red']]) {
        R(wx, 220 + p.dy, 22, 22, p.flash ? 'white' : c)
        frame(wx, 220 + p.dy, 22, 22, 'ink')
        R(wx + 10, 220 + p.dy, 2, 22, 'ink')
        R(wx, 230 + p.dy, 22, 2, 'ink')
      }
    }
    if (t >= E.stages[1] + 0.15) {
      R(115, 229, 18, 36, 'deep')
      dashRect(114, 228, 20, 38, 'sky')
    }

    // legend
    const items = [
      ['green', L.overview.lAccepted, 16, 290],
      ['amber', L.overview.lWork, 128, 290],
      [null, L.overview.lTodo, 16, 306],
      ['red', L.overview.lNone, 128, 306],
    ]
    for (const [c, label, x, y] of items) {
      if (c) {
        R(x, y + 2, 7, 7, c)
        frame(x, y + 2, 7, 7, 'ink')
      } else dashRect(x, y + 2, 7, 7, 'sky')
      text(label, x + 11, y, { c: 'white' })
    }
  }
  
  // ------------------------------------------------------------------
  // 7. No signal, 22.5-24.5
  // ------------------------------------------------------------------
  function sceneOffline(t) {
    // basement: concrete blocks, a pipe, one lamp
    R(0, 0, W, H, 'g3')
    for (let r = 0, y = 0; y < H; y += 14, r++) {
      R(0, y, W, 1, 'ink')
      for (let x = r % 2 ? 14 : 0; x < W; x += 28) R(x, y, 1, 14, 'ink')
      for (let x = r % 2 ? 15 : 1; x < W; x += 28) R(x, y + 1, 26, 1, 'g2')
    }
    dither(0, 0, W, 60, 'ink', 3)
    dither(0, 380, W, 100, 'ink', 4)
    R(0, 70, W, 6, 'g2')
    R(0, 70, W, 1, 'g1')
    for (const x of [40, 130, 220]) R(x, 68, 5, 10, 'g1')
    R(207, 76, 1, 14, 'ink')
    dither(186, 82, 44, 40, 'yellow', blink(t, 14, 12) ? 2 : 1)
    R(203, 90, 9, 4, 'g1')
    R(204, 94, 7, 7, 'yellow')
    roleChip('worker')

    // worker under the lamp, looking at the phone
    R(140, 127, 36, 29, 'amber')
    R(138, 131, 4, 25, 'amber')
    R(174, 131, 4, 25, 'amber')
    R(147, 127, 3, 29, 'yellow')
    R(166, 127, 3, 29, 'yellow')
    R(154, 127, 8, 4, 'skin2')
    head(148, 106, 'worker')
    // no signal
    for (let i = 0; i < 4; i++) R(30 + i * 9, 132 - i * 7, 6, 8 + i * 7, 'g2')
    if (blink(t, 10, 6)) {
      line(26, 104, 66, 140, 'red', 3)
      line(64, 104, 24, 140, 'red', 3)
    }

    const scr = phone({ y: 156, h: 178 })
    const x = scr.x
    const y = scr.y
    header(scr, L.offline.title, true)
    sitePhoto(x + 8, y + 24, 60, 40, 'roof')
    frame(x + 8, y + 24, 60, 40, 'navy')
    text(L.report.stage, x + 76, y + 26, { c: 'navy' })
    text('70%', x + 76, y + 44, { f: 'h', m: 2, c: 'navy' })
    if (t < E.offline) {
      const dots = Math.floor((t - S.offline[0]) * 8) % 3
      pill(x + 8, y + 84, 176, 20, L.report.sending.replace('…', '') + '.'.repeat(dots + 1) + ' '.repeat(2 - dots), 'white', 'amber', 'navy')
    } else {
      const lines = wrap(L.offline.saved, 164, 'u')
      const h = lines.length * 13 + 30
      const py = y + 72 + lerp(8, 0, easeOut(prog(t, E.offline, E.offline + 0.12)))
      box(x + 6, py, 180, h, 'yellow', 'ink')
      // "kept on the phone" mark: a phone outline with a tick
      box(x + 90, py + 5, 12, 16, 'ink')
      R(x + 92, py + 7, 8, 10, 'yellow')
      line(x + 93, py + 12, x + 95, py + 14, 'ink')
      line(x + 95, py + 14, x + 98, py + 9, 'ink')
      lines.forEach((l, i) => text(l, x + 96, py + 23 + i * 13, { c: 'ink', a: 'c' }))
    }
  }

  // ------------------------------------------------------------------
  // 8. Client, 24.5-27.0
  // ------------------------------------------------------------------
  function sceneClient(t) {
    backdrop()
    roleChip('client')
    const scr = phone()
    const x = scr.x
    const y = scr.y
    header(scr, L.client.title)
    const rows = [[L.client.st1, 100], [L.client.st2, 90], [L.client.st3, 60], [L.client.st4, 40]]
    clip(scr.x, scr.y + 18, scr.w, scr.h - 18, () => {
      rows.forEach((r, i) => {
        if (t < E.rows[i]) return
        const rx = x + 6 + lerp(50, 0, easeOut(prog(t, E.rows[i], E.rows[i] + 0.15)))
        const ry = y + 24 + i * 38
        box(rx, ry, 180, 34, 'white', 'g1')
        box(rx + 7, ry + 8, 18, 18, t < E.rows[i] + 0.22 ? 'white' : 'green', 'ink')
        text('✓', rx + 13, ry + 14, { f: 'h', c: 'ink' })
        text(r[0], rx + 32, ry + 4, { c: 'navy' })
        bar(rx + 32, ry + 22, 104, 5, r[1], 'green')
        text(r[1] + '%', rx + 174, ry + 13, { f: 'h', c: 'navy', a: 'r' })
      })
    })
    if (t >= E.note) {
      const lines = wrap(L.client.note, 164, 'u')
      const h = lines.length * 13 + 10
      const ny = y + 180
      box(x + 6, ny, 180, h, t < E.note + 0.07 ? 'white' : 'navy', 'ink')
      lines.forEach((l, i) => text(l, x + 96, ny + 5 + i * 13, { c: 'white', a: 'c' }))
    }
  }

  // ------------------------------------------------------------------
  // 9. Final card, 27.0-30.0 (static from 29.0)
  // ------------------------------------------------------------------
  function logo(x, y) {
    // house with a tick
    poly([[x - 2, y + 26], [x + 28, y - 4], [x + 58, y + 26]], 'ink')
    poly([[x + 2, y + 24], [x + 28, y], [x + 54, y + 24]], 'yellow')
    R(x + 6, y + 24, 44, 30, 'ink')
    R(x + 8, y + 24, 40, 28, 'white')
    R(x + 40, y + 4, 6, 12, 'ink')
    R(x + 41, y + 5, 4, 10, 'yellow')
    for (let i = 0; i < 4; i++) {
      line(x + 15, y + 37 + i, x + 23, y + 45 + i, 'green')
      line(x + 23, y + 45 + i, x + 41, y + 27 + i, 'green')
    }
  }

  function sceneFinal(t) {
    R(0, 0, W, H, 'deep')
    for (let x = 6; x < W; x += 18) R(x, 0, 1, H, 'navy')
    for (let y = 8; y < H; y += 18) R(0, y, W, 1, 'navy')
    R(0, 392, W, 10, 'yellow')
    for (let x = -10; x < W; x += 12) poly([[x, 402], [x + 6, 402], [x + 12, 392], [x + 6, 392]], 'ink')

    const drop = prog(t, E.logo, E.logo + 0.3)
    const ly = 62 + (drop < 1 ? lerp(-70, 0, easeOut(drop)) : during(t, E.logo + 0.3, 0.07) ? 2 : 0)
    logo(CX - 28, ly)
    if (t >= E.logo + 0.3) {
      const nx = CX - 80
      text('Build', nx, 130, { f: 'h', m: 2, c: 'white' })
      text('Proof', nx + 80, 130, { f: 'h', m: 2, c: 'yellow' })
      R(nx, 150, 160, 2, 'yellow')
    }
    const rows = [
      [L.final.trial, 'h', 'yellow', 22],
      [L.final.price, 'h', 'white', 24],
      [L.final.workers, 'h', 'green', 26],
      [L.final.site, 'u', 'sky', 30],
    ]
    let y = 176
    rows.forEach((r, i) => {
      const at = E.lines[i]
      const o = { f: r[1], c: t < at + 0.07 ? 'white' : r[2], a: 'c' }
      const lines = wrap(r[0], 224, r[1])
      if (t >= at) lines.forEach((l, j) => text(l, CX, y + j * 13, o))
      y += r[3] + (lines.length - 1) * 13
    })
    if (t >= E.cta) {
      const label = upper(L.final.cta)
      const w = measure(label, 'h') + 32
      const pressed = during(t, E.ctaPress, 0.12)
      const bx = CX - Math.round(w / 2)
      const by = y + (pressed ? 3 : 0)
      if (!pressed) {
        R(bx + 1, by + 28, w - 2, 3, 'amber')
        R(bx, by + 26, w, 3, 'ink')
      }
      box(bx, by, w, 28, 'yellow', 'ink')
      text(label, CX, by + 10, { f: 'h', c: 'ink', a: 'c' })
      R(bx + 3, by + 2, w - 6, 1, 'white')
    }
  }

  // ------------------------------------------------------------------
  const DRAW = {
    hook: sceneHook,
    problem: sceneProblem,
    report: sceneReport,
    jump: sceneJump,
    owner: sceneOwner,
    overview: sceneOverview,
    offline: sceneOffline,
    client: sceneClient,
    final: sceneFinal,
  }

  function sceneAt(t) {
    for (const k in S) if (t >= S[k][0] && t < S[k][1]) return k
    return 'final'
  }

  function render(t, opts) {
    t = Math.max(0, Math.min(DURATION - 1 / 60, t))
    // snap to the frame grid so every motion advances in whole frames
    t = Math.floor(t * 30 + 0.0005) / 30
    const k = sceneAt(t)
    DRAW[k](t)
    subtitle(L.sub[k])
    if (opts && opts.safe) {
      frame(SAFE.left, SAFE.top, SAFE.right - SAFE.left, SAFE.bottom - SAFE.top, 'red')
    }
  }

  window.AD = {
    setLang(texts) {
      L = texts
    },
    render,
    sceneAt,
  }
})()

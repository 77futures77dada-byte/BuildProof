/*
 * Pixel engine: a 270x480 logical canvas shown at x4 (1080x1920).
 * Everything is drawn with whole-pixel rectangles in the 16 palette colours:
 * no alpha, no anti-aliasing, no gradients. Fades are dither patterns.
 */
;(function () {
  const W = 270
  const H = 480

  /** The whole palette. Nothing outside it is ever drawn. */
  const PAL = {
    navy: '#0b2a4a',
    deep: '#071d34',
    yellow: '#ffc72c',
    white: '#f4f7fb',
    green: '#2fb67e',
    amber: '#d9962b',
    red: '#ff6b6b',
    sky: '#7dd3fc',
    g1: '#9aa6b2', // concrete, light
    g2: '#5f6c7b', // concrete, mid
    g3: '#36414f', // concrete, dark
    skin: '#e0a878',
    skin2: '#b97a56',
    brown: '#7a4a2e',
    ink: '#03101f',
    blue: '#1d4b78',
  }

  /** TikTok safe band in logical px (160 / 380 / 120 px at 1080x1920). */
  const SAFE = { top: 40, bottom: H - 95, left: 8, right: W - 30 }

  const FONTS = {
    h: { family: 'AdHead', size: 8, base: 7, adv: 8, line: 12, capTop: 0 }, // Press Start 2P
    u: { family: 'AdUi', size: 11, base: 9, adv: 7, line: 13, capTop: 2 }, // Departure Mono
  }

  let g = null

  function init(canvas) {
    canvas.width = W
    canvas.height = H
    g = canvas.getContext('2d')
    g.imageSmoothingEnabled = false
  }

  const col = (c) => PAL[c] || c

  function R(x, y, w, h, c) {
    if (w <= 0 || h <= 0) return
    g.fillStyle = col(c)
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
  }

  /** 1 px outline. */
  function frame(x, y, w, h, c) {
    R(x, y, w, 1, c)
    R(x, y + h - 1, w, 1, c)
    R(x, y, 1, h, c)
    R(x + w - 1, y, 1, h, c)
  }

  /** Box with 1 px "rounded" corners, optional outline. */
  function box(x, y, w, h, fill, outline) {
    if (outline) {
      R(x + 1, y, w - 2, h, outline)
      R(x, y + 1, w, h - 2, outline)
      R(x + 1, y + 1, w - 2, h - 2, fill)
    } else {
      R(x + 1, y, w - 2, h, fill)
      R(x, y + 1, w, h - 2, fill)
    }
  }

  // ---- pattern fills (dither instead of transparency) ----
  const patterns = {}
  function pattern(kind, c) {
    const key = kind + c
    if (patterns[key]) return patterns[key]
    const t = document.createElement('canvas')
    t.width = 4
    t.height = 4
    const x = t.getContext('2d')
    x.fillStyle = col(c)
    for (let py = 0; py < 4; py++)
      for (let px = 0; px < 4; px++) {
        let on = false
        if (kind === 'd1') on = px % 2 === 0 && py % 2 === 0 && (px + py) % 4 === 0
        else if (kind === 'd2') on = px % 2 === 0 && py % 2 === 0
        else if (kind === 'd3') on = (px + py) % 2 === 0
        else if (kind === 'd4') on = !(px % 2 === 1 && py % 2 === 1)
        else if (kind === 'hatch') on = (px + py) % 4 === 0
        else if (kind === 'hatch2') on = (px + py) % 4 < 2
        if (on) x.fillRect(px, py, 1, 1)
      }
    return (patterns[key] = g.createPattern(t, 'repeat'))
  }

  /** level 1..4 = 12 / 25 / 50 / 75 % coverage. */
  function dither(x, y, w, h, c, level) {
    if (level <= 0 || w <= 0 || h <= 0) return
    if (level >= 5) return R(x, y, w, h, c)
    g.fillStyle = pattern('d' + level, c)
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
  }

  function hatch(x, y, w, h, c, bold) {
    if (w <= 0 || h <= 0) return
    g.fillStyle = pattern(bold ? 'hatch2' : 'hatch', c)
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
  }

  /** Scanline polygon fill: whole pixels only. pts = [[x,y],...] */
  function poly(pts, c) {
    let minY = Infinity
    let maxY = -Infinity
    for (const p of pts) {
      minY = Math.min(minY, p[1])
      maxY = Math.max(maxY, p[1])
    }
    g.fillStyle = col(c)
    for (let y = Math.floor(minY); y < Math.ceil(maxY); y++) {
      const sy = y + 0.5
      const xs = []
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]
        const b = pts[(i + 1) % pts.length]
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) {
          xs.push(a[0] + ((sy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]))
        }
      }
      xs.sort((p, q) => p - q)
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const x0 = Math.round(xs[i])
        const x1 = Math.round(xs[i + 1])
        if (x1 > x0) g.fillRect(x0, y, x1 - x0, 1)
      }
    }
  }

  function line(x0, y0, x1, y1, c, thick) {
    x0 = Math.round(x0)
    y0 = Math.round(y0)
    x1 = Math.round(x1)
    y1 = Math.round(y1)
    const t = thick || 1
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    g.fillStyle = col(c)
    for (;;) {
      g.fillRect(x0, y0, t, t)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x0 += sx
      }
      if (e2 <= dx) {
        err += dx
        y0 += sy
      }
    }
  }

  function disc(cx, cy, r, c) {
    g.fillStyle = col(c)
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.8))
      g.fillRect(cx - w, cy + dy, w * 2 + 1, 1)
    }
  }

  function ring(cx, cy, r, c) {
    g.fillStyle = col(c)
    let x = r
    let y = 0
    let err = 1 - r
    while (x >= y) {
      const pts = [
        [x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y],
      ]
      for (const p of pts) g.fillRect(cx + p[0], cy + p[1], 1, 1)
      y++
      if (err < 0) err += 2 * y + 1
      else {
        x--
        err += 2 * (y - x) + 1
      }
    }
  }

  /** Character-map sprite. rows = strings, map = char -> palette key. */
  function spr(rows, x, y, map, flip) {
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j]
      for (let i = 0; i < row.length; i++) {
        const c = map[row[i]]
        if (c) R(x + (flip ? row.length - 1 - i : i), y + j, 1, 1, c)
      }
    }
  }

  function clip(x, y, w, h, fn) {
    g.save()
    g.beginPath()
    g.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
    g.clip()
    fn()
    g.restore()
  }

  // ---- text ----
  // Glyphs are rasterised once at the font's native pixel size (or a whole
  // multiple of it), thresholded to 1-bit and cached, so type is as hard-edged
  // as the sprites.
  const ICONS = {
    '✓': ['.......', '......X', '.....XX', 'X...XX.', 'XX.XX..', '.XXX...', '..X....'],
    '●': ['..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..'],
    '▲': ['...X...', '...X...', '..XXX..', '..XXX..', '.XXXXX.', '.XXXXX.', 'XXXXXXX'],
    '■': ['XXXXXXX', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX'],
    '○': ['..XXX..', '.X...X.', 'X.....X', 'X.....X', 'X.....X', '.X...X.', '..XXX..'],
    '→': ['.......', '....X..', '.....X.', 'XXXXXXX', '.....X.', '....X..', '.......'],
  }
  const ICON_RE = /([✓●▲■○→])/
  const textCache = {}
  let measureCtx = null

  function fontCss(f, m) {
    return f.size * m + 'px "' + f.family + '"'
  }

  function segWidth(seg, f, m) {
    if (ICONS[seg]) return 8 * m
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')
    measureCtx.font = fontCss(f, m)
    return Math.round(measureCtx.measureText(seg).width)
  }

  function measure(str, font, mult) {
    const f = FONTS[font || 'u']
    const m = mult || 1
    let w = 0
    for (const seg of String(str).split(ICON_RE)) if (seg) w += segWidth(seg, f, m)
    return w
  }

  // Rasterise at SS x the target size and keep the centre sample of each
  // logical pixel: browsers hint and smooth small type, which fills in the
  // counters of dense Cyrillic glyphs if the text is drawn at 1:1.
  const SS = 4
  function bitmap(seg, f, m, c) {
    const key = f.family + m + c + seg
    if (textCache[key]) return textCache[key]
    const pad = 4 * m
    const w = segWidth(seg, f, m) + 2
    const h = f.size * m + pad * 2
    const big = document.createElement('canvas')
    big.width = w * SS
    big.height = h * SS
    const bx = big.getContext('2d', { willReadFrequently: true })
    bx.font = f.size * m * SS + 'px "' + f.family + '"'
    bx.textBaseline = 'alphabetic'
    bx.fillStyle = '#000'
    bx.fillText(seg, 0, (pad + f.base * m) * SS)
    const src = bx.getImageData(0, 0, w * SS, h * SS).data
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const x = cv.getContext('2d')
    const img = x.createImageData(w, h)
    const d = img.data
    const hex = col(c)
    const r = parseInt(hex.slice(1, 3), 16)
    const gg = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const half = SS >> 1
    for (let py = 0; py < h; py++)
      for (let px = 0; px < w; px++) {
        const on = src[((py * SS + half) * w * SS + px * SS + half) * 4 + 3] >= 128
        const i = (py * w + px) * 4
        d[i] = r
        d[i + 1] = gg
        d[i + 2] = b
        d[i + 3] = on ? 255 : 0
      }
    x.putImageData(img, 0, 0)
    return (textCache[key] = { cv, pad })
  }

  /**
   * Draw one line. o = { f: 'h' | 'u', m: multiple, c: colour, a: 'l' | 'c' | 'r' }.
   * (x, y) is the top-left of the line box; returns the drawn width.
   */
  function text(str, x, y, o) {
    o = o || {}
    const f = FONTS[o.f || 'u']
    const m = o.m || 1
    const c = o.c || 'white'
    str = String(str)
    const w = measure(str, o.f || 'u', m)
    let cx = Math.round(o.a === 'c' ? x - w / 2 : o.a === 'r' ? x - w : x)
    y = Math.round(y)
    for (const seg of str.split(ICON_RE)) {
      if (!seg) continue
      if (ICONS[seg]) {
        const rows = ICONS[seg]
        for (let j = 0; j < 7; j++)
          for (let i = 0; i < 7; i++)
            if (rows[j][i] === 'X') R(cx + i * m, y + (f.capTop + j) * m, m, m, c)
        cx += 8 * m
      } else {
        const b = bitmap(seg, f, m, c)
        g.drawImage(b.cv, cx, y - b.pad)
        cx += segWidth(seg, f, m)
      }
    }
    return w
  }

  /** Greedy word wrap, then balance two-line results. */
  function wrap(str, maxW, font, mult) {
    str = String(str)
    // a comma is the natural place to break, when both halves fit
    const comma = str.indexOf(', ')
    if (comma > 0 && measure(str, font, mult) > maxW) {
      const a = str.slice(0, comma + 1)
      const b = str.slice(comma + 2)
      if (measure(a, font, mult) <= maxW && measure(b, font, mult) <= maxW) return [a, b]
    }
    const words = str.split(' ')
    const lines = []
    let cur = ''
    for (const w of words) {
      const next = cur ? cur + ' ' + w : w
      if (cur && measure(next, font, mult) > maxW) {
        lines.push(cur)
        cur = w
      } else cur = next
    }
    if (cur) lines.push(cur)
    if (lines.length === 2) {
      // move words down while it makes the two lines more even
      for (;;) {
        const a = lines[0].split(' ')
        if (a.length < 2) break
        const moved = a.pop()
        const l0 = a.join(' ')
        const l1 = moved + ' ' + lines[1]
        const before = Math.max(measure(lines[0], font, mult), measure(lines[1], font, mult))
        const after = Math.max(measure(l0, font, mult), measure(l1, font, mult))
        if (after < before && measure(l1, font, mult) <= maxW) {
          lines[0] = l0
          lines[1] = l1
        } else break
      }
    }
    return lines
  }

  /** Wrapped block; returns its height. */
  function para(str, x, y, maxW, o) {
    o = o || {}
    const f = FONTS[o.f || 'u']
    const m = o.m || 1
    const lh = (o.lh || f.line) * m
    const lines = wrap(str, maxW, o.f || 'u', m)
    lines.forEach((l, i) => text(l, x, y + i * lh, o))
    return lines.length * lh
  }

  // ---- time helpers ----
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  /** 0..1 progress of t through [a, b]. */
  const prog = (t, a, b) => clamp((t - a) / (b - a), 0, 1)
  const easeOut = (p) => 1 - (1 - p) * (1 - p) * (1 - p)
  const lerp = (a, b, p) => Math.round(a + (b - a) * p)
  /** Frame-stepped blink: on for `on` frames out of every `period`. */
  const blink = (t, period, on) => Math.floor(t * 30 + 0.001) % period < on

  window.PX = {
    W, H, PAL, SAFE, FONTS, init,
    R, frame, box, dither, hatch, poly, line, disc, ring, spr, clip,
    text, measure, wrap, para,
    clamp, prog, easeOut, lerp, blink,
  }
})()

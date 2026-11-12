/*
 * Single source of timing for the ad: the picture (src/scenes.js) and the
 * sound (scripts/make-audio.mjs) both read it, so a tap and its click cannot
 * drift apart. All values are absolute seconds on the 30.0 s timeline.
 */
(function (root, factory) {
  const value = factory()
  if (typeof module === 'object' && module.exports) module.exports = value
  else root.AD_TIMELINE = value
})(typeof self !== 'undefined' ? self : this, function () {
  const DURATION = 30
  const FPS = 30
  const BPM = 120

  /** Scene windows, [start, end). Every boundary sits on a beat at 120 BPM. */
  const SCENES = {
    hook: [0, 2.5],
    problem: [2.5, 5],
    report: [5, 9.5],
    jump: [9.5, 13.5],
    owner: [13.5, 18],
    overview: [18, 22.5],
    offline: [22.5, 24.5],
    client: [24.5, 27],
    final: [27, 30],
  }

  const EVENTS = {
    // hook
    bubbles: [0, 0.6, 1.2],
    calls: [0.25, 0.55, 0.85, 1.15, 1.45, 1.75], // counter 1 -> 7
    // worker report
    shutter: 5.7,
    form: 6.0,
    plus10: 6.9,
    send: 7.7,
    sent: 8.5,
    // big jump
    plus40: 10.0,
    sendJump: 10.6,
    pending: 10.75,
    wipe: 11.2,
    confirm: 12.3,
    verified: 12.45,
    // owner list
    cards: [13.7, 14.0, 14.3],
    zoom: 15.6,
    alarm: [15.9, 16.4, 16.9],
    // object overview: foundation, frame, roof, windows
    stages: [18.3, 19.0, 19.7, 20.4],
    pendingShown: 21.0,
    // offline
    offline: 22.9,
    // client
    rows: [24.7, 24.95, 25.2, 25.45],
    note: 25.8,
    // final card
    logo: 27.0,
    lines: [27.5, 27.8, 28.1, 28.35],
    cta: 28.6,
    ctaPress: 28.8,
    hold: 29.0, // nothing moves after this
  }

  return { DURATION, FPS, BPM, SCENES, EVENTS }
})

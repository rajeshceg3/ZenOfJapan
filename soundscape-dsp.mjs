// Shared pure synthesis primitives from the finished Tangier soundscape.
// Wind/rustle are noise; bell is a sparse struck, decaying sound, never a pad.
export function makeRng(seed = 1) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

export function biquad(type, f0, q, fs) {
  const w0 = 2 * Math.PI * f0 / fs, cw = Math.cos(w0), sw = Math.sin(w0), alpha = sw / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lowpass') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; }
  else if (type === 'highpass') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; }
  else if (type === 'bandpass') { b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; }
  else {throw new Error('unknown biquad ' + type);}
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return x => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}

export function normalize(a, peak = 1) {
  let m = 0;
  for (let i = 0; i < a.length; i++) { const v = Math.abs(a[i]); if (v > m) {m = v;} }
  if (m > 0) { const g = peak / m; for (let i = 0; i < a.length; i++) {a[i] *= g;} }
  return a;
}

function normalizePair(l, r, peak) {
  let m = 0;
  for (let i = 0; i < l.length; i++) {
    const a = Math.abs(l[i]), b = Math.abs(r[i]);
    if (a > m) {m = a;} if (b > m) {m = b;}
  }
  if (m > 0) { const g = peak / m; for (let i = 0; i < l.length; i++) { l[i] *= g; r[i] *= g; } }
}

function foldLoop(long, n, x) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (i < x) { const w = i / x; out[i] = (1 - w) * long[n + i] + w * long[i]; }
    else {out[i] = long[i];}
  }
  return out;
}

export function renderRustleLoop(sampleRate, params = {}, rng = makeRng(7)) {
  const seconds = params.seconds ?? 14, crossfade = params.crossfade ?? 1;
  const n = Math.round(seconds * sampleRate), x = Math.round(crossfade * sampleRate), N = n + x;
  const ph1 = rng() * 6.2832, ph2 = rng() * 6.2832;
  const longL = new Float32Array(N), longR = new Float32Array(N);
  for (const long of [longL, longR]) {
    const hp = biquad('highpass', 2000, 0.7, sampleRate);
    const lp = biquad('lowpass', 5200, 0.7, sampleRate);
    for (let i = 0; i < N; i++) {
      const t = i / sampleRate;
      let gust = Math.sin(2 * Math.PI * 0.061 * t + ph1) + 0.6 * Math.sin(2 * Math.PI * 0.113 * t + ph2);
      gust = Math.pow(Math.max(0, gust / 1.6), 2.4);
      const flutter = 0.85 + 0.15 * Math.sin(2 * Math.PI * 11 * t + ph2 * 3);
      long[i] = lp(hp(rng() * 2 - 1)) * gust * flutter;
    }
  }
  const left = foldLoop(longL, n, x), right = foldLoop(longR, n, x);
  normalizePair(left, right, 0.5);
  return { left, right };
}

export function renderWindLoop(sampleRate, params = {}, rng = makeRng(11)) {
  const seconds = params.seconds ?? 20, crossfade = params.crossfade ?? 1.5;
  const base = params.baseCutoff ?? 500;
  const gustRate = params.gustRate ?? 0.07, gustDepth = params.gustDepth ?? 0.8;
  const sand = params.sand ?? 0;
  const n = Math.round(seconds * sampleRate), x = Math.round(crossfade * sampleRate), N = n + x;
  const ph1 = rng() * 6.2832, ph2 = rng() * 6.2832, ph3 = rng() * 6.2832;
  const longL = new Float32Array(N), longR = new Float32Array(N);
  for (const long of [longL, longR]) {
    const lp = biquad('lowpass', base, 0.7, sampleRate);
    const hp = biquad('highpass', 4000, 0.7, sampleRate);
    const sandLp = biquad('lowpass', 8000, 0.7, sampleRate);
    let brown = 0;
    for (let i = 0; i < N; i++) {
      const t = i / sampleRate;
      let gust = Math.sin(2 * Math.PI * gustRate * t + ph1) + 0.6 * Math.sin(2 * Math.PI * gustRate * 1.73 * t + ph2) + 0.35 * Math.sin(2 * Math.PI * gustRate * 3.1 * t + ph3);
      gust = Math.pow(Math.max(0, gust / 1.95), 1.8);
      const w = rng() * 2 - 1;
      brown = 0.992 * brown + 0.008 * w;
      const body = lp(brown * 30);
      long[i] = body * (1 - gustDepth + gustDepth * gust) + sandLp(hp(w)) * sand * gust;
    }
  }
  const left = foldLoop(longL, n, x), right = foldLoop(longR, n, x);
  let sum = 0;
  for (let i = 0; i < n; i++) {sum += left[i] * left[i] + right[i] * right[i];}
  const rms = Math.sqrt(sum / (2 * n)) || 1, g0 = 0.13 / rms;
  for (let i = 0; i < n; i++) {
    left[i] = Math.tanh(left[i] * g0 * 1.15) * 0.85;
    right[i] = Math.tanh(right[i] * g0 * 1.15) * 0.85;
  }
  return { left, right };
}

export function renderBell(sampleRate, rng, opts = {}) {
  const base = opts.base ?? 320;
  const sr = sampleRate, dur = 4.5, n = Math.round(dur * sr);
  const a = new Float32Array(n);
  const partials = [[1, 1], [2.01, 0.55], [2.74, 0.35], [3.76, 0.28], [5.4, 0.16]];
  const lpCut = opts.lowpass ?? 2600;
  const f0 = base * (0.97 + rng() * 0.06);
  for (const [ratio, amp] of partials) {
    let ph = rng() * 6.2832;
    const f = f0 * ratio, decay = 0.9 + ratio * 0.5;
    for (let i = 0; i < n; i++) {
      ph += 2 * Math.PI * f / sr;
      const t = i / sr;
      a[i] += Math.sin(ph) * amp * Math.exp(-decay * t);
    }
  }
  const lp = biquad('lowpass', lpCut, 0.7, sr);
  for (let i = 0; i < n; i++) {a[i] = lp(a[i]);}
  return normalize(a, 0.42);
}

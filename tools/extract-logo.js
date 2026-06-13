// One-off: extract the emerald gem from a flattened source (baked-in
// transparency checkerboard) into a clean alpha-channel PNG.
// Usage: node tools/extract-logo.js <src.png> <out.png>
const fs = require('fs');
const { PNG } = require('pngjs');

const [, , srcPath, outPath] = process.argv;
const png = PNG.sync.read(fs.readFileSync(srcPath));
const { width: W, height: H, data } = png;
const N = W * H;

// Gem pixels are green-dominant; background squares are gray (low G-R)
// or blue-dominant (teal). Tuned from sampled pixel values.
function isGem(i) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  return (g - r >= 22) && (g - b >= -6);
}

// Background = flood fill of non-gem pixels reachable from any border.
const removed = new Uint8Array(N);
const queue = [];
const pushIf = (x, y) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const p = y * W + x;
  if (removed[p]) return;
  if (isGem(p << 2)) return;
  removed[p] = 1;
  queue.push(p);
};
for (let x = 0; x < W; x++) { pushIf(x, 0); pushIf(x, H - 1); }
for (let y = 0; y < H; y++) { pushIf(0, y); pushIf(W - 1, y); }
for (let h = 0; h < queue.length; h++) {
  const p = queue[h], x = p % W, y = (p - x) / W;
  pushIf(x + 1, y); pushIf(x - 1, y); pushIf(x, y + 1); pushIf(x, y - 1);
}

// Keep mask = everything not flood-removed (gem + stray non-gem islands).
const keep = new Uint8Array(N);
for (let p = 0; p < N; p++) keep[p] = removed[p] ? 0 : 1;

// Keep only the largest connected component (the gem); drop stray shards
// of checkerboard that happened to read as green-dominant.
const label = new Int32Array(N).fill(-1);
let best = -1, bestSize = 0;
const comp = [];
for (let start = 0; start < N; start++) {
  if (!keep[start] || label[start] !== -1) continue;
  label[start] = start;
  comp.length = 0; comp.push(start);
  for (let h = 0; h < comp.length; h++) {
    const p = comp[h], x = p % W;
    const nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W];
    for (const q of nb) {
      if (q < 0 || q >= N) continue;
      if (keep[q] && label[q] === -1) { label[q] = start; comp.push(q); }
    }
  }
  if (comp.length > bestSize) { bestSize = comp.length; best = start; }
}
for (let p = 0; p < N; p++) if (label[p] !== best) keep[p] = 0;

// Erode 1px to drop the contaminated anti-aliased fringe.
const eroded = new Uint8Array(N);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (!keep[p]) continue;
    const edge = (x === 0 || y === 0 || x === W - 1 || y === H - 1) ||
      !keep[p - 1] || !keep[p + 1] || !keep[p - W] || !keep[p + W];
    eroded[p] = edge ? 0 : 1;
  }
}

let kept = 0;
for (let p = 0; p < N; p++) {
  const i = p << 2;
  if (eroded[p]) { data[i + 3] = 255; kept++; }
  else { data[i + 3] = 0; }
}

fs.writeFileSync(outPath, PNG.sync.write(png));
console.log(`extracted ${kept}/${N} pixels (${(100 * kept / N).toFixed(1)}%) -> ${outPath}`);

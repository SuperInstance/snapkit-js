# SnapKit JS — User Guide

Complete guide to the Eisenstein lattice snap toolkit for JavaScript/TypeScript.

## Table of Contents

1. [Eisenstein Lattice](#eisenstein-lattice)
2. [EisensteinInteger](#eisensteininteger)
3. [Voronoï Cell Snap](#voronoi-cell-snap)
4. [Temporal Snap](#temporal-snap)
5. [Spectral Analysis](#spectral-analysis)
6. [Common Patterns](#common-patterns)

---

## Eisenstein Lattice

The Eisenstein integers are numbers of the form `a + bω` where `a, b ∈ ℤ` and `ω = e^(2πi/3)`. In Cartesian:

```
x = a - b/2
y = b·√3/2
```

This forms the **A₂ root lattice** — the densest 2D packing (hexagonal grid). Benefits:
- **Optimal covering** — minimizes max distance to nearest lattice point
- **12-fold symmetry** — 6 rotations × 2 reflections
- **Isotropic error** — hexagonal Voronoï cells spread quantization evenly
- **PID property** — ℤ[ω] is a principal ideal domain → H¹ = 0

---

## EisensteinInteger

### Creation

```js
import { EisensteinInteger, eisensteinRound } from 'snapkit';

// Direct construction (returns frozen object)
const ei = EisensteinInteger(3, 1);  // { a: 3, b: 1 }

// Round a point to the nearest Eisenstein integer
const nearest = eisensteinRound(1.2, 0.7);
// { a: 1, b: 1 }
```

### Properties

```js
import { toComplex, normSquared, magnitude } from 'snapkit';

const ei = EisensteinInteger(3, 1);

const [x, y] = toComplex(ei);    // [-2.5, 0.866]
const n2 = normSquared(ei);      // 7  (a² - ab + b²)
const mag = magnitude(ei);       // 2.646...
```

### Arithmetic

```js
import { add, sub, mul, conjugate } from 'snapkit';

const a = EisensteinInteger(3, 1);
const b = EisensteinInteger(1, 2);

add(a, b);          // { a: 4, b: 3 }
sub(a, b);          // { a: 2, b: -1 }
mul(a, b);          // { a: 1, b: 7 }
conjugate(a);       // { a: 4, b: -1 }
```

### Snapping

```js
import { eisensteinSnap, eisensteinSnapBatch } from 'snapkit';

// Snap with tolerance check
const { nearest, distance, isSnap } = eisensteinSnap(0.3, 0.7, 0.5);
// nearest: { a: 0, b: 1 }, distance: 0.1339, isSnap: true

// Batch snap
const points = [[0.3, 0.7], [1.1, 0.4], [2.5, 1.8]];
const results = eisensteinSnapBatch(points, 0.5);
```

### Distance

```js
import { eisensteinDistance } from 'snapkit';

const d = eisensteinDistance(0.3, 0.7, 1.2, 0.5);
// Lattice distance between two points
```

### Fundamental Domain

```js
import { eisensteinFundamentalDomain } from 'snapkit';

const [unit, reduced] = eisensteinFundamentalDomain(2.5, 1.3);
// unit: the Eisenstein unit that rotates to canonical position
// reduced: the reduced Eisenstein integer
```

---

## Voronoï Cell Snap

### True Nearest Neighbor

```js
import { eisensteinSnapVoronoi, eisensteinSnapBatchVoronoi } from 'snapkit';

// True nearest via A₂ Voronoï cell (checks 3×3 neighborhood)
const [a, b] = eisensteinSnapVoronoi(0.3, 0.7);
// [0, 1]

// Batch
const points = [[0.3, 0.7], [1.1, 0.4], [2.5, 1.8]];
const coords = eisensteinSnapBatchVoronoi(points);
// [[0, 1], [1, 0], [2, 1]]
```

### Utility Functions

```js
import { eisensteinToReal, snapDistance, eisensteinSnapNaiveVoronoi } from 'snapkit';

// Lattice → Cartesian
const [x, y] = eisensteinToReal(0, 1);  // [-0.5, 0.866]

// Distance to a lattice point
const d = snapDistance(0.3, 0.7, 0, 1);

// Fast approximate snap
const [a, b] = eisensteinSnapNaiveVoronoi(0.3, 0.7);
```

### Performance Notes

- `eisensteinSnapVoronoi` uses **squared distance** (no `Math.sqrt` in hot path)
- `eisensteinSnapNaiveVoronoi` is faster but may miss the true nearest at Voronoï boundaries
- Tie-breaking prefers smaller `|a|, |b|`

---

## Temporal Snap

### BeatGrid

```js
import { BeatGrid } from 'snapkit';

const grid = new BeatGrid(1.0, 0.0, 0.0);  // period, phase, tStart

// Snap a timestamp
const result = grid.snap(1.04, 0.1);  // timestamp, tolerance
console.log(result.originalTime);  // 1.04
console.log(result.snappedTime);   // 1.0
console.log(result.offset);        // 0.04
console.log(result.isOnBeat);      // true
console.log(result.beatIndex);     // 1
console.log(result.beatPhase);     // 0.04

// Find nearest beat
const [beatTime, beatIndex] = grid.nearestBeat(2.7);  // [3.0, 3]

// List beats in range
const beats = grid.beatsInRange(0.5, 3.5);  // [1.0, 2.0, 3.0]

// Batch snap
const results = grid.snapBatch([0.04, 1.04, 2.51], 0.1);
```

### TemporalSnap with T-minus-0

```js
import { TemporalSnap, BeatGrid } from 'snapkit';

const grid = new BeatGrid(1.0);
const snap = new TemporalSnap(grid, 0.1, 0.05, 3);  // grid, tolerance, t0Threshold, t0Window

// Feed observations
snap.observe(0.0, 0.5);
snap.observe(1.0, 0.2);
const result = snap.observe(2.0, 0.001);
console.log(result.isTMinus0);  // true (derivative changed sign near zero)

// Access history
console.log(snap.history);  // [[0, 0.5], [1, 0.2], [2, 0.001]]

// Reset
snap.reset();
```

### Musical Beat Grids

```js
// 120 BPM, quarter note grid
const grid120 = new BeatGrid(0.5);  // 0.5s per beat

// Waltz: every 3 beats
const waltz = new BeatGrid(1.5);

// Syncopated: off-beat
const syncopated = new BeatGrid(1.0, 0.5);
```

---

## Spectral Analysis

### Entropy

```js
import { entropy } from 'snapkit';

const data = [0.1, 0.5, 0.3, 0.8, 0.2, 0.7, 0.4, 0.6];
const h = entropy(data, 10);  // Shannon entropy in bits
// High → uniform/random, Low → concentrated/predictable
```

### Hurst Exponent

```js
import { hurstExponent } from 'snapkit';

const signal = Array.from({ length: 500 }, () => Math.random() * 2 - 1);
const H = hurstExponent(signal);
// H ≈ 0.5 → random walk
// H > 0.5 → trending (persistent)
// H < 0.5 → mean-reverting (anti-persistent)
```

### Autocorrelation

```js
import { autocorrelation } from 'snapkit';

const acf = autocorrelation(signal, 50);
// acf[0] = 1.0 (always)
// acf[k] = lag-k normalized autocorrelation
```

### Full Spectral Summary

```js
import { spectralSummary, spectralBatch } from 'snapkit';

const summary = spectralSummary(signal, 10, 50);
console.log(summary.entropyBits);      // Shannon entropy
console.log(summary.hurst);            // Hurst exponent
console.log(summary.autocorrLag1);     // Lag-1 ACF
console.log(summary.autocorrDecay);    // Lag where ACF < 1/e
console.log(summary.isStationary);     // H ∈ [0.4, 0.6] AND |ACF(1)| < 0.3

// Batch analysis
const summaries = spectralBatch([seriesA, seriesB, seriesC]);
```

---

## Common Patterns

### Quantize Signal to Eisenstein Lattice

```js
import { eisensteinSnap } from 'snapkit';

const signal = [[0.3, 0.7], [1.1, 0.4], [2.5, 1.8]];
const quantized = signal.map(([x, y]) => {
  const { nearest, distance, isSnap } = eisensteinSnap(x, y, 0.3);
  return isSnap ? [nearest.a, nearest.b] : [x, y];  // keep original if too far
});
```

### Detect Onset Times

```js
import { BeatGrid, TemporalSnap } from 'snapkit';

const grid = new BeatGrid(0.5);  // 120 BPM
const snap = new TemporalSnap(grid, 0.05, 0.02);

const onsets = [];
for (const [t, value] of audioEnvelope) {
  const result = snap.observe(t, value);
  if (result.isTMinus0) {
    onsets.push(result.snappedTime);
  }
}
```

### Hexagonal Grid for Game/Visualization

```js
import { eisensteinToReal, eisensteinSnapVoronoi } from 'snapkit';

// Convert pixel coordinates to hex grid coordinates
function pixelToHex(px, py) {
  const [a, b] = eisensteinSnapVoronoi(px, py);
  return { col: a, row: b };
}

// Convert hex grid back to pixel center
function hexToPixel(col, row) {
  const [x, y] = eisensteinToReal(col, row);
  return { x, y };
}
```

---

*Part of the Cocapn constraint theory ecosystem.*

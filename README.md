# SnapKit JS — Eisenstein Lattice Snap for JavaScript/TypeScript

Constraint geometry snap toolkit — Eisenstein Voronoï, temporal beat grids, and spectral analysis. Zero dependencies.

## What It Does

Snaps continuous 2D points to the **Eisenstein A₂ lattice** — the densest possible packing in 2D (hexagonal grid). Also provides temporal snap (beat grid alignment) and spectral analysis (entropy, Hurst exponent, autocorrelation).

## Why Eisenstein?

The Eisenstein integers ℤ[ω] (where ω = e^(2πi/3)) form the A₂ root lattice — the densest 2D lattice packing. Hexagonal Voronoï cells give isotropic quantization error, and the PID property guarantees algebraic consistency (H¹ = 0).

## Install

```bash
npm install snapkit
```

## Quick Start

### Eisenstein Snap

```js
import {
  eisensteinSnap, eisensteinRound, EisensteinInteger,
  toComplex, normSquared, add, sub, mul, conjugate,
  eisensteinSnapVoronoi, eisensteinDistance
} from 'snapkit';

// Snap a 2D point to the nearest Eisenstein integer
const { nearest, distance, isSnap } = eisensteinSnap(0.3, 0.7, 0.5);
console.log(`(${nearest.a}, ${nearest.b}) — distance=${distance.toFixed(4)}, snapped=${isSnap}`);

// Direct round
const ei = eisensteinRound(1.2, 0.7);
console.log(`Eisenstein integer: (${ei.a}, ${ei.b})`);

// Arithmetic
const a = EisensteinInteger(3, 1);
const b = EisensteinInteger(1, 2);
const sum = add(a, b);         // { a: 4, b: 3 }
const product = mul(a, b);     // { a: 1, b: 7 }
const conj = conjugate(a);     // { a: 4, b: -1 }

// Convert to Cartesian
const [x, y] = toComplex(ei);

// Lattice distance
const dist = eisensteinDistance(0.3, 0.7, 1.2, 0.5);
```

### Batch Operations

```js
import { eisensteinSnapBatch, eisensteinSnapBatchVoronoi } from 'snapkit';

const points = [[0.3, 0.7], [1.1, 0.4], [2.5, 1.8]];

// Batch snap with tolerance
const results = eisensteinSnapBatch(points, 0.5);

// Batch Voronoï snap (just coordinates, no tolerance check)
const coords = eisensteinSnapBatchVoronoi(points);
```

### Temporal Snap (Beat Grid)

```js
import { BeatGrid, TemporalSnap } from 'snapkit';

const grid = new BeatGrid(1.0, 0.0, 0.0);  // period=1s, phase=0, start=0
const snap = new TemporalSnap(grid, 0.1, 0.05, 3);  // grid, tolerance, t0Threshold, t0Window

const result = snap.observe(1.04, 0.3);
console.log(`On beat: ${result.isOnBeat}, offset: ${result.offset.toFixed(3)}`);
console.log(`T-0: ${result.isTMinus0}, phase: ${result.beatPhase.toFixed(3)}`);

// Beat grid utilities
const [beatTime, beatIndex] = grid.nearestBeat(2.7);
const beats = grid.beatsInRange(0, 5);
```

### Spectral Analysis

```js
import { entropy, hurstExponent, autocorrelation, spectralSummary } from 'snapkit';

const signal = Array.from({ length: 500 }, () => Math.random() * 2 - 1);

// Individual metrics
const h = entropy(signal, 10);
const H = hurstExponent(signal);
const acf = autocorrelation(signal, 50);

// Full summary
const summary = spectralSummary(signal, 10, 50);
console.log(`Entropy: ${summary.entropyBits.toFixed(2)} bits`);
console.log(`Hurst: ${summary.hurst.toFixed(3)} (stationary: ${summary.isStationary})`);
console.log(`ACF lag-1: ${summary.autocorrLag1.toFixed(3)}, decay: ${summary.autocorrDecay}`);
```

## API Reference

### Eisenstein Lattice

| Export | Signature | Description |
|--------|-----------|-------------|
| `EisensteinInteger(a, b)` | `(int, int) → {a, b}` | Frozen Eisenstein integer |
| `toComplex(ei)` | `EI → [x, y]` | Convert to Cartesian coordinates |
| `normSquared(ei)` | `EI → int` | a² - ab + b² |
| `magnitude(ei)` | `EI → float` | sqrt(normSquared) |
| `add(a, b)` | `(EI, EI) → EI` | Addition |
| `sub(a, b)` | `(EI, EI) → EI` | Subtraction |
| `mul(a, b)` | `(EI, EI) → EI` | Multiplication |
| `conjugate(ei)` | `EI → EI` | Galois conjugate |
| `eisensteinRound(x, y)` | `(float, float) → EI` | Round to nearest Eisenstein integer |
| `eisensteinRoundNaive(x, y)` | `(float, float) → EI` | Legacy 4-candidate rounding |
| `eisensteinSnap(x, y, tol)` | `(float, float, float) → {nearest, distance, isSnap}` | Snap with tolerance check |
| `eisensteinSnapBatch(pts, tol)` | `([x,y][], float) → result[]` | Vectorized snap |
| `eisensteinSnapVoronoi(x, y)` | `(float, float) → [a, b]` | True nearest via Voronoï cell |
| `eisensteinSnapBatchVoronoi(pts)` | `([x,y][] → [a,b][])` | Vectorized Voronoï |
| `eisensteinToReal(a, b)` | `(int, int) → [x, y]` | Lattice → Cartesian |
| `snapDistance(x, y, a, b)` | `(float, float, int, int) → float` | Distance to lattice point |
| `eisensteinDistance(x1, y1, x2, y2)` | `(float×4) → float` | Lattice distance between two points |
| `eisensteinFundamentalDomain(x, y)` | `(float, float) → [unit, EI]` | Reduce to canonical representative |

### Temporal

| Export | Description |
|--------|-------------|
| `BeatGrid(period, phase, tStart)` | Periodic time grid |
| `BeatGrid.snap(t, tolerance)` | Snap timestamp → result |
| `BeatGrid.snapBatch(timestamps, tolerance)` | Vectorized snap |
| `BeatGrid.nearestBeat(t)` | `[beatTime, beatIndex]` |
| `BeatGrid.beatsInRange(tStart, tEnd)` | All beats in interval |
| `TemporalSnap(grid, tolerance, t0Threshold, t0Window)` | Beat snap + T-minus-0 detection |
| `TemporalSnap.observe(t, value)` | Feed observation |
| `TemporalSnap.history` | Recent observations |
| `TemporalSnap.reset()` | Clear history |

### Spectral

| Export | Description |
|--------|-------------|
| `entropy(data, bins=10)` | Shannon entropy via histogram |
| `hurstExponent(data)` | R/S analysis Hurst exponent |
| `autocorrelation(data, maxLag)` | Normalized autocorrelation |
| `spectralSummary(data, bins, maxLag)` | `{entropyBits, hurst, autocorrLag1, autocorrDecay, isStationary}` |
| `spectralBatch(seriesList, bins, maxLag)` | Batch analysis |

## Performance

- Voronoï snap uses squared-distance comparison (no `Math.sqrt` in hot path)
- `BeatGrid` precomputes `1/period`
- Autocorrelation uses `Float64Array` for centered data
- All objects are frozen (immutable)

## Connection to Constraint Theory

Part of the Cocapn constraint theory ecosystem:

- **Eisenstein lattice** provides optimal 2D quantization (A₂ root system, densest packing)
- **Temporal snap** aligns to beat grids for the FLUX-Tensor timing protocol
- **Spectral analysis** detects self-similarity and entropy for snap calibration

## License

MIT

// src/voronoi.ts
var SQRT3 = Math.sqrt(3);
var INV_SQRT3 = 1 / SQRT3;
var HALF_SQRT3 = 0.5 * SQRT3;
function eisensteinToReal(a, b) {
  return [a - b * 0.5, b * HALF_SQRT3];
}
function snapDistance(x, y, a, b) {
  const dx = x - (a - b * 0.5);
  const dy = y - b * HALF_SQRT3;
  return Math.sqrt(dx * dx + dy * dy);
}
function eisensteinSnapNaive(x, y) {
  const b = Math.round(y * 2 * INV_SQRT3);
  const a = Math.round(x + b * 0.5);
  return [a, b];
}
function eisensteinSnapVoronoi(x, y) {
  const b0 = Math.round(y * 2 * INV_SQRT3);
  const a0 = Math.round(x + b0 * 0.5);
  let bestDistSq = Infinity;
  let bestA = a0;
  let bestB = b0;
  for (let da = -1; da <= 1; da++) {
    for (let db = -1; db <= 1; db++) {
      const a = a0 + da;
      const b = b0 + db;
      const dx = x - (a - b * 0.5);
      const dy = y - b * HALF_SQRT3;
      const dSq = dx * dx + dy * dy;
      if (dSq < bestDistSq - 1e-24) {
        bestDistSq = dSq;
        bestA = a;
        bestB = b;
      } else if (Math.abs(dSq - bestDistSq) < 1e-24) {
        if (Math.abs(a) < Math.abs(bestA) || Math.abs(a) === Math.abs(bestA) && Math.abs(b) < Math.abs(bestB)) {
          bestA = a;
          bestB = b;
        }
      }
    }
  }
  return [bestA, bestB];
}
function eisensteinSnapBatch(points) {
  return points.map(([x, y]) => eisensteinSnapVoronoi(x, y));
}

// src/eisenstein.ts
var SQRT32 = Math.sqrt(3);
var HALF_SQRT32 = 0.5 * SQRT32;
function frozen(obj) {
  return Object.freeze(obj);
}
function EisensteinInteger(a, b) {
  return frozen({ a, b });
}
function toComplex(ei) {
  return [ei.a - 0.5 * ei.b, HALF_SQRT32 * ei.b];
}
function normSquared(ei) {
  return ei.a * ei.a - ei.a * ei.b + ei.b * ei.b;
}
function magnitude(ei) {
  return Math.sqrt(normSquared(ei));
}
function add(left, right) {
  return EisensteinInteger(left.a + right.a, left.b + right.b);
}
function sub(left, right) {
  return EisensteinInteger(left.a - right.a, left.b - right.b);
}
function mul(left, right) {
  const { a, b } = left;
  const c = right.a, d = right.b;
  return EisensteinInteger(a * c - b * d, a * d + b * c - b * d);
}
function conjugate(ei) {
  return EisensteinInteger(ei.a + ei.b, -ei.b);
}
function toEisensteinCoords(x, y) {
  const bFloat = 2 * y / SQRT32;
  const aFloat = x + bFloat * 0.5;
  return [aFloat, bFloat];
}
function eisensteinRoundNaive(x, y) {
  const [aFloat, bFloat] = toEisensteinCoords(x, y);
  const aFloor = Math.floor(aFloat);
  const bFloor = Math.floor(bFloat);
  let bestDist = Infinity;
  const tied = [];
  for (let da = 0; da <= 1; da++) {
    for (let db = 0; db <= 1; db++) {
      const a = aFloor + da;
      const b = bFloor + db;
      const [cx, cy] = eisensteinToReal(a, b);
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist < bestDist - 1e-9) {
        bestDist = dist;
        tied.length = 0;
        tied.push([Math.abs(a), Math.abs(b), a, b]);
      } else if (Math.abs(dist - bestDist) < 1e-9) {
        tied.push([Math.abs(a), Math.abs(b), a, b]);
      }
    }
  }
  tied.sort((l, r) => l[0] - r[0] || l[1] - r[1]);
  return EisensteinInteger(tied[0][2], tied[0][3]);
}
function eisensteinRound(x, y) {
  const [a, b] = eisensteinSnapVoronoi(x, y);
  return EisensteinInteger(a, b);
}
function eisensteinSnap(x, y, tolerance = 0.5) {
  const nearest = eisensteinRound(x, y);
  const [cx, cy] = toComplex(nearest);
  const distance = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  return frozen({
    nearest,
    distance,
    isSnap: distance <= tolerance
  });
}
function eisensteinSnapBatch2(points, tolerance = 0.5) {
  return points.map(([x, y]) => eisensteinSnap(x, y, tolerance));
}
function eisensteinDistance(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const nearest = eisensteinRound(dx, dy);
  const [cx, cy] = toComplex(nearest);
  const residual = Math.sqrt((dx - cx) ** 2 + (dy - cy) ** 2);
  return Math.sqrt(normSquared(nearest)) + residual;
}
function eisensteinFundamentalDomain(x, y) {
  const units = [
    EisensteinInteger(1, 0),
    EisensteinInteger(0, 1),
    EisensteinInteger(-1, 1),
    EisensteinInteger(-1, 0),
    EisensteinInteger(0, -1),
    EisensteinInteger(1, -1)
  ];
  const targetAngle = Math.PI / 6;
  let bestUnit = units[0];
  let bestAngle = Infinity;
  for (const u of units) {
    const conjU = conjugate(u);
    const [ux2, uy2] = toComplex(conjU);
    const rx2 = x * ux2 - y * uy2;
    const ry2 = x * uy2 + y * ux2;
    const angle = Math.abs(Math.atan2(ry2, rx2) - targetAngle);
    if (angle < bestAngle) {
      bestAngle = angle;
      bestUnit = u;
    }
  }
  const bestConj = conjugate(bestUnit);
  const [ux, uy] = toComplex(bestConj);
  const rx = x * ux - y * uy;
  const ry = x * uy + y * ux;
  return [bestUnit, eisensteinRound(rx, ry)];
}

// src/temporal.ts
var BeatGrid = class {
  constructor(period = 1, phase = 0, tStart = 0) {
    if (period <= 0) {
      throw new Error("period must be positive");
    }
    this.period = period;
    this.phase = phase;
    this.tStart = tStart;
    this._invPeriod = 1 / period;
  }
  /** Find the nearest beat and its index. */
  nearestBeat(t) {
    const adjusted = t - this.tStart - this.phase;
    const index = Math.round(adjusted * this._invPeriod);
    const beatTime = this.tStart + this.phase + index * this.period;
    return [beatTime, index];
  }
  /** Snap a timestamp to the grid. */
  snap(t, tolerance = 0.1) {
    const [beatTime, beatIndex] = this.nearestBeat(t);
    const offset = t - beatTime;
    const isOnBeat = Math.abs(offset) <= tolerance;
    let phase = (t - this.tStart - this.phase) % this.period * this._invPeriod;
    if (phase < 0) phase += 1;
    return Object.freeze({
      originalTime: t,
      snappedTime: beatTime,
      offset,
      isOnBeat,
      isTMinus0: false,
      beatIndex,
      beatPhase: phase
    });
  }
  /** Snap multiple timestamps. */
  snapBatch(timestamps, tolerance = 0.1) {
    return timestamps.map((t) => this.snap(t, tolerance));
  }
  /** List all beat times in [tStart, tEnd). */
  beatsInRange(tStart, tEnd) {
    if (tEnd <= tStart) return [];
    const firstIdx = Math.ceil((tStart - this.tStart - this.phase) * this._invPeriod);
    const lastIdx = Math.floor((tEnd - this.tStart - this.phase) * this._invPeriod);
    const beats = [];
    for (let i = firstIdx; i <= lastIdx; i++) {
      beats.push(this.tStart + this.phase + i * this.period);
    }
    return beats;
  }
};
var TemporalSnap = class {
  constructor(grid, tolerance = 0.1, t0Threshold = 0.05, t0Window = 3) {
    this.grid = grid;
    this.tolerance = tolerance;
    this.t0Threshold = t0Threshold;
    this.t0Window = Math.max(2, t0Window);
    this._histCap = this.t0Window * 2;
    this._history = new Array(this._histCap).fill(null);
    this._histIdx = 0;
    this._histLen = 0;
  }
  /** Observe a time-value pair and return the snap result. */
  observe(t, value) {
    this._history[this._histIdx] = [t, value];
    this._histIdx = (this._histIdx + 1) % this._histCap;
    if (this._histLen < this._histCap) this._histLen++;
    const isT0 = this._detectT0();
    const result = this.grid.snap(t, this.tolerance);
    return Object.freeze({
      originalTime: result.originalTime,
      snappedTime: result.snappedTime,
      offset: result.offset,
      isOnBeat: result.isOnBeat,
      isTMinus0: isT0,
      beatIndex: result.beatIndex,
      beatPhase: result.beatPhase
    });
  }
  /** Reset history buffer. */
  reset() {
    this._histIdx = 0;
    this._histLen = 0;
  }
  /** Return the current history as ordered pairs. */
  get history() {
    const result = [];
    for (let i = 0; i < this._histLen; i++) {
      const idx = (this._histIdx - this._histLen + i + this._histCap) % this._histCap;
      const val = this._history[idx];
      if (val !== null) result.push(val);
    }
    return result;
  }
  _detectT0() {
    if (this._histLen < 3) return false;
    const cap = this._histCap;
    const idx = this._histIdx;
    const [currT, currVal] = this._history[(idx - 1 + cap) % cap];
    const [midT, midVal] = this._history[(idx - 2 + cap) % cap];
    const [prevT, prevVal] = this._history[(idx - 3 + cap) % cap];
    if (Math.abs(currVal) > this.t0Threshold) return false;
    const dt1 = midT - prevT;
    const dt2 = currT - midT;
    if (dt1 === 0 || dt2 === 0) return false;
    const d1 = (midVal - prevVal) / dt1;
    const d2 = (currVal - midVal) / dt2;
    return d1 * d2 < 0;
  }
};

// src/spectral.ts
var INV_E = 1 / Math.E;
function entropy(data, bins = 10) {
  const n = data.length;
  if (n < 2) return 0;
  let minVal = data[0];
  let maxVal = data[0];
  for (let i = 1; i < n; i++) {
    if (data[i] < minVal) minVal = data[i];
    else if (data[i] > maxVal) maxVal = data[i];
  }
  if (maxVal === minVal) return 0;
  const invRange = bins / (maxVal - minVal);
  const counts = new Array(bins).fill(0);
  for (let i = 0; i < n; i++) {
    let idx = Math.floor((data[i] - minVal) * invRange);
    if (idx >= bins) idx = bins - 1;
    counts[idx]++;
  }
  const invN = 1 / n;
  const invLog2 = 1 / Math.log(2);
  let h = 0;
  for (let i = 0; i < bins; i++) {
    const c = counts[i];
    if (c > 0) {
      const p = c * invN;
      h -= p * Math.log(p) * invLog2;
    }
  }
  return h;
}
function autocorrelation(data, maxLag) {
  const n = data.length;
  if (n < 2) return [1];
  if (maxLag === void 0) maxLag = Math.floor(n / 2);
  maxLag = Math.min(maxLag, n - 1);
  const invN = 1 / n;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += data[i];
  const mean = sum * invN;
  const centered = new Float64Array(n);
  for (let i = 0; i < n; i++) centered[i] = data[i] - mean;
  let r0 = 0;
  for (let i = 0; i < n; i++) r0 += centered[i] * centered[i];
  r0 *= invN;
  if (r0 === 0) return [1].concat(new Array(maxLag).fill(0));
  const invR0 = 1 / r0;
  const result = new Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag++) {
    let rk = 0;
    const limit = n - lag;
    for (let t = 0; t < limit; t++) {
      rk += centered[t] * centered[t + lag];
    }
    result[lag] = rk * invN * invR0;
  }
  return result;
}
function hurstExponent(data) {
  const n = data.length;
  if (n < 20) return 0.5;
  const invN = 1 / n;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += data[i];
  const meanVal = sum * invN;
  const centered = new Float64Array(n);
  for (let i = 0; i < n; i++) centered[i] = data[i] - meanVal;
  const testSizes = [];
  let s = 16;
  while (s <= Math.floor(n / 2)) {
    testSizes.push(s);
    const next = s * 2 <= Math.floor(n / 2) ? s * 2 : Math.floor(s * 1.5);
    if (next === testSizes[testSizes.length - 1]) break;
    s = next;
  }
  if (testSizes.length === 0) {
    if (n >= 8) testSizes.push(Math.floor(n / 4));
    else testSizes.push(n);
    for (let i = testSizes.length - 1; i >= 0; i--) {
      if (testSizes[i] < 4) testSizes.splice(i, 1);
    }
  }
  const sizes = [];
  const rsValues = [];
  for (const size of testSizes) {
    if (size < 4 || size > n) continue;
    const numSubseries = Math.floor(n / size);
    if (numSubseries < 1) continue;
    const invSize = 1 / size;
    let rsSum = 0;
    let rsCount = 0;
    for (let i = 0; i < numSubseries; i++) {
      const start = i * size;
      let subSum = 0;
      for (let j = start; j < start + size; j++) subSum += centered[j];
      const subMean = subSum * invSize;
      let running = 0;
      let cumMin = 0;
      let cumMax = 0;
      for (let j = start; j < start + size; j++) {
        running += centered[j] - subMean;
        if (running < cumMin) cumMin = running;
        else if (running > cumMax) cumMax = running;
      }
      const r = cumMax - cumMin;
      let var_ = 0;
      for (let j = start; j < start + size; j++) {
        const d = centered[j] - subMean;
        var_ += d * d;
      }
      var_ *= invSize;
      if (var_ > 1e-20) {
        rsSum += r / Math.sqrt(var_);
        rsCount++;
      }
    }
    if (rsCount > 0) {
      const avgRs = rsSum / rsCount;
      if (avgRs > 0) {
        sizes.push(size);
        rsValues.push(avgRs);
      }
    }
  }
  if (sizes.length < 2) return 0.5;
  const nPts = sizes.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < nPts; i++) {
    const lx = Math.log(sizes[i]);
    const ly = Math.log(rsValues[i]);
    sumX += lx;
    sumY += ly;
    sumXY += lx * ly;
    sumX2 += lx * lx;
  }
  const denom = nPts * sumX2 - sumX * sumX;
  if (denom === 0) return 0.5;
  const h = (nPts * sumXY - sumX * sumY) / denom;
  return Math.max(0, Math.min(1, h));
}
function spectralSummary(data, bins = 10, maxLag) {
  const h = entropy(data, bins);
  const hurstVal = hurstExponent(data);
  const acf = autocorrelation(data, maxLag);
  const acfLag1 = acf.length > 1 ? acf[1] : 0;
  let decayLag = acf.length;
  const threshold = INV_E;
  for (let i = 1; i < acf.length; i++) {
    if (Math.abs(acf[i]) < threshold) {
      decayLag = i;
      break;
    }
  }
  const isStationary = 0.4 <= hurstVal && hurstVal <= 0.6 && Math.abs(acfLag1) < 0.3;
  return Object.freeze({
    entropyBits: h,
    hurst: hurstVal,
    autocorrLag1: acfLag1,
    autocorrDecay: decayLag,
    isStationary
  });
}
function spectralBatch(seriesList, bins = 10, maxLag) {
  return seriesList.map((data) => spectralSummary(data, bins, maxLag));
}
export {
  BeatGrid,
  EisensteinInteger,
  TemporalSnap,
  add,
  autocorrelation,
  conjugate,
  eisensteinDistance,
  eisensteinFundamentalDomain,
  eisensteinRound,
  eisensteinRoundNaive,
  eisensteinSnap,
  eisensteinSnapBatch2 as eisensteinSnapBatch,
  eisensteinSnapBatch as eisensteinSnapBatchVoronoi,
  eisensteinSnapNaive as eisensteinSnapNaiveVoronoi,
  eisensteinSnapVoronoi,
  eisensteinToReal,
  entropy,
  hurstExponent,
  magnitude,
  mul,
  normSquared,
  snapDistance,
  spectralBatch,
  spectralSummary,
  sub,
  toComplex
};

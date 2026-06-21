const DEFAULT_SEED = 12345;

/**
 * Create a small deterministic pseudo-random generator.
 * @param {number|string|undefined} seed
 */
export function createRng(seed = DEFAULT_SEED) {
  let value = Number(seed) || DEFAULT_SEED;
  value = value % 2147483647;
  if (value <= 0) value += 2147483646;

  return {
    next() {
      value = (value * 16807) % 2147483647;
      return (value - 1) / 2147483646;
    },
    nextInt(max) {
      return Math.floor(this.next() * max);
    }
  };
}

function normalSample(rng, mean, stdev) {
  const u1 = Math.max(rng.next(), Number.EPSILON);
  const u2 = Math.max(rng.next(), Number.EPSILON);
  const mag = Math.sqrt(-2 * Math.log(u1));
  return mean + stdev * mag * Math.cos(2 * Math.PI * u2);
}

/**
 * Sample supported processing-time distributions.
 * @param {{distribution?: string, min?: number, max?: number, mode?: number, mean?: number, stdev?: number, rate?: number, value?: number}} spec
 * @param {{next: () => number}} rng
 */
export function sampleDistribution(spec = {}, rng = createRng()) {
  const distribution = spec.distribution || "constant";
  if (distribution === "uniform") {
    const min = Number(spec.min ?? 1);
    const max = Number(spec.max ?? min);
    return min + rng.next() * Math.max(0, max - min);
  }
  if (distribution === "triangular") {
    const min = Number(spec.min ?? 1);
    const max = Number(spec.max ?? min + 1);
    const mode = Number(spec.mode ?? (min + max) / 2);
    const u = rng.next();
    const c = (mode - min) / Math.max(Number.EPSILON, max - min);
    if (u <= c) return min + Math.sqrt(u * (max - min) * (mode - min));
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
  if (distribution === "normal") {
    const mean = Number(spec.mean ?? 1);
    const stdev = Number(spec.stdev ?? mean * 0.15);
    return Math.max(0.01, normalSample(rng, mean, stdev));
  }
  if (distribution === "exponential") {
    const mean = Number(spec.mean ?? 1);
    const rate = Number(spec.rate ?? (mean > 0 ? 1 / mean : 1));
    return Math.max(0.01, -Math.log(Math.max(rng.next(), Number.EPSILON)) / rate);
  }
  return Number(spec.value ?? spec.mean ?? 1);
}

export function chance(probability = 0, rng = createRng()) {
  return rng.next() < Number(probability || 0);
}

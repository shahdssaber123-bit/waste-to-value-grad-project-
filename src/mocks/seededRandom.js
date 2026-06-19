/** @returns {() => number} */
export function createSeededRandom(seed = 1) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

export function pickWeighted(rng, items, weights) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng() * total;

  for (let index = 0; index < items.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) {
      return items[index];
    }
  }

  return items[items.length - 1];
}

export function intBetween(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function floatBetween(rng, min, max, decimals = 2) {
  const value = rng() * (max - min) + min;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function isoDaysAgo(rng, maxDays = 365) {
  const days = intBetween(rng, 0, maxDays);
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(intBetween(rng, 6, 20), intBetween(rng, 0, 59), 0, 0);
  return date.toISOString();
}

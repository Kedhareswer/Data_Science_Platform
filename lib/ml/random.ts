/** Small, fast, seedable PRNG (mulberry32) so splits and forests are reproducible. */
export function createRng(seed = 42): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffleInPlace<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

/**
 * Index-based train/test split. When `stratify` labels are given each class is
 * split proportionally so rare classes appear in both sets.
 */
export function trainTestSplit(
  n: number,
  testSize: number,
  rng: () => number,
  stratify?: readonly (string | number)[],
): { train: number[]; test: number[] } {
  const groups = new Map<string | number, number[]>()
  for (let i = 0; i < n; i++) {
    const key = stratify ? stratify[i] : 0
    const g = groups.get(key)
    if (g) g.push(i)
    else groups.set(key, [i])
  }
  const train: number[] = []
  const test: number[] = []
  for (const idx of groups.values()) {
    shuffleInPlace(idx, rng)
    const nTest = idx.length < 2 ? 0 : Math.max(1, Math.round(idx.length * testSize))
    test.push(...idx.slice(0, nTest))
    train.push(...idx.slice(nTest))
  }
  return { train: shuffleInPlace(train, rng), test: shuffleInPlace(test, rng) }
}

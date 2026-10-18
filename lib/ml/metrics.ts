import type { ClassificationMetrics, RegressionMetrics } from "./types"

export function accuracy(yTrue: readonly number[], yPred: readonly number[]): number {
  if (yTrue.length === 0) return Number.NaN
  let hits = 0
  for (let i = 0; i < yTrue.length; i++) if (yTrue[i] === yPred[i]) hits++
  return hits / yTrue.length
}

/** Rows = actual class, columns = predicted class. */
export function confusionMatrix(yTrue: readonly number[], yPred: readonly number[], nClasses: number): number[][] {
  const m = Array.from({ length: nClasses }, () => new Array<number>(nClasses).fill(0))
  for (let i = 0; i < yTrue.length; i++) m[yTrue[i]][yPred[i]]++
  return m
}

/** Precision/recall/F1. Binary → positive class (index 1); multiclass → macro average. */
export function precisionRecallF1(matrix: number[][]): { precision: number; recall: number; f1Score: number } {
  const k = matrix.length
  const perClass = (c: number) => {
    const tp = matrix[c][c]
    let fp = 0
    let fn = 0
    for (let i = 0; i < k; i++) {
      if (i !== c) {
        fp += matrix[i][c]
        fn += matrix[c][i]
      }
    }
    const p = tp + fp === 0 ? 0 : tp / (tp + fp)
    const r = tp + fn === 0 ? 0 : tp / (tp + fn)
    return { p, r, f: p + r === 0 ? 0 : (2 * p * r) / (p + r) }
  }
  if (k === 2) {
    const { p, r, f } = perClass(1)
    return { precision: p, recall: r, f1Score: f }
  }
  const present = Array.from({ length: k }, (_, c) => c).filter((c) => matrix[c].some((v) => v > 0))
  const scores = present.map(perClass)
  const avg = (sel: (s: { p: number; r: number; f: number }) => number) =>
    scores.length === 0 ? 0 : scores.reduce((acc, s) => acc + sel(s), 0) / scores.length
  return { precision: avg((s) => s.p), recall: avg((s) => s.r), f1Score: avg((s) => s.f) }
}

/** ROC AUC via the rank statistic (handles ties). Labels must be 0/1. */
export function rocAuc(yTrue: readonly number[], scores: readonly number[]): number {
  const pairs = yTrue.map((y, i) => ({ y, s: scores[i] })).sort((a, b) => a.s - b.s)
  const nPos = pairs.filter((p) => p.y === 1).length
  const nNeg = pairs.length - nPos
  if (nPos === 0 || nNeg === 0) return Number.NaN
  let rankSum = 0
  for (let i = 0; i < pairs.length;) {
    let j = i
    while (j < pairs.length && pairs[j].s === pairs[i].s) j++
    const avgRank = (i + j + 1) / 2
    for (let t = i; t < j; t++) if (pairs[t].y === 1) rankSum += avgRank
    i = j
  }
  return (rankSum - (nPos * (nPos + 1)) / 2) / (nPos * nNeg)
}

export interface Curve {
  points: Array<{ x: number; y: number; threshold: number }>
}

/** ROC curve points (FPR, TPR) for binary scores. */
export function rocCurve(yTrue: readonly number[], scores: readonly number[]): Curve {
  const thresholds = [...new Set(scores)].sort((a, b) => b - a)
  const nPos = yTrue.filter((y) => y === 1).length
  const nNeg = yTrue.length - nPos
  const points = [{ x: 0, y: 0, threshold: Infinity }]
  for (const t of thresholds) {
    let tp = 0
    let fp = 0
    for (let i = 0; i < yTrue.length; i++) {
      if (scores[i] >= t) {
        if (yTrue[i] === 1) tp++
        else fp++
      }
    }
    points.push({ x: nNeg ? fp / nNeg : 0, y: nPos ? tp / nPos : 0, threshold: t })
  }
  return { points }
}

/** Precision–recall curve points (recall, precision). */
export function prCurve(yTrue: readonly number[], scores: readonly number[]): Curve {
  const thresholds = [...new Set(scores)].sort((a, b) => b - a)
  const nPos = yTrue.filter((y) => y === 1).length
  const points: Curve["points"] = []
  for (const t of thresholds) {
    let tp = 0
    let fp = 0
    for (let i = 0; i < yTrue.length; i++) {
      if (scores[i] >= t) {
        if (yTrue[i] === 1) tp++
        else fp++
      }
    }
    points.push({ x: nPos ? tp / nPos : 0, y: tp + fp ? tp / (tp + fp) : 1, threshold: t })
  }
  return { points }
}

export function classificationMetrics(
  yTrue: readonly number[],
  yPred: readonly number[],
  nClasses: number,
  positiveScores?: readonly number[],
): ClassificationMetrics {
  const matrix = confusionMatrix(yTrue, yPred, nClasses)
  const prf = precisionRecallF1(matrix)
  const metrics: ClassificationMetrics = { accuracy: accuracy(yTrue, yPred), ...prf, confusionMatrix: matrix }
  if (nClasses === 2 && positiveScores) {
    const auc = rocAuc(yTrue, positiveScores)
    if (Number.isFinite(auc)) metrics.rocAuc = auc
  }
  return metrics
}

export function rmse(yTrue: readonly number[], yPred: readonly number[]): number {
  let acc = 0
  for (let i = 0; i < yTrue.length; i++) acc += (yTrue[i] - yPred[i]) ** 2
  return Math.sqrt(acc / yTrue.length)
}

export function mae(yTrue: readonly number[], yPred: readonly number[]): number {
  let acc = 0
  for (let i = 0; i < yTrue.length; i++) acc += Math.abs(yTrue[i] - yPred[i])
  return acc / yTrue.length
}

/** Coefficient of determination; 0 when the target is constant and perfectly predicted. */
export function r2Score(yTrue: readonly number[], yPred: readonly number[]): number {
  const m = yTrue.reduce((a, b) => a + b, 0) / yTrue.length
  let ssRes = 0
  let ssTot = 0
  for (let i = 0; i < yTrue.length; i++) {
    ssRes += (yTrue[i] - yPred[i]) ** 2
    ssTot += (yTrue[i] - m) ** 2
  }
  if (ssTot === 0) return ssRes === 0 ? 1 : 0
  return 1 - ssRes / ssTot
}

export function regressionMetrics(yTrue: readonly number[], yPred: readonly number[]): RegressionMetrics {
  return { rmse: rmse(yTrue, yPred), mae: mae(yTrue, yPred), r2Score: r2Score(yTrue, yPred) }
}

export function squaredDistance(a: readonly number[], b: readonly number[]): number {
  let d = 0
  for (let i = 0; i < a.length; i++) d += (a[i] - b[i]) ** 2
  return d
}

/** Mean silhouette coefficient; samples at most `maxSamples` points for speed. */
export function silhouette(X: readonly number[][], labels: readonly number[], maxSamples = 1000): number {
  const n = Math.min(X.length, maxSamples)
  const k = Math.max(...labels) + 1
  if (k < 2) return 0
  let total = 0
  for (let i = 0; i < n; i++) {
    const sums = new Array<number>(k).fill(0)
    const counts = new Array<number>(k).fill(0)
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      sums[labels[j]] += Math.sqrt(squaredDistance(X[i], X[j]))
      counts[labels[j]]++
    }
    const own = labels[i]
    if (counts[own] === 0) continue
    const a = sums[own] / counts[own]
    let b = Infinity
    for (let c = 0; c < k; c++) if (c !== own && counts[c] > 0) b = Math.min(b, sums[c] / counts[c])
    if (Number.isFinite(b)) total += (b - a) / Math.max(a, b)
  }
  return total / n
}

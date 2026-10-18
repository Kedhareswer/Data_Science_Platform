import { squaredDistance } from "./metrics"
import { createRng } from "./random"
import type { AlgorithmId, AlgorithmInfo, Backend, Hyperparameters, TaskType } from "./types"

/**
 * In-browser estimators. Classification targets are class indices 0..K-1,
 * regression targets are numbers, clustering ignores `y`. Every estimator
 * serializes to plain JSON via `toJSON()` and is rebuilt by `restoreEstimator`.
 */
export interface Estimator {
  fit(X: number[][], y: number[]): void
  predict(X: number[][]): number[]
  predictProba?(X: number[][]): number[][]
  toJSON(): unknown
}

export const ALGORITHMS: AlgorithmInfo[] = [
  {
    id: "linear_regression",
    name: "Linear Regression (Ridge)",
    tasks: ["regression"],
    description: "Least-squares fit with optional L2 regularisation. Fast and interpretable.",
    hyperparameters: [
      { key: "alpha", label: "L2 penalty (α)", type: "number", default: 0, min: 0, max: 100, step: 0.1 },
    ],
  },
  {
    id: "logistic_regression",
    name: "Logistic Regression",
    tasks: ["classification"],
    description: "Multinomial (softmax) logistic regression trained with gradient descent.",
    hyperparameters: [
      { key: "learningRate", label: "Learning rate", type: "number", default: 0.1, min: 0.001, max: 1, step: 0.001 },
      { key: "epochs", label: "Epochs", type: "number", default: 300, min: 10, max: 5000, step: 10 },
      { key: "l2", label: "L2 penalty", type: "number", default: 0.001, min: 0, max: 1, step: 0.001 },
    ],
  },
  {
    id: "knn",
    name: "k-Nearest Neighbours",
    tasks: ["classification", "regression"],
    description: "Predicts from the k closest training rows (Euclidean distance on scaled features).",
    hyperparameters: [{ key: "k", label: "Neighbours (k)", type: "number", default: 5, min: 1, max: 50, step: 1 }],
  },
  {
    id: "decision_tree",
    name: "Decision Tree",
    tasks: ["classification", "regression"],
    description: "CART tree (Gini for classification, variance for regression).",
    hyperparameters: [
      { key: "maxDepth", label: "Max depth", type: "number", default: 8, min: 1, max: 30, step: 1 },
      { key: "minSamplesSplit", label: "Min samples to split", type: "number", default: 4, min: 2, max: 100, step: 1 },
    ],
  },
  {
    id: "random_forest",
    name: "Random Forest",
    tasks: ["classification", "regression"],
    description: "Bagged ensemble of decision trees with random feature subsets.",
    hyperparameters: [
      { key: "nEstimators", label: "Trees", type: "number", default: 50, min: 5, max: 300, step: 5 },
      { key: "maxDepth", label: "Max depth", type: "number", default: 10, min: 1, max: 30, step: 1 },
      { key: "minSamplesSplit", label: "Min samples to split", type: "number", default: 4, min: 2, max: 100, step: 1 },
    ],
  },
  {
    id: "gradient_boosting",
    name: "Gradient Boosting",
    tasks: ["classification", "regression"],
    backends: ["sklearn"],
    description: "scikit-learn HistGradientBoosting — strong default for tabular data.",
    hyperparameters: [
      { key: "nEstimators", label: "Boosting iterations", type: "number", default: 200, min: 10, max: 1000, step: 10 },
      { key: "learningRate", label: "Learning rate", type: "number", default: 0.1, min: 0.01, max: 1, step: 0.01 },
      { key: "maxDepth", label: "Max depth (0 = unlimited)", type: "number", default: 6, min: 0, max: 30, step: 1 },
    ],
  },
  {
    id: "svm",
    name: "Support Vector Machine",
    tasks: ["classification", "regression"],
    backends: ["sklearn"],
    description: "scikit-learn SVC/SVR with an RBF, linear or polynomial kernel.",
    hyperparameters: [
      { key: "C", label: "Regularisation (C)", type: "number", default: 1, min: 0.01, max: 100, step: 0.01 },
      { key: "kernel", label: "Kernel", type: "select", default: "rbf", options: ["rbf", "linear", "poly"] },
    ],
  },
  {
    id: "naive_bayes",
    name: "Gaussian Naive Bayes",
    tasks: ["classification"],
    description: "Probabilistic classifier assuming independent, normally distributed features.",
    hyperparameters: [],
  },
  {
    id: "kmeans",
    name: "k-Means",
    tasks: ["clustering"],
    description: "Partitions rows into k clusters (k-means++ initialisation).",
    hyperparameters: [
      { key: "k", label: "Clusters (k)", type: "number", default: 3, min: 2, max: 20, step: 1 },
      { key: "maxIterations", label: "Max iterations", type: "number", default: 100, min: 10, max: 1000, step: 10 },
    ],
  },
]

export function algorithmsFor(task: TaskType, backend: Backend = "typescript"): AlgorithmInfo[] {
  return ALGORITHMS.filter((a) => a.tasks.includes(task) && (a.backends ?? ["typescript", "sklearn"]).includes(backend))
}

export function getAlgorithm(id: AlgorithmId): AlgorithmInfo {
  const info = ALGORITHMS.find((a) => a.id === id)
  if (!info) throw new Error(`Unknown algorithm "${id}"`)
  return info
}

export function defaultHyperparameters(id: AlgorithmId): Hyperparameters {
  return Object.fromEntries(getAlgorithm(id).hyperparameters.map((h) => [h.key, h.default]))
}

function num(hp: Hyperparameters, key: string, fallback: number): number {
  const v = Number(hp[key])
  return Number.isFinite(v) ? v : fallback
}

function argmax(values: readonly number[]): number {
  let best = 0
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i
  return best
}

// ---------------------------------------------------------------------------
// Linear regression
// ---------------------------------------------------------------------------

/** Solve A·x = b by Gaussian elimination with partial pivoting. */
export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r
    if (Math.abs(M[pivot][col]) < 1e-12) continue
    ;[M[col], M[pivot]] = [M[pivot], M[col]]
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const factor = M[r][col] / M[col][col]
      if (factor === 0) continue
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c]
    }
  }
  return M.map((row, i) => (Math.abs(row[i]) < 1e-12 ? 0 : row[n] / row[i]))
}

class LinearRegression implements Estimator {
  weights: number[] = []
  intercept = 0
  constructor(private alpha = 0) {}

  fit(X: number[][], y: number[]) {
    const d = X[0]?.length ?? 0
    const p = d + 1
    const XtX = Array.from({ length: p }, () => new Array<number>(p).fill(0))
    const Xty = new Array<number>(p).fill(0)
    for (let i = 0; i < X.length; i++) {
      const row = [1, ...X[i]]
      for (let a = 0; a < p; a++) {
        Xty[a] += row[a] * y[i]
        for (let b = a; b < p; b++) XtX[a][b] += row[a] * row[b]
      }
    }
    for (let a = 0; a < p; a++) for (let b = 0; b < a; b++) XtX[a][b] = XtX[b][a]
    // Tiny ridge on all coefficients keeps singular systems (collinear features) solvable.
    for (let a = 1; a < p; a++) XtX[a][a] += this.alpha + 1e-8
    const w = solveLinearSystem(XtX, Xty)
    this.intercept = w[0]
    this.weights = w.slice(1)
  }

  predict(X: number[][]) {
    return X.map((row) => row.reduce((acc, v, i) => acc + v * this.weights[i], this.intercept))
  }

  toJSON() {
    return { weights: this.weights, intercept: this.intercept, alpha: this.alpha }
  }
}

// ---------------------------------------------------------------------------
// Logistic regression (softmax)
// ---------------------------------------------------------------------------

function softmax(z: number[]): number[] {
  const max = Math.max(...z)
  const e = z.map((v) => Math.exp(v - max))
  const s = e.reduce((a, b) => a + b, 0)
  return e.map((v) => v / s)
}

class LogisticRegression implements Estimator {
  W: number[][] = []
  b: number[] = []
  constructor(
    private nClasses: number,
    private learningRate = 0.1,
    private epochs = 300,
    private l2 = 0.001,
  ) {}

  private logits(row: number[]): number[] {
    return this.W.map((w, k) => row.reduce((acc, v, j) => acc + v * w[j], this.b[k]))
  }

  fit(X: number[][], y: number[]) {
    const n = X.length
    const d = X[0]?.length ?? 0
    const K = this.nClasses
    this.W = Array.from({ length: K }, () => new Array<number>(d).fill(0))
    this.b = new Array<number>(K).fill(0)
    for (let epoch = 0; epoch < this.epochs; epoch++) {
      const gW = Array.from({ length: K }, () => new Array<number>(d).fill(0))
      const gb = new Array<number>(K).fill(0)
      for (let i = 0; i < n; i++) {
        const p = softmax(this.logits(X[i]))
        for (let k = 0; k < K; k++) {
          const err = p[k] - (y[i] === k ? 1 : 0)
          gb[k] += err
          for (let j = 0; j < d; j++) gW[k][j] += err * X[i][j]
        }
      }
      for (let k = 0; k < K; k++) {
        this.b[k] -= (this.learningRate * gb[k]) / n
        for (let j = 0; j < d; j++) this.W[k][j] -= this.learningRate * (gW[k][j] / n + this.l2 * this.W[k][j])
      }
    }
  }

  predictProba(X: number[][]) {
    return X.map((row) => softmax(this.logits(row)))
  }

  predict(X: number[][]) {
    return this.predictProba(X).map(argmax)
  }

  toJSON() {
    return { W: this.W, b: this.b, nClasses: this.nClasses }
  }
}

// ---------------------------------------------------------------------------
// k-nearest neighbours
// ---------------------------------------------------------------------------

class KNN implements Estimator {
  X: number[][] = []
  y: number[] = []
  constructor(
    private task: TaskType,
    private k = 5,
    private nClasses = 0,
  ) {}

  fit(X: number[][], y: number[]) {
    this.X = X
    this.y = y
  }

  private neighbours(row: number[]): number[] {
    const k = Math.min(this.k, this.X.length)
    const dist = this.X.map((x, i) => ({ d: squaredDistance(x, row), i }))
    dist.sort((a, b) => a.d - b.d)
    return dist.slice(0, k).map((e) => this.y[e.i])
  }

  predictProba(X: number[][]) {
    return X.map((row) => {
      const counts = new Array<number>(this.nClasses).fill(0)
      const nb = this.neighbours(row)
      for (const label of nb) counts[label]++
      return counts.map((c) => c / nb.length)
    })
  }

  predict(X: number[][]) {
    if (this.task === "classification") return this.predictProba(X).map(argmax)
    return X.map((row) => {
      const nb = this.neighbours(row)
      return nb.reduce((a, b) => a + b, 0) / nb.length
    })
  }

  toJSON() {
    return { X: this.X, y: this.y, k: this.k, nClasses: this.nClasses }
  }
}

// ---------------------------------------------------------------------------
// CART decision tree
// ---------------------------------------------------------------------------

type TreeNode = { f: number; t: number; l: TreeNode; r: TreeNode } | { v: number[] }

interface TreeOptions {
  task: TaskType
  nClasses: number
  maxDepth: number
  minSamplesSplit: number
  /** Number of features considered per split (random forests). */
  maxFeatures?: number
  rng?: () => number
}

const MAX_THRESHOLDS = 32

function leafValue(y: readonly number[], idx: readonly number[], opts: TreeOptions): number[] {
  if (opts.task === "classification") {
    const counts = new Array<number>(opts.nClasses).fill(0)
    for (const i of idx) counts[y[i]]++
    return counts.map((c) => c / idx.length)
  }
  let s = 0
  for (const i of idx) s += y[i]
  return [s / idx.length]
}

function impurity(stats: number[], n: number, task: TaskType, sumSq?: number): number {
  if (n === 0) return 0
  if (task === "classification") {
    let g = 1
    for (const c of stats) g -= (c / n) ** 2
    return g
  }
  const m = stats[0] / n
  return (sumSq ?? 0) / n - m * m
}

function buildTree(X: number[][], y: number[], idx: number[], depth: number, opts: TreeOptions): TreeNode {
  const pure = opts.task === "classification" && idx.every((i) => y[i] === y[idx[0]])
  if (depth >= opts.maxDepth || idx.length < opts.minSamplesSplit || pure) return { v: leafValue(y, idx, opts) }

  const d = X[0].length
  const features = Array.from({ length: d }, (_, j) => j)
  // Random forests visit features in random order and stop once `maxFeatures`
  // features with at least one valid split were evaluated (like scikit-learn).
  const budget = opts.maxFeatures && opts.maxFeatures < d && opts.rng ? opts.maxFeatures : d
  if (budget < d) {
    const rng = opts.rng!
    for (let i = d - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[features[i], features[j]] = [features[j], features[i]]
    }
  }
  let evaluated = 0

  let best = { gain: 0, f: -1, t: 0 }
  const n = idx.length
  const parentStats =
    opts.task === "classification" ? leafValue(y, idx, opts).map((p) => p * n) : [idx.reduce((a, i) => a + y[i], 0)]
  const parentSq = opts.task === "regression" ? idx.reduce((a, i) => a + y[i] * y[i], 0) : undefined
  const parentImp = impurity(parentStats, n, opts.task, parentSq)

  for (const f of features) {
    if (evaluated >= budget) break
    let splittable = false
    const sorted = [...idx].sort((a, b) => X[a][f] - X[b][f])
    const step = Math.max(1, Math.floor(n / MAX_THRESHOLDS))
    const left = opts.task === "classification" ? new Array<number>(opts.nClasses).fill(0) : [0]
    let leftSq = 0
    let cursor = 0
    for (let cut = step; cut < n; cut += step) {
      for (; cursor < cut; cursor++) {
        const i = sorted[cursor]
        if (opts.task === "classification") left[y[i]]++
        else {
          left[0] += y[i]
          leftSq += y[i] * y[i]
        }
      }
      const lo = X[sorted[cut - 1]][f]
      const hi = X[sorted[cut]][f]
      if (lo === hi) continue
      splittable = true
      const right = parentStats.map((s, k) => s - left[k])
      const nl = cut
      const nr = n - cut
      const imp =
        (nl / n) * impurity(left, nl, opts.task, leftSq) +
        (nr / n) * impurity(right, nr, opts.task, parentSq === undefined ? undefined : parentSq - leftSq)
      const gain = parentImp - imp
      if (gain > best.gain + 1e-12) best = { gain, f, t: (lo + hi) / 2 }
    }
    if (splittable) evaluated++
  }

  if (best.f === -1) return { v: leafValue(y, idx, opts) }
  const l = idx.filter((i) => X[i][best.f] <= best.t)
  const r = idx.filter((i) => X[i][best.f] > best.t)
  return { f: best.f, t: best.t, l: buildTree(X, y, l, depth + 1, opts), r: buildTree(X, y, r, depth + 1, opts) }
}

function walk(node: TreeNode, row: number[]): number[] {
  let cur = node
  while (!("v" in cur)) cur = row[cur.f] <= cur.t ? cur.l : cur.r
  return cur.v
}

class DecisionTree implements Estimator {
  root: TreeNode = { v: [0] }
  constructor(private opts: TreeOptions) {}

  fit(X: number[][], y: number[], idx: number[] = X.map((_, i) => i)) {
    this.root = buildTree(X, y, idx, 0, this.opts)
  }

  predictProba(X: number[][]) {
    return X.map((row) => walk(this.root, row))
  }

  predict(X: number[][]) {
    const out = this.predictProba(X)
    return this.opts.task === "classification" ? out.map(argmax) : out.map((v) => v[0])
  }

  toJSON() {
    return { root: this.root, task: this.opts.task, nClasses: this.opts.nClasses }
  }
}

class RandomForest implements Estimator {
  trees: DecisionTree[] = []
  constructor(
    private opts: TreeOptions,
    private nEstimators = 50,
    private seed = 42,
  ) {}

  fit(X: number[][], y: number[]) {
    const rng = createRng(this.seed)
    const d = X[0]?.length ?? 1
    // sqrt(d) for classification, all features for regression (scikit-learn defaults)
    const maxFeatures = this.opts.task === "classification" ? Math.max(1, Math.round(Math.sqrt(d))) : d
    this.trees = []
    for (let t = 0; t < this.nEstimators; t++) {
      const idx = Array.from({ length: X.length }, () => Math.floor(rng() * X.length))
      const tree = new DecisionTree({ ...this.opts, maxFeatures, rng })
      tree.fit(X, y, idx)
      this.trees.push(tree)
    }
  }

  predictProba(X: number[][]) {
    const all = this.trees.map((t) => t.predictProba(X))
    return X.map((_, i) => {
      const acc = new Array<number>(all[0][i].length).fill(0)
      for (const p of all) p[i].forEach((v, k) => (acc[k] += v / all.length))
      return acc
    })
  }

  predict(X: number[][]) {
    const out = this.predictProba(X)
    return this.opts.task === "classification" ? out.map(argmax) : out.map((v) => v[0])
  }

  toJSON() {
    return { trees: this.trees.map((t) => t.toJSON()), task: this.opts.task, nClasses: this.opts.nClasses }
  }
}

// ---------------------------------------------------------------------------
// Gaussian naive Bayes
// ---------------------------------------------------------------------------

class GaussianNB implements Estimator {
  means: number[][] = []
  vars: number[][] = []
  priors: number[] = []
  constructor(private nClasses: number) {}

  fit(X: number[][], y: number[]) {
    const d = X[0]?.length ?? 0
    const K = this.nClasses
    const counts = new Array<number>(K).fill(0)
    this.means = Array.from({ length: K }, () => new Array<number>(d).fill(0))
    this.vars = Array.from({ length: K }, () => new Array<number>(d).fill(0))
    X.forEach((row, i) => {
      counts[y[i]]++
      row.forEach((v, j) => (this.means[y[i]][j] += v))
    })
    for (let k = 0; k < K; k++) for (let j = 0; j < d; j++) this.means[k][j] /= counts[k] || 1
    X.forEach((row, i) => row.forEach((v, j) => (this.vars[y[i]][j] += (v - this.means[y[i]][j]) ** 2)))
    let maxVar = 0
    for (let k = 0; k < K; k++)
      for (let j = 0; j < d; j++) {
        this.vars[k][j] /= counts[k] || 1
        maxVar = Math.max(maxVar, this.vars[k][j])
      }
    const eps = 1e-9 * Math.max(maxVar, 1)
    for (let k = 0; k < K; k++) for (let j = 0; j < d; j++) this.vars[k][j] += eps
    this.priors = counts.map((c) => c / X.length)
  }

  predictProba(X: number[][]) {
    return X.map((row) => {
      const logp = this.priors.map((prior, k) => {
        if (prior === 0) return -Infinity
        let lp = Math.log(prior)
        row.forEach((v, j) => {
          const vr = this.vars[k][j]
          lp += -0.5 * Math.log(2 * Math.PI * vr) - (v - this.means[k][j]) ** 2 / (2 * vr)
        })
        return lp
      })
      return softmax(logp)
    })
  }

  predict(X: number[][]) {
    return this.predictProba(X).map(argmax)
  }

  toJSON() {
    return { means: this.means, vars: this.vars, priors: this.priors, nClasses: this.nClasses }
  }
}

// ---------------------------------------------------------------------------
// k-means
// ---------------------------------------------------------------------------

export class KMeans implements Estimator {
  centroids: number[][] = []
  inertia = 0
  constructor(
    private k = 3,
    private maxIterations = 100,
    private seed = 42,
  ) {}

  fit(X: number[][]) {
    const rng = createRng(this.seed)
    const k = Math.min(this.k, X.length)
    // k-means++ seeding
    this.centroids = [X[Math.floor(rng() * X.length)]]
    while (this.centroids.length < k) {
      const d2 = X.map((x) => Math.min(...this.centroids.map((c) => squaredDistance(x, c))))
      const total = d2.reduce((a, b) => a + b, 0)
      let r = rng() * total
      let next = 0
      for (; next < X.length - 1 && r > d2[next]; next++) r -= d2[next]
      this.centroids.push(X[next])
    }
    this.centroids = this.centroids.map((c) => [...c])

    let labels = new Array<number>(X.length).fill(-1)
    for (let iter = 0; iter < this.maxIterations; iter++) {
      const next = this.predict(X)
      const changed = next.some((l, i) => l !== labels[i])
      labels = next
      const d = X[0].length
      const sums = Array.from({ length: k }, () => new Array<number>(d).fill(0))
      const counts = new Array<number>(k).fill(0)
      X.forEach((x, i) => {
        counts[labels[i]]++
        x.forEach((v, j) => (sums[labels[i]][j] += v))
      })
      this.centroids = this.centroids.map((c, ci) => (counts[ci] ? sums[ci].map((s) => s / counts[ci]) : c))
      if (!changed) break
    }
    this.inertia = X.reduce((acc, x, i) => acc + squaredDistance(x, this.centroids[labels[i]]), 0)
  }

  predict(X: number[][]) {
    return X.map((x) => {
      let best = 0
      let bestD = Infinity
      this.centroids.forEach((c, i) => {
        const d = squaredDistance(x, c)
        if (d < bestD) {
          bestD = d
          best = i
        }
      })
      return best
    })
  }

  toJSON() {
    return { centroids: this.centroids, inertia: this.inertia }
  }
}

// ---------------------------------------------------------------------------
// Factory / (de)serialization
// ---------------------------------------------------------------------------

export function createEstimator(
  algorithm: AlgorithmId,
  task: TaskType,
  hp: Hyperparameters,
  nClasses: number,
  seed: number,
): Estimator {
  const treeOpts = (): TreeOptions => ({
    task,
    nClasses,
    maxDepth: num(hp, "maxDepth", 8),
    minSamplesSplit: num(hp, "minSamplesSplit", 4),
  })
  switch (algorithm) {
    case "linear_regression":
      return new LinearRegression(num(hp, "alpha", 0))
    case "logistic_regression":
      return new LogisticRegression(
        nClasses,
        num(hp, "learningRate", 0.1),
        num(hp, "epochs", 300),
        num(hp, "l2", 0.001),
      )
    case "knn":
      return new KNN(task, num(hp, "k", 5), nClasses)
    case "decision_tree":
      return new DecisionTree(treeOpts())
    case "random_forest":
      return new RandomForest(treeOpts(), num(hp, "nEstimators", 50), seed)
    case "naive_bayes":
      return new GaussianNB(nClasses)
    case "kmeans":
      return new KMeans(num(hp, "k", 3), num(hp, "maxIterations", 100), seed)
    default:
      throw new Error(`${algorithm} is only available with the scikit-learn backend.`)
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any -- state is validated by construction */
export function restoreEstimator(algorithm: AlgorithmId, task: TaskType, state: any): Estimator {
  switch (algorithm) {
    case "linear_regression":
      return Object.assign(new LinearRegression(state.alpha), state)
    case "logistic_regression":
      return Object.assign(new LogisticRegression(state.nClasses), { W: state.W, b: state.b })
    case "knn":
      return Object.assign(new KNN(task, state.k, state.nClasses), { X: state.X, y: state.y })
    case "decision_tree":
      return Object.assign(new DecisionTree({ task, nClasses: state.nClasses, maxDepth: 0, minSamplesSplit: 0 }), {
        root: state.root,
      })
    case "random_forest": {
      const forest = new RandomForest({ task, nClasses: state.nClasses, maxDepth: 0, minSamplesSplit: 0 })
      forest.trees = state.trees.map((t: any) => restoreEstimator("decision_tree", task, t))
      return forest
    }
    case "naive_bayes":
      return Object.assign(new GaussianNB(state.nClasses), state)
    case "kmeans":
      return Object.assign(new KMeans(state.centroids.length), state)
    default:
      throw new Error(`${algorithm} models can only be restored in the Python runtime.`)
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

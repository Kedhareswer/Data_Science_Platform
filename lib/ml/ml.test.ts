import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { parseDelimitedText } from "@/lib/data/parse"
import type { DataRow } from "@/lib/data/types"
import { solveLinearSystem } from "./algorithms"
import { predictWithModel, runAutoML, suggestTask, trainModel, TrainingError } from "./engine"
import { classificationMetrics, r2Score, rocAuc } from "./metrics"
import { createRng, trainTestSplit } from "./random"
import type { AlgorithmId } from "./types"

const iris = parseDelimitedText(readFileSync(new URL("../../public/samples/iris.csv", import.meta.url), "utf8"))
const irisFeatures = ["sepal.length", "sepal.width", "petal.length", "petal.width"]

function linearRows(n = 200): DataRow[] {
  const rng = createRng(7)
  return Array.from({ length: n }, () => {
    const a = rng() * 10
    const b = rng() * 5
    const color = rng() > 0.5 ? "red" : "blue"
    return { a, b, color, y: 3 * a - 2 * b + (color === "red" ? 5 : 0) + (rng() - 0.5) * 0.1 }
  })
}

describe("metrics", () => {
  it("computes AUC with ties and a perfect ranking", () => {
    expect(rocAuc([0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8])).toBeCloseTo(0.75)
    expect(rocAuc([0, 1], [0.2, 0.9])).toBe(1)
    expect(rocAuc([0, 1, 1], [0.5, 0.5, 0.5])).toBe(0.5)
  })

  it("handles a constant target in R²", () => {
    expect(r2Score([2, 2, 2], [2, 2, 2])).toBe(1)
    expect(r2Score([2, 2, 2], [1, 2, 3])).toBe(0)
  })

  it("macro-averages multiclass precision/recall", () => {
    const m = classificationMetrics([0, 1, 2, 2], [0, 2, 2, 2], 3)
    expect(m.accuracy).toBe(0.75)
    expect(m.confusionMatrix).toEqual([
      [1, 0, 0],
      [0, 0, 1],
      [0, 0, 2],
    ])
    expect(m.recall).toBeCloseTo((1 + 0 + 1) / 3)
  })
})

describe("splitting", () => {
  it("is reproducible and stratified", () => {
    const labels = Array.from({ length: 100 }, (_, i) => (i < 90 ? "a" : "b"))
    const s1 = trainTestSplit(100, 0.2, createRng(1), labels)
    const s2 = trainTestSplit(100, 0.2, createRng(1), labels)
    expect(s1).toEqual(s2)
    expect(s1.test).toHaveLength(20)
    expect(s1.test.filter((i) => labels[i] === "b")).toHaveLength(2)
  })

  it("solves linear systems", () => {
    expect(
      solveLinearSystem(
        [
          [2, 1],
          [1, 3],
        ],
        [3, 5],
      ).map((v) => +v.toFixed(6)),
    ).toEqual([0.8, 1.4])
  })
})

describe("classification on iris", () => {
  const algorithms: AlgorithmId[] = ["logistic_regression", "knn", "decision_tree", "random_forest", "naive_bayes"]
  for (const algorithm of algorithms) {
    it(`${algorithm} reaches > 85% held-out accuracy`, () => {
      const model = trainModel(iris.rows, {
        task: "classification",
        algorithm,
        features: irisFeatures,
        target: "variety",
      })
      expect(model.classes).toEqual(["Setosa", "Versicolor", "Virginica"])
      expect(model.testRows).toBe(30)
      expect(model.metrics.accuracy).toBeGreaterThan(0.85)
      expect(model.featureImportance.length).toBe(4)
      // round-trips through JSON (export/import)
      const restored = JSON.parse(JSON.stringify(model))
      const [p] = predictWithModel(restored, [
        { "sepal.length": 5.1, "sepal.width": 3.5, "petal.length": 1.4, "petal.width": 0.2 },
      ])
      expect(p.value).toBe("Setosa")
      expect(p.confidence).toBeGreaterThan(0.5)
    })
  }

  it("ranks petal features as most important", () => {
    const model = trainModel(iris.rows, {
      task: "classification",
      algorithm: "random_forest",
      features: irisFeatures,
      target: "variety",
    })
    expect(model.featureImportance[0].feature).toMatch(/^petal/)
  })
})

describe("regression", () => {
  it("recovers a linear relationship including a categorical feature", () => {
    const rows = linearRows()
    const model = trainModel(rows, {
      task: "regression",
      algorithm: "linear_regression",
      features: ["a", "b", "color"],
      target: "y",
    })
    expect(model.metrics.r2Score).toBeGreaterThan(0.999)
    const [p] = predictWithModel(model, [{ a: 1, b: 1, color: "red" }])
    expect(p.value as number).toBeCloseTo(6, 0)
  })

  it("trees and forests regress on continuous targets", () => {
    const rows = linearRows(300)
    for (const algorithm of ["decision_tree", "random_forest", "knn"] as const) {
      const model = trainModel(rows, { task: "regression", algorithm, features: ["a", "b", "color"], target: "y" })
      expect(model.metrics.r2Score).toBeGreaterThan(0.8)
    }
  })
})

describe("clustering & automl", () => {
  it("k-means finds three iris clusters", () => {
    const model = trainModel(iris.rows, {
      task: "clustering",
      algorithm: "kmeans",
      features: irisFeatures,
      hyperparameters: { k: 3 },
    })
    expect(model.metrics.clusterSizes).toHaveLength(3)
    expect(model.metrics.silhouette).toBeGreaterThan(0.3)
  })

  it("runs AutoML and returns a sorted leaderboard", async () => {
    const result = await runAutoML(iris.rows, { task: "classification", features: irisFeatures, target: "variety" })
    expect(result.failures).toEqual([])
    expect(result.leaderboard.length).toBeGreaterThanOrEqual(5)
    const scores = result.leaderboard.map((m) => m.metrics.f1Score!)
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)
  })

  it("validates configuration", () => {
    expect(() =>
      trainModel(iris.rows, {
        task: "regression",
        algorithm: "linear_regression",
        features: irisFeatures,
        target: "variety",
      }),
    ).toThrow(TrainingError)
    expect(() =>
      trainModel(iris.rows, { task: "classification", algorithm: "knn", features: [], target: "variety" }),
    ).toThrow(/feature/)
    expect(suggestTask(iris.rows, "variety")).toBe("classification")
    expect(suggestTask(linearRows(), "y")).toBe("regression")
  })
})

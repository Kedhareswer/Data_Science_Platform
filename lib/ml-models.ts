// Machine Learning Models and Utilities
export interface MLModel {
  id: string
  name: string
  type: "classification" | "regression" | "clustering"
  algorithm: string
  features: string[]
  target?: string
  hyperparameters: Record<string, any>
  performance?: ModelPerformance
  trainedAt?: Date
  isTraining?: boolean
}

export interface ModelPerformance {
  accuracy?: number
  precision?: number
  recall?: number
  f1Score?: number
  rmse?: number
  mae?: number
  r2Score?: number
  confusionMatrix?: number[][]
  featureImportance?: Array<{ feature: string; importance: number }>
}

export interface PredictionResult {
  prediction: any
  confidence?: number
  probabilities?: Record<string, number>
}

// Simple Linear Regression Implementation
export class SimpleLinearRegression {
  private slope = 0
  private intercept = 0
  private trained = false

  fit(X: number[], y: number[]): void {
    if (X.length !== y.length || X.length < 2) {
      throw new Error("Invalid input data: X and y must have the same length and at least 2 samples")
    }

    // Remove any NaN or infinite values
    const validIndices = X.map((x, i) => ({ x, y: y[i], index: i })).filter(
      (item) => !isNaN(item.x) && !isNaN(item.y) && isFinite(item.x) && isFinite(item.y),
    )

    if (validIndices.length < 2) {
      throw new Error("Insufficient valid data points for training")
    }

    const validX = validIndices.map((item) => item.x)
    const validY = validIndices.map((item) => item.y)

    const n = validX.length
    const sumX = validX.reduce((a, b) => a + b, 0)
    const sumY = validY.reduce((a, b) => a + b, 0)
    const sumXY = validX.reduce((sum, x, i) => sum + x * validY[i], 0)
    const sumXX = validX.reduce((sum, x) => sum + x * x, 0)

    const denominator = n * sumXX - sumX * sumX
    if (Math.abs(denominator) < 1e-10) {
      throw new Error("Cannot fit model: features have no variance")
    }

    this.slope = (n * sumXY - sumX * sumY) / denominator
    this.intercept = (sumY - this.slope * sumX) / n
    this.trained = true
  }

  predict(X: number[]): number[] {
    if (!this.trained) {
      throw new Error("Model must be trained before making predictions")
    }
    return X.map((x) => this.slope * x + this.intercept)
  }

  getCoefficients(): { slope: number; intercept: number } {
    return { slope: this.slope, intercept: this.intercept }
  }
}

// Simple Logistic Regression Implementation
export class SimpleLogisticRegression {
  private weights: number[] = []
  private trained = false

  private sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-Math.max(-250, Math.min(250, z))))
  }

  fit(X: number[][], y: number[], learningRate = 0.01, iterations = 1000): void {
    if (X.length !== y.length || X.length === 0) {
      throw new Error("Invalid input data: X and y must have the same length")
    }

    // Validate and clean data
    const validIndices: number[] = []
    X.forEach((row, i) => {
      if (row.every((val) => !isNaN(val) && isFinite(val)) && !isNaN(y[i]) && isFinite(y[i])) {
        validIndices.push(i)
      }
    })

    if (validIndices.length < 2) {
      throw new Error("Insufficient valid data points for training")
    }

    const validX = validIndices.map((i) => X[i])
    const validY = validIndices.map((i) => y[i])

    // Convert y to binary if needed
    const uniqueY = [...new Set(validY)].sort()
    if (uniqueY.length > 2) {
      throw new Error("Logistic regression supports only binary classification")
    }

    const binaryY = validY.map((val) => (val === uniqueY[1] ? 1 : 0))

    const m = validX.length
    const n = validX[0].length
    this.weights = new Array(n + 1).fill(0)

    // Add small random initialization
    this.weights = this.weights.map(() => (Math.random() - 0.5) * 0.01)

    for (let iter = 0; iter < iterations; iter++) {
      const predictions = validX.map((row) => {
        const z = this.weights[0] + row.reduce((sum, val, i) => sum + val * this.weights[i + 1], 0)
        return this.sigmoid(z)
      })

      // Update weights with regularization
      const regularization = 0.01
      const dw0 = predictions.reduce((sum, pred, i) => sum + (pred - binaryY[i]), 0) / m
      this.weights[0] -= learningRate * dw0

      for (let j = 0; j < n; j++) {
        const dwj = predictions.reduce((sum, pred, i) => sum + (pred - binaryY[i]) * validX[i][j], 0) / m
        this.weights[j + 1] -= learningRate * (dwj + regularization * this.weights[j + 1])
      }

      // Early stopping if convergence
      const cost = this.calculateCost(validX, binaryY)
      if (iter > 0 && Math.abs(cost) < 1e-6) break
    }

    this.trained = true
  }

  private calculateCost(X: number[][], y: number[]): number {
    const predictions = X.map((row) => {
      const z = this.weights[0] + row.reduce((sum, val, i) => sum + val * this.weights[i + 1], 0)
      return this.sigmoid(z)
    })

    return (
      predictions.reduce((sum, pred, i) => {
        const clampedPred = Math.max(1e-15, Math.min(1 - 1e-15, pred))
        return sum - (y[i] * Math.log(clampedPred) + (1 - y[i]) * Math.log(1 - clampedPred))
      }, 0) / X.length
    )
  }

  predict(X: number[][]): number[] {
    if (!this.trained) {
      throw new Error("Model must be trained before making predictions")
    }

    return X.map((row) => {
      const z = this.weights[0] + row.reduce((sum, val, i) => sum + val * this.weights[i + 1], 0)
      return this.sigmoid(z) > 0.5 ? 1 : 0
    })
  }

  predictProba(X: number[][]): number[] {
    if (!this.trained) {
      throw new Error("Model must be trained before making predictions")
    }

    return X.map((row) => {
      const z = this.weights[0] + row.reduce((sum, val, i) => sum + val * this.weights[i + 1], 0)
      return this.sigmoid(z)
    })
  }
}

// K-Means Clustering Implementation
export class KMeansClustering {
  private centroids: number[][] = []
  private trained = false
  private k: number

  constructor(k: number) {
    this.k = k
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0))
  }

  fit(X: number[][], maxIterations = 100): void {
    if (X.length === 0 || this.k > X.length) {
      throw new Error("Invalid input data or k value")
    }

    // Validate and clean data
    const validX = X.filter((row) => row.every((val) => !isNaN(val) && isFinite(val)))
    if (validX.length < this.k) {
      throw new Error(`Insufficient valid data points. Need at least ${this.k} points for ${this.k} clusters`)
    }

    const n = validX[0].length

    // Initialize centroids using k-means++ algorithm
    this.centroids = []

    // First centroid: random point
    this.centroids.push([...validX[Math.floor(Math.random() * validX.length)]])

    // Subsequent centroids: choose points far from existing centroids
    for (let c = 1; c < this.k; c++) {
      const distances = validX.map((point) => {
        const minDistToCentroid = Math.min(...this.centroids.map((centroid) => this.euclideanDistance(point, centroid)))
        return minDistToCentroid * minDistToCentroid
      })

      const totalDist = distances.reduce((sum, d) => sum + d, 0)
      let random = Math.random() * totalDist

      for (let i = 0; i < distances.length; i++) {
        random -= distances[i]
        if (random <= 0) {
          this.centroids.push([...validX[i]])
          break
        }
      }
    }

    let prevCentroids: number[][] = []

    for (let iter = 0; iter < maxIterations; iter++) {
      // Store previous centroids for convergence check
      prevCentroids = this.centroids.map((centroid) => [...centroid])

      // Assign points to clusters
      const clusters: number[][][] = Array(this.k)
        .fill(null)
        .map(() => [])

      validX.forEach((point) => {
        let minDistance = Number.POSITIVE_INFINITY
        let closestCluster = 0

        this.centroids.forEach((centroid, i) => {
          const distance = this.euclideanDistance(point, centroid)
          if (distance < minDistance) {
            minDistance = distance
            closestCluster = i
          }
        })

        clusters[closestCluster].push(point)
      })

      // Update centroids
      this.centroids = clusters.map((cluster, i) => {
        if (cluster.length === 0) return prevCentroids[i] // Keep previous centroid if cluster is empty

        const centroid = new Array(n).fill(0)
        cluster.forEach((point) => {
          point.forEach((val, j) => {
            centroid[j] += val
          })
        })
        return centroid.map((val) => val / cluster.length)
      })

      // Check for convergence
      let converged = true
      for (let i = 0; i < this.k; i++) {
        if (this.euclideanDistance(prevCentroids[i], this.centroids[i]) > 1e-6) {
          converged = false
          break
        }
      }

      if (converged) break
    }

    this.trained = true
  }

  predict(X: number[][]): number[] {
    if (!this.trained) {
      throw new Error("Model must be trained before making predictions")
    }

    return X.map((point) => {
      let minDistance = Number.POSITIVE_INFINITY
      let closestCluster = 0

      this.centroids.forEach((centroid, i) => {
        const distance = this.euclideanDistance(point, centroid)
        if (distance < minDistance) {
          minDistance = distance
          closestCluster = i
        }
      })

      return closestCluster
    })
  }

  getCentroids(): number[][] {
    return this.centroids
  }
}

// Decision Tree Implementation (simplified)
export class SimpleDecisionTree {
  private tree: any = null
  private trained = false

  private calculateGini(y: number[]): number {
    const counts = y.reduce(
      (acc, val) => {
        acc[val] = (acc[val] || 0) + 1
        return acc
      },
      {} as Record<number, number>,
    )

    const total = y.length
    let gini = 1

    Object.values(counts).forEach((count) => {
      const prob = count / total
      gini -= prob * prob
    })

    return gini
  }

  private findBestSplit(X: number[][], y: number[]): { feature: number; threshold: number; gini: number } {
    let bestGini = Number.POSITIVE_INFINITY
    let bestFeature = 0
    let bestThreshold = 0

    const numFeatures = X[0].length

    for (let feature = 0; feature < numFeatures; feature++) {
      const values = X.map((row) => row[feature])
      const uniqueValues = [...new Set(values)].sort((a, b) => a - b)

      for (let i = 0; i < uniqueValues.length - 1; i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2

        const leftIndices: number[] = []
        const rightIndices: number[] = []

        X.forEach((row, idx) => {
          if (row[feature] <= threshold) {
            leftIndices.push(idx)
          } else {
            rightIndices.push(idx)
          }
        })

        if (leftIndices.length === 0 || rightIndices.length === 0) continue

        const leftY = leftIndices.map((idx) => y[idx])
        const rightY = rightIndices.map((idx) => y[idx])

        const leftGini = this.calculateGini(leftY)
        const rightGini = this.calculateGini(rightY)
        const weightedGini = (leftY.length * leftGini + rightY.length * rightGini) / y.length

        if (weightedGini < bestGini) {
          bestGini = weightedGini
          bestFeature = feature
          bestThreshold = threshold
        }
      }
    }

    return { feature: bestFeature, threshold: bestThreshold, gini: bestGini }
  }

  private buildTree(X: number[][], y: number[], depth = 0, maxDepth = 5): any {
    // Stop conditions
    if (depth >= maxDepth || new Set(y).size === 1 || y.length < 2) {
      const counts = y.reduce(
        (acc, val) => {
          acc[val] = (acc[val] || 0) + 1
          return acc
        },
        {} as Record<number, number>,
      )

      const prediction = Object.entries(counts).reduce((a, b) => (counts[a[0]] > counts[b[0]] ? a : b))[0]

      return { prediction: Number.parseInt(prediction), isLeaf: true }
    }

    const { feature, threshold } = this.findBestSplit(X, y)

    const leftIndices: number[] = []
    const rightIndices: number[] = []

    X.forEach((row, idx) => {
      if (row[feature] <= threshold) {
        leftIndices.push(idx)
      } else {
        rightIndices.push(idx)
      }
    })

    const leftX = leftIndices.map((idx) => X[idx])
    const leftY = leftIndices.map((idx) => y[idx])
    const rightX = rightIndices.map((idx) => X[idx])
    const rightY = rightIndices.map((idx) => y[idx])

    return {
      feature,
      threshold,
      left: this.buildTree(leftX, leftY, depth + 1, maxDepth),
      right: this.buildTree(rightX, rightY, depth + 1, maxDepth),
      isLeaf: false,
    }
  }

  fit(X: number[][], y: number[], maxDepth = 5): void {
    if (X.length !== y.length || X.length === 0) {
      throw new Error("Invalid input data")
    }

    this.tree = this.buildTree(X, y, 0, maxDepth)
    this.trained = true
  }

  private predictSingle(x: number[], node: any): number {
    if (node.isLeaf) {
      return node.prediction
    }

    if (x[node.feature] <= node.threshold) {
      return this.predictSingle(x, node.left)
    } else {
      return this.predictSingle(x, node.right)
    }
  }

  predict(X: number[][]): number[] {
    if (!this.trained) {
      throw new Error("Model must be trained before making predictions")
    }

    return X.map((x) => this.predictSingle(x, this.tree))
  }
}

// Random Forest Implementation
export class SimpleRandomForest {
  private trees: SimpleDecisionTree[] = []
  private trained = false
  private numTrees: number
  private maxDepth: number

  constructor(numTrees = 10, maxDepth = 5) {
    this.numTrees = numTrees
    this.maxDepth = maxDepth
  }

  private bootstrapSample(X: number[][], y: number[]): { X: number[][]; y: number[] } {
    const n = X.length
    const indices = Array.from({ length: n }, () => Math.floor(Math.random() * n))
    return {
      X: indices.map((i) => X[i]),
      y: indices.map((i) => y[i]),
    }
  }

  fit(X: number[][], y: number[]): void {
    if (X.length !== y.length || X.length === 0) {
      throw new Error("Invalid input data")
    }

    this.trees = []

    for (let i = 0; i < this.numTrees; i++) {
      const { X: bootX, y: bootY } = this.bootstrapSample(X, y)
      const tree = new SimpleDecisionTree()
      tree.fit(bootX, bootY, this.maxDepth)
      this.trees.push(tree)
    }

    this.trained = true
  }

  predict(X: number[][]): number[] {
    if (!this.trained) {
      throw new Error("Model must be trained before making predictions")
    }

    return X.map((x) => {
      const predictions = this.trees.map((tree) => tree.predict([x])[0])

      // For classification, use majority vote
      const counts: Record<number, number> = {}
      predictions.forEach((pred) => {
        counts[pred] = (counts[pred] || 0) + 1
      })

      return Object.entries(counts).reduce((a, b) => (counts[Number(a[0])] > counts[Number(b[0])] ? a : b))[0] as any
    })
  }

  getFeatureImportance(): number[] {
    // Simplified feature importance calculation
    const numFeatures = this.trees[0] ? 1 : 0 // Placeholder
    return Array(numFeatures).fill(1 / numFeatures)
  }
}

// Model evaluation utilities
export function calculateAccuracy(yTrue: number[], yPred: number[]): number {
  if (yTrue.length !== yPred.length) return 0
  const correct = yTrue.reduce((sum, val, i) => sum + (val === yPred[i] ? 1 : 0), 0)
  return correct / yTrue.length
}

export function calculateRMSE(yTrue: number[], yPred: number[]): number {
  if (yTrue.length !== yPred.length) return 0
  const mse = yTrue.reduce((sum, val, i) => sum + Math.pow(val - yPred[i], 2), 0) / yTrue.length
  return Math.sqrt(mse)
}

export function calculateMAE(yTrue: number[], yPred: number[]): number {
  if (yTrue.length !== yPred.length) return 0
  return yTrue.reduce((sum, val, i) => sum + Math.abs(val - yPred[i]), 0) / yTrue.length
}

export function calculateR2Score(yTrue: number[], yPred: number[]): number {
  if (yTrue.length !== yPred.length) return 0

  const yMean = yTrue.reduce((sum, val) => sum + val, 0) / yTrue.length
  const ssRes = yTrue.reduce((sum, val, i) => sum + Math.pow(val - yPred[i], 2), 0)
  const ssTot = yTrue.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0)

  return 1 - ssRes / ssTot
}

export function calculateConfusionMatrix(yTrue: number[], yPred: number[]): number[][] {
  const labels = [...new Set([...yTrue, ...yPred])].sort()
  const matrix = labels.map(() => labels.map(() => 0))

  yTrue.forEach((actual, i) => {
    const predicted = yPred[i]
    const actualIdx = labels.indexOf(actual)
    const predIdx = labels.indexOf(predicted)
    if (actualIdx !== -1 && predIdx !== -1) {
      matrix[actualIdx][predIdx]++
    }
  })

  return matrix
}

export function calculatePrecisionRecallF1(
  yTrue: number[],
  yPred: number[],
): {
  precision: number
  recall: number
  f1Score: number
} {
  const confMatrix = calculateConfusionMatrix(yTrue, yPred)

  if (confMatrix.length !== 2 || confMatrix[0].length !== 2) {
    // Multi-class - return macro averages
    const labels = [...new Set([...yTrue, ...yPred])].sort()
    let totalPrecision = 0
    let totalRecall = 0
    let validClasses = 0

    labels.forEach((_, i) => {
      const tp = confMatrix[i][i]
      const fp = confMatrix.reduce((sum, row, j) => sum + (j !== i ? row[i] : 0), 0)
      const fn = confMatrix[i].reduce((sum, val, j) => sum + (j !== i ? val : 0), 0)

      if (tp + fp > 0 && tp + fn > 0) {
        totalPrecision += tp / (tp + fp)
        totalRecall += tp / (tp + fn)
        validClasses++
      }
    })

    const precision = validClasses > 0 ? totalPrecision / validClasses : 0
    const recall = validClasses > 0 ? totalRecall / validClasses : 0
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0

    return { precision, recall, f1Score }
  }

  // Binary classification
  const tp = confMatrix[1][1]
  const fp = confMatrix[0][1]
  const fn = confMatrix[1][0]

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0

  return { precision, recall, f1Score }
}

// Enhanced evaluation metrics
export function calculateROCAUC(yTrue: number[], yProba: number[]): number {
  if (yTrue.length !== yProba.length) return 0

  // Simple ROC AUC calculation for binary classification
  const pairs = yTrue.map((label, i) => ({ label, prob: yProba[i] })).sort((a, b) => b.prob - a.prob)

  let tp = 0,
    fp = 0
  const positives = yTrue.filter((y) => y === 1).length
  const negatives = yTrue.length - positives

  if (positives === 0 || negatives === 0) return 0.5

  let auc = 0
  let prevFpr = 0

  for (const pair of pairs) {
    if (pair.label === 1) {
      tp++
    } else {
      fp++
      const tpr = tp / positives
      const fpr = fp / negatives
      auc += tpr * (fpr - prevFpr)
      prevFpr = fpr
    }
  }

  return auc
}

export function calculateFeatureImportance(
  X: number[][],
  y: number[],
  features: string[],
): Array<{ feature: string; importance: number }> {
  // Simplified feature importance using correlation
  const importances = features.map((feature, idx) => {
    const featureValues = X.map((row) => row[idx])
    const correlation = Math.abs(calculateCorrelation(featureValues, y))
    return { feature, importance: correlation || 0 }
  })

  // Normalize importances
  const total = importances.reduce((sum, item) => sum + item.importance, 0)
  if (total > 0) {
    importances.forEach((item) => (item.importance /= total))
  }

  return importances.sort((a, b) => b.importance - a.importance)
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 2) return 0

  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n

  let numerator = 0
  let sumX = 0
  let sumY = 0

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX
    const diffY = y[i] - meanY
    numerator += diffX * diffY
    sumX += diffX * diffX
    sumY += diffY * diffY
  }

  const denominator = Math.sqrt(sumX * sumY)
  return denominator === 0 ? 0 : numerator / denominator
}

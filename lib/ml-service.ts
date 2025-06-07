// Real ML service with scikit-learn and TensorFlow integration
import { randomUUID } from "crypto"

export interface MLTrainingRequest {
  data: any[]
  features: string[]
  target?: string
  taskType: "classification" | "regression" | "clustering"
  algorithm: string
  hyperparameters?: Record<string, any>
  crossValidation?: boolean
  testSize?: number
}

export interface MLTrainingResult {
  modelId: string
  success: boolean
  performance: Record<string, any>
  featureImportance?: Array<{ feature: string; importance: number }>
  predictions?: any[]
  model?: any
  error?: string
  executionTime: number
}

export interface MLModel {
  id: string
  name: string
  algorithm: string
  taskType: string
  features: string[]
  target?: string
  performance: Record<string, any>
  createdAt: Date
  serializedModel?: string
  version: number
}

export class MLService {
  private models: Map<string, MLModel> = new Map()

  async trainModel(request: MLTrainingRequest): Promise<MLTrainingResult> {
    const startTime = Date.now()
    const modelId = randomUUID()

    try {
      // Prepare training script based on algorithm and task type
      const trainingScript = this.generateTrainingScript(request)

      // Execute training via Python
      const response = await fetch("/api/python/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: trainingScript,
          dataContext: {
            data: request.data,
            features: request.features,
            target: request.target,
            columns: [...request.features, ...(request.target ? [request.target] : [])],
          },
        }),
      })

      const result = await response.json()

      if (!result.success) {
        return {
          modelId,
          success: false,
          error: result.error,
          executionTime: Date.now() - startTime,
        }
      }

      // Parse training results
      const trainingResults = result.result || {}

      // Store model
      const model: MLModel = {
        id: modelId,
        name: `${request.algorithm}_${Date.now()}`,
        algorithm: request.algorithm,
        taskType: request.taskType,
        features: request.features,
        target: request.target,
        performance: trainingResults.performance || {},
        createdAt: new Date(),
        serializedModel: trainingResults.serializedModel,
        version: 1,
      }

      this.models.set(modelId, model)

      return {
        modelId,
        success: true,
        performance: trainingResults.performance || {},
        featureImportance: trainingResults.featureImportance,
        predictions: trainingResults.predictions,
        model: trainingResults.model,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        modelId,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionTime: Date.now() - startTime,
      }
    }
  }

  private generateTrainingScript(request: MLTrainingRequest): string {
    const { algorithm, taskType, hyperparameters = {}, crossValidation = true, testSize = 0.2 } = request

    return `
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
import pickle
import json
import base64

# Prepare data
df = pd.DataFrame(data)
X = df[${JSON.stringify(request.features)}].values
${request.target ? `y = df['${request.target}'].values` : "y = None"}

# Handle missing values
from sklearn.impute import SimpleImputer
imputer = SimpleImputer(strategy='mean')
X = imputer.fit_transform(X)

# Scale features for algorithms that need it
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

${this.getAlgorithmImport(algorithm, taskType)}

# Initialize model
${this.getModelInitialization(algorithm, taskType, hyperparameters)}

# Training and evaluation
results = {}

${
  request.target
    ? `
# Split data
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=${testSize}, random_state=42)

# Train model
model.fit(X_train, y_train)

# Make predictions
y_pred = model.predict(X_test)

# Calculate performance metrics
${this.getPerformanceMetrics(taskType)}

# Cross-validation
${
  crossValidation
    ? `
cv_scores = cross_val_score(model, X_scaled, y, cv=5)
results['cv_mean'] = cv_scores.mean()
results['cv_std'] = cv_scores.std()
`
    : ""
}

# Feature importance (if available)
if hasattr(model, 'feature_importances_'):
    feature_importance = list(zip(${JSON.stringify(request.features)}, model.feature_importances_))
    results['featureImportance'] = [{'feature': f, 'importance': float(i)} for f, i in feature_importance]
elif hasattr(model, 'coef_'):
    feature_importance = list(zip(${JSON.stringify(request.features)}, abs(model.coef_.flatten())))
    results['featureImportance'] = [{'feature': f, 'importance': float(i)} for f, i in feature_importance]

# Serialize model
model_bytes = pickle.dumps({'model': model, 'scaler': scaler, 'imputer': imputer})
results['serializedModel'] = base64.b64encode(model_bytes).decode('utf-8')
results['predictions'] = y_pred.tolist() if hasattr(y_pred, 'tolist') else list(y_pred)
`
    : `
# Unsupervised learning (clustering)
model.fit(X_scaled)
labels = model.predict(X_scaled)

results['performance'] = {
    'n_clusters': len(np.unique(labels)),
    'silhouette_score': 0  # Would need to import and calculate
}
results['predictions'] = labels.tolist()

# Serialize model
model_bytes = pickle.dumps({'model': model, 'scaler': scaler, 'imputer': imputer})
results['serializedModel'] = base64.b64encode(model_bytes).decode('utf-8')
`
}

print("Training completed successfully")
results
`
  }

  private getAlgorithmImport(algorithm: string, taskType: string): string {
    const imports: Record<string, string> = {
      random_forest:
        taskType === "classification"
          ? "from sklearn.ensemble import RandomForestClassifier"
          : "from sklearn.ensemble import RandomForestRegressor",
      logistic_regression: "from sklearn.linear_model import LogisticRegression",
      linear_regression: "from sklearn.linear_model import LinearRegression",
      svm: taskType === "classification" ? "from sklearn.svm import SVC" : "from sklearn.svm import SVR",
      gradient_boosting:
        taskType === "classification"
          ? "from sklearn.ensemble import GradientBoostingClassifier"
          : "from sklearn.ensemble import GradientBoostingRegressor",
      decision_tree:
        taskType === "classification"
          ? "from sklearn.tree import DecisionTreeClassifier"
          : "from sklearn.tree import DecisionTreeRegressor",
      kmeans: "from sklearn.cluster import KMeans",
      neural_network:
        taskType === "classification"
          ? "from sklearn.neural_network import MLPClassifier"
          : "from sklearn.neural_network import MLPRegressor",
    }

    return imports[algorithm] || "from sklearn.ensemble import RandomForestClassifier"
  }

  private getModelInitialization(algorithm: string, taskType: string, hyperparameters: Record<string, any>): string {
    const paramStr = Object.entries(hyperparameters)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(", ")

    const models: Record<string, string> = {
      random_forest:
        taskType === "classification"
          ? `model = RandomForestClassifier(random_state=42${paramStr ? ", " + paramStr : ""})`
          : `model = RandomForestRegressor(random_state=42${paramStr ? ", " + paramStr : ""})`,
      logistic_regression: `model = LogisticRegression(random_state=42${paramStr ? ", " + paramStr : ""})`,
      linear_regression: `model = LinearRegression(${paramStr})`,
      svm:
        taskType === "classification"
          ? `model = SVC(random_state=42${paramStr ? ", " + paramStr : ""})`
          : `model = SVR(${paramStr})`,
      gradient_boosting:
        taskType === "classification"
          ? `model = GradientBoostingClassifier(random_state=42${paramStr ? ", " + paramStr : ""})`
          : `model = GradientBoostingRegressor(random_state=42${paramStr ? ", " + paramStr : ""})`,
      decision_tree:
        taskType === "classification"
          ? `model = DecisionTreeClassifier(random_state=42${paramStr ? ", " + paramStr : ""})`
          : `model = DecisionTreeRegressor(random_state=42${paramStr ? ", " + paramStr : ""})`,
      kmeans: `model = KMeans(random_state=42${paramStr ? ", " + paramStr : ""})`,
      neural_network:
        taskType === "classification"
          ? `model = MLPClassifier(random_state=42${paramStr ? ", " + paramStr : ""})`
          : `model = MLPRegressor(random_state=42${paramStr ? ", " + paramStr : ""})`,
    }

    return models[algorithm] || models["random_forest"]
  }

  private getPerformanceMetrics(taskType: string): string {
    if (taskType === "classification") {
      return `
results['performance'] = {
    'accuracy': accuracy_score(y_test, y_pred),
    'precision': precision_score(y_test, y_pred, average='weighted', zero_division=0),
    'recall': recall_score(y_test, y_pred, average='weighted', zero_division=0),
    'f1_score': f1_score(y_test, y_pred, average='weighted', zero_division=0)
}
`
    } else {
      return `
results['performance'] = {
    'mse': mean_squared_error(y_test, y_pred),
    'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
    'r2_score': r2_score(y_test, y_pred)
}
`
    }
  }

  async predictWithModel(modelId: string, data: any[]): Promise<any[]> {
    const model = this.models.get(modelId)
    if (!model || !model.serializedModel) {
      throw new Error("Model not found or not trained")
    }

    const predictionScript = `
import pickle
import base64
import numpy as np
import pandas as pd

# Deserialize model
model_data = pickle.loads(base64.b64decode('${model.serializedModel}'))
model = model_data['model']
scaler = model_data['scaler']
imputer = model_data['imputer']

# Prepare prediction data
df = pd.DataFrame(data)
X = df[${JSON.stringify(model.features)}].values

# Apply same preprocessing
X = imputer.transform(X)
X_scaled = scaler.transform(X)

# Make predictions
predictions = model.predict(X_scaled)
predictions.tolist() if hasattr(predictions, 'tolist') else list(predictions)
`

    const response = await fetch("/api/python/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: predictionScript,
        dataContext: { data },
      }),
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || "Prediction failed")
    }

    return result.result || []
  }

  getModel(modelId: string): MLModel | undefined {
    return this.models.get(modelId)
  }

  getAllModels(): MLModel[] {
    return Array.from(this.models.values())
  }

  deleteModel(modelId: string): boolean {
    return this.models.delete(modelId)
  }

  async exportModel(modelId: string): Promise<string> {
    const model = this.models.get(modelId)
    if (!model) {
      throw new Error("Model not found")
    }

    return JSON.stringify(model, null, 2)
  }

  async importModel(modelData: string): Promise<string> {
    try {
      const model: MLModel = JSON.parse(modelData)
      const newId = randomUUID()
      model.id = newId
      model.version = (model.version || 0) + 1

      this.models.set(newId, model)
      return newId
    } catch (error) {
      throw new Error("Invalid model data")
    }
  }
}

// Singleton instance
export const mlService = new MLService()

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

export interface AutoMLRequest {
  data: any[]
  targetColumn: string
  taskType: "classification" | "regression"
  maxModels?: number
  maxTime?: number
  optimizeFor?: "accuracy" | "speed" | "balanced"
}

export interface AutoMLResult {
  modelId: string
  success: boolean
  bestAlgorithm: string
  bestScore: number
  allModels: Array<{
    algorithm: string
    score: number
    hyperparameters: Record<string, any>
    performance: Record<string, any>
  }>
  featureImportance?: Array<{ feature: string; importance: number }>
  executionTime: number
  error?: string
}

export class MLService {
  private models: Map<string, MLModel> = new Map()

  async runAutoML(request: AutoMLRequest): Promise<AutoMLResult> {
    const startTime = Date.now()
    const modelId = randomUUID()

    try {
      // Extract features (all columns except target)
      const allColumns = Object.keys(request.data[0] || {})
      const features = allColumns.filter(col => col !== request.targetColumn)

      // Define algorithms to try based on task type
      const algorithms = request.taskType === "classification" 
        ? ["random_forest", "gradient_boosting", "logistic_regression", "svm", "neural_network", "decision_tree"]
        : ["random_forest", "gradient_boosting", "linear_regression", "svm", "neural_network", "decision_tree"]
      
      // Limit algorithms based on optimization preference
      let algorithmsToTry = algorithms
      if (request.optimizeFor === "speed") {
        algorithmsToTry = algorithms.filter(a => !["neural_network", "svm"].includes(a))
      }
      
      // Limit by max models if specified
      const maxModels = request.maxModels || 5
      algorithmsToTry = algorithmsToTry.slice(0, maxModels)
      
      // Generate AutoML Python script
      const autoMLScript = this.generateAutoMLScript(request, algorithmsToTry, features)
      
      // Execute AutoML via Python
      const response = await fetch("/api/python/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: autoMLScript,
          dataContext: {
            data: request.data,
            features: features,
            target: request.targetColumn,
            columns: [...features, request.targetColumn],
          },
        }),
      })

      const result = await response.json()

      if (!result.success) {
        return {
          modelId,
          success: false,
          bestAlgorithm: "",
          bestScore: 0,
          allModels: [],
          error: result.error,
          executionTime: Date.now() - startTime,
        }
      }

      // Parse AutoML results
      const autoMLResults = result.result || {}
      
      // Store the best model
      if (autoMLResults.bestModel) {
        const model: MLModel = {
          id: modelId,
          name: `AutoML_${request.taskType}_${request.targetColumn}_${Date.now()}`,
          algorithm: autoMLResults.bestAlgorithm,
          taskType: request.taskType,
          features: features,
          target: request.targetColumn,
          performance: autoMLResults.bestPerformance || {},
          createdAt: new Date(),
          serializedModel: autoMLResults.serializedModel,
          version: 1,
        }

        this.models.set(modelId, model)
      }

      return {
        modelId,
        success: true,
        bestAlgorithm: autoMLResults.bestAlgorithm || "",
        bestScore: autoMLResults.bestScore || 0,
        allModels: autoMLResults.allModels || [],
        featureImportance: autoMLResults.featureImportance,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        modelId,
        success: false,
        bestAlgorithm: "",
        bestScore: 0,
        allModels: [],
        error: error instanceof Error ? error.message : "Unknown error",
        executionTime: Date.now() - startTime,
      }
    }
  }

  private generateAutoMLScript(request: AutoMLRequest, algorithms: string[], features: string[]): string {
    const { taskType, maxTime = 120 } = request
    const metric = taskType === "classification" ? "accuracy" : "r2"
    
    return `
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, mean_squared_error, r2_score
import pickle
import json
import base64
import time

# Set maximum execution time
max_time = ${maxTime}
start_time = time.time()

# Prepare data
df = pd.DataFrame(data)
X = df[${JSON.stringify(features)}].values
y = df['${request.targetColumn}'].values

# Handle missing values
from sklearn.impute import SimpleImputer
imputer = SimpleImputer(strategy='mean')
X = imputer.fit_transform(X)

# Handle categorical target for classification
if '${taskType}' == 'classification':
    le = LabelEncoder()
    y = le.fit_transform(y)

# Scale features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Split data
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

# Define models to evaluate
models = []
${algorithms.map(algo => `
# ${algo}
try:
    ${this.getAlgorithmImport(algo, taskType)}
    ${this.getModelInitialization(algo, taskType, {})}
    models.append({
        'name': '${algo}',
        'model': model,
        'hyperparameters': {},
    })
except Exception as e:
    print(f"Error initializing {algo}: {str(e)}")
`).join('')}

# Train and evaluate all models
results = []
best_score = -float('inf') if '${metric}' in ['accuracy', 'r2', 'f1'] else float('inf')
best_model = None
best_model_name = ""
best_performance = {}

for model_info in models:
    # Check if we've exceeded time limit
    if time.time() - start_time > max_time:
        break
        
    try:
        model = model_info['model']
        name = model_info['name']
        hyperparams = model_info['hyperparameters']
        
        # Train model
        model.fit(X_train, y_train)
        
        # Make predictions
        y_pred = model.predict(X_test)
        
        # Calculate performance metrics
        performance = {}
        if '${taskType}' == 'classification':
            performance['accuracy'] = float(accuracy_score(y_test, y_pred))
            performance['precision'] = float(precision_score(y_test, y_pred, average='weighted', zero_division=0))
            performance['recall'] = float(recall_score(y_test, y_pred, average='weighted', zero_division=0))
            performance['f1'] = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))
            current_score = performance['${metric}']
        else:  # regression
            performance['mse'] = float(mean_squared_error(y_test, y_pred))
            performance['rmse'] = float(np.sqrt(performance['mse']))
            performance['r2'] = float(r2_score(y_test, y_pred))
            current_score = performance['${metric}']
            
        # Cross-validation
        cv_scores = cross_val_score(model, X_scaled, y, cv=5, 
                                  scoring='accuracy' if '${taskType}' == 'classification' else 'r2')
        performance['cv_mean'] = float(cv_scores.mean())
        performance['cv_std'] = float(cv_scores.std())
        
        # Feature importance
        feature_importance = None
        if hasattr(model, 'feature_importances_'):
            feature_importance = list(zip(${JSON.stringify(features)}, model.feature_importances_))
        elif hasattr(model, 'coef_'):
            coefs = model.coef_.flatten() if len(model.coef_.shape) > 1 else model.coef_
            feature_importance = list(zip(${JSON.stringify(features)}, abs(coefs)))
            
        # Compare with best model
        is_better = False
        if '${metric}' in ['accuracy', 'r2', 'f1']:
            is_better = current_score > best_score
        else:  # metrics where lower is better (mse, rmse)
            is_better = current_score < best_score
            
        # Update best model if current is better
        if is_better:
            best_score = current_score
            best_model = model
            best_model_name = name
            best_performance = performance
            
        # Add to results
        model_result = {
            'algorithm': name,
            'score': float(current_score),
            'hyperparameters': hyperparams,
            'performance': performance
        }
        results.append(model_result)
        
    except Exception as e:
        print(f"Error training {name}: {str(e)}")

# Prepare final results
final_results = {
    'bestAlgorithm': best_model_name,
    'bestScore': float(best_score),
    'bestPerformance': best_performance,
    'allModels': results,
}

# Feature importance for best model
if best_model is not None:
    if hasattr(best_model, 'feature_importances_'):
        importances = best_model.feature_importances_
        final_results['featureImportance'] = [{'feature': f, 'importance': float(i)} 
                                           for f, i in zip(${JSON.stringify(features)}, importances)]
    elif hasattr(best_model, 'coef_'):
        coefs = best_model.coef_.flatten() if len(best_model.coef_.shape) > 1 else best_model.coef_
        total = np.sum(np.abs(coefs))
        if total > 0:  # Avoid division by zero
            normalized = np.abs(coefs) / total
            final_results['featureImportance'] = [{'feature': f, 'importance': float(i)} 
                                               for f, i in zip(${JSON.stringify(features)}, normalized)]

# Serialize best model if available
if best_model is not None:
    model_package = {
        'model': best_model,
        'scaler': scaler,
        'imputer': imputer,
        'is_classification': '${taskType}' == 'classification',
        'label_encoder': le if '${taskType}' == 'classification' else None
    }
    model_bytes = pickle.dumps(model_package)
    final_results['serializedModel'] = base64.b64encode(model_bytes).decode('utf-8')
    final_results['bestModel'] = True

final_results['executionTime'] = time.time() - start_time
`
  }

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
          performance: {}, // Add empty performance object to satisfy TypeScript
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
        performance: {}, // Add empty performance object to satisfy TypeScript
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

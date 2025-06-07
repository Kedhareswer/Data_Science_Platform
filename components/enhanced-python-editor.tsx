"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Play,
  Square,
  Copy,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Code2,
  FileText,
  Lightbulb,
  Package,
  Plus,
} from "lucide-react"
import { useData } from "@/lib/data-context"
import { toast } from "@/components/ui/use-toast"

interface ExecutionResult {
  success: boolean
  result?: any
  error?: string
  output?: string
  executionTime?: number
}

interface PackageInfo {
  name: string
  version: string
  installed: boolean
}

export function EnhancedPythonEditor() {
  const { processedData, columns } = useData()
  const [code, setCode] = useState(`# Enhanced Python Environment with Real ML Libraries
# Available libraries: numpy, pandas, scikit-learn, tensorflow, matplotlib, seaborn

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt

# Your dataset is available as 'data' DataFrame
print(f"Dataset shape: {data.shape if not data.empty else 'No data loaded'}")

# Example: Quick data analysis
if not data.empty:
    print("\\nDataset info:")
    print(data.info())
    
    # Show basic statistics for numeric columns
    numeric_cols = data.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) > 0:
        print("\\nNumeric columns statistics:")
        print(data[numeric_cols].describe())`)

  const [output, setOutput] = useState("")
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [activeTab, setActiveTab] = useState("editor")
  const [packages, setPackages] = useState<PackageInfo[]>([])
  const [newPackage, setNewPackage] = useState("")
  const [isInstallingPackage, setIsInstallingPackage] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const codeEditorRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadInstalledPackages()
  }, [])

  const loadInstalledPackages = async () => {
    try {
      const response = await fetch("/api/python/packages")
      const data = await response.json()
      setPackages(data.packages || [])
    } catch (error) {
      console.error("Failed to load packages:", error)
    }
  }

  const executeCode = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!code.trim()) {
      setExecutionResult({
        success: false,
        error: "Please enter some code to execute",
      })
      return
    }

    setIsExecuting(true)
    setOutput("")
    setExecutionResult(null)

    try {
      const response = await fetch("/api/python/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          dataContext: {
            data: processedData,
            columns,
          },
        }),
      })

      const result = await response.json()

      let formattedOutput = ""
      if (result.output) {
        formattedOutput += result.output
      }
      if (result.result !== undefined && result.result !== null) {
        if (formattedOutput) formattedOutput += "\n\n"
        formattedOutput += "Result:\n"
        formattedOutput +=
          typeof result.result === "object" ? JSON.stringify(result.result, null, 2) : String(result.result)
      }

      setOutput(formattedOutput || "Code executed successfully (no output)")
      setExecutionResult(result)

      if (result.success) {
        toast({
          title: "Code Executed Successfully",
          description: `Execution completed in ${result.executionTime}ms`,
        })
      } else {
        toast({
          title: "Execution Failed",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setOutput(`Execution Error: ${errorMessage}`)
      setExecutionResult({
        success: false,
        error: errorMessage,
      })

      toast({
        title: "Execution Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const stopExecution = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsExecuting(false)
    setOutput("Execution stopped by user")
    setExecutionResult({
      success: false,
      error: "Execution stopped",
    })
  }

  const installPackage = async () => {
    if (!newPackage.trim()) return

    setIsInstallingPackage(true)
    try {
      const response = await fetch("/api/python/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageName: newPackage.trim() }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Package Installed",
          description: result.message,
        })
        setNewPackage("")
        await loadInstalledPackages()
      } else {
        toast({
          title: "Installation Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Installation Failed",
        description: "Failed to install package",
        variant: "destructive",
      })
    } finally {
      setIsInstallingPackage(false)
    }
  }

  const getCodeCompletion = async (position: number) => {
    try {
      const response = await fetch("/api/python/completion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, position }),
      })

      const result = await response.json()
      setSuggestions(result.suggestions || [])
      setShowSuggestions(result.suggestions?.length > 0)
    } catch (error) {
      console.error("Failed to get code completion:", error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === " ") {
      e.preventDefault()
      const position = codeEditorRef.current?.selectionStart || 0
      getCodeCompletion(position)
    }

    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault()
      executeCode(e as any)
    }
  }

  const copyOutput = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (output) {
      try {
        await navigator.clipboard.writeText(output)
        toast({
          title: "Copied",
          description: "Output copied to clipboard",
        })
      } catch (err) {
        console.error("Failed to copy output:", err)
      }
    }
  }

  const downloadOutput = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (output) {
      const blob = new Blob([output], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "python_output.txt"
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const clearOutput = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOutput("")
    setExecutionResult(null)
  }

  const clearCode = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCode("")
  }

  const getStatusIcon = () => {
    if (isExecuting) {
      return <Clock className="h-4 w-4 animate-spin text-blue-500" />
    }
    if (executionResult?.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    if (executionResult?.error) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    return null
  }

  const mlExamples = [
    {
      title: "Random Forest Classification",
      description: "Train a Random Forest classifier with real scikit-learn",
      code: `# Random Forest Classification with scikit-learn
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import LabelEncoder

# Prepare data (assuming you have a target column)
if not data.empty and len(data.columns) > 1:
    # Select numeric features
    numeric_cols = data.select_dtypes(include=[np.number]).columns.tolist()
    
    if len(numeric_cols) > 1:
        # Use first column as target, rest as features
        target_col = numeric_cols[0]
        feature_cols = numeric_cols[1:]
        
        X = data[feature_cols].fillna(0)
        y = data[target_col].fillna(0)
        
        # Convert to binary classification if needed
        y_binary = (y > y.median()).astype(int)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_binary, test_size=0.2, random_state=42
        )
        
        # Train Random Forest
        rf = RandomForestClassifier(n_estimators=100, random_state=42)
        rf.fit(X_train, y_train)
        
        # Make predictions
        y_pred = rf.predict(X_test)
        
        # Evaluate
        accuracy = accuracy_score(y_test, y_pred)
        print(f"Random Forest Accuracy: {accuracy:.3f}")
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': feature_cols,
            'importance': rf.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\\nFeature Importance:")
        print(feature_importance)
    else:
        print("Need at least 2 numeric columns for classification")
else:
    print("No data available for training")`,
    },
    {
      title: "Deep Learning with TensorFlow",
      description: "Build a neural network using TensorFlow/Keras",
      code: `# Deep Learning with TensorFlow
import tensorflow as tf
from tensorflow import keras
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

print(f"TensorFlow version: {tf.__version__}")

# Prepare data
if not data.empty and len(data.columns) > 1:
    numeric_cols = data.select_dtypes(include=[np.number]).columns.tolist()
    
    if len(numeric_cols) > 1:
        # Features and target
        X = data[numeric_cols[1:]].fillna(0).values
        y = data[numeric_cols[0]].fillna(0).values
        
        # Normalize features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42
        )
        
        # Build neural network
        model = keras.Sequential([
            keras.layers.Dense(64, activation='relu', input_shape=(X_train.shape[1],)),
            keras.layers.Dropout(0.3),
            keras.layers.Dense(32, activation='relu'),
            keras.layers.Dropout(0.3),
            keras.layers.Dense(1, activation='linear')  # For regression
        ])
        
        # Compile model
        model.compile(
            optimizer='adam',
            loss='mse',
            metrics=['mae']
        )
        
        # Train model
        history = model.fit(
            X_train, y_train,
            epochs=50,
            batch_size=32,
            validation_split=0.2,
            verbose=0
        )
        
        # Evaluate
        test_loss, test_mae = model.evaluate(X_test, y_test, verbose=0)
        print(f"Test MAE: {test_mae:.3f}")
        
        # Make predictions
        predictions = model.predict(X_test[:5])
        print(f"\\nSample predictions: {predictions.flatten()}")
        print(f"Actual values: {y_test[:5]}")
    else:
        print("Need at least 2 numeric columns")
else:
    print("No data available")`,
    },
    {
      title: "Advanced Data Analysis",
      description: "Comprehensive data analysis with multiple libraries",
      code: `# Advanced Data Analysis
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans

# Set style for plots
plt.style.use('default')
sns.set_palette("husl")

if not data.empty:
    print("=== COMPREHENSIVE DATA ANALYSIS ===\\n")
    
    # Basic info
    print(f"Dataset shape: {data.shape}")
    print(f"Memory usage: {data.memory_usage(deep=True).sum() / 1024**2:.2f} MB")
    
    # Data types
    print("\\nData types:")
    print(data.dtypes.value_counts())
    
    # Missing values analysis
    missing_data = data.isnull().sum()
    if missing_data.sum() > 0:
        print("\\nMissing values:")
        print(missing_data[missing_data > 0])
    
    # Numeric columns analysis
    numeric_cols = data.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) > 0:
        print(f"\\nNumeric columns ({len(numeric_cols)}):")
        
        # Correlation analysis
        corr_matrix = data[numeric_cols].corr()
        print("\\nHighest correlations:")
        
        # Get correlation pairs
        corr_pairs = []
        for i in range(len(corr_matrix.columns)):
            for j in range(i+1, len(corr_matrix.columns)):
                corr_pairs.append((
                    corr_matrix.columns[i],
                    corr_matrix.columns[j],
                    corr_matrix.iloc[i, j]
                ))
        
        # Sort by absolute correlation
        corr_pairs.sort(key=lambda x: abs(x[2]), reverse=True)
        
        for col1, col2, corr in corr_pairs[:5]:
            print(f"  {col1} - {col2}: {corr:.3f}")
        
        # Outlier detection using IQR
        print("\\nOutlier analysis:")
        for col in numeric_cols[:3]:  # Limit to first 3 columns
            Q1 = data[col].quantile(0.25)
            Q3 = data[col].quantile(0.75)
            IQR = Q3 - Q1
            outliers = data[(data[col] < Q1 - 1.5*IQR) | (data[col] > Q3 + 1.5*IQR)]
            print(f"  {col}: {len(outliers)} outliers ({len(outliers)/len(data)*100:.1f}%)")
        
        # PCA analysis if enough columns
        if len(numeric_cols) >= 3:
            print("\\nPCA Analysis:")
            pca_data = data[numeric_cols].fillna(0)
            pca = PCA()
            pca.fit(pca_data)
            
            print(f"Explained variance ratio (first 3 components):")
            for i, ratio in enumerate(pca.explained_variance_ratio_[:3]):
                print(f"  PC{i+1}: {ratio:.3f} ({ratio*100:.1f}%)")
            
            cumsum = np.cumsum(pca.explained_variance_ratio_)
            n_components_95 = np.argmax(cumsum >= 0.95) + 1
            print(f"Components needed for 95% variance: {n_components_95}")
        
        # Clustering analysis
        if len(numeric_cols) >= 2:
            print("\\nClustering Analysis:")
            cluster_data = data[numeric_cols].fillna(0)
            
            # Determine optimal number of clusters
            inertias = []
            K_range = range(2, min(8, len(data)//10 + 1))
            
            for k in K_range:
                kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
                kmeans.fit(cluster_data)
                inertias.append(kmeans.inertia_)
            
            # Simple elbow detection
            if len(inertias) > 2:
                diffs = np.diff(inertias)
                optimal_k = K_range[np.argmin(diffs)] if len(diffs) > 0 else 3
                print(f"Suggested number of clusters: {optimal_k}")
                
                # Perform clustering
                kmeans = KMeans(n_clusters=optimal_k, random_state=42)
                clusters = kmeans.fit_predict(cluster_data)
                
                print(f"Cluster distribution:")
                unique, counts = np.unique(clusters, return_counts=True)
                for cluster, count in zip(unique, counts):
                    print(f"  Cluster {cluster}: {count} points ({count/len(data)*100:.1f}%)")
    
    # Categorical analysis
    cat_cols = data.select_dtypes(include=['object', 'category']).columns
    if len(cat_cols) > 0:
        print(f"\\nCategorical columns ({len(cat_cols)}):")
        for col in cat_cols[:3]:  # Limit to first 3
            unique_vals = data[col].nunique()
            print(f"  {col}: {unique_vals} unique values")
            if unique_vals <= 10:
                print(f"    Values: {data[col].value_counts().head().to_dict()}")
    
    print("\\n=== ANALYSIS COMPLETE ===")
else:
    print("No data available for analysis")`,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5" />
          <h3 className="font-semibold">Enhanced Python Environment</h3>
          {getStatusIcon()}
        </div>

        {executionResult?.executionTime && (
          <Badge variant="outline" className="text-xs">
            {executionResult.executionTime}ms
          </Badge>
        )}
      </div>

      {/* Data availability notice */}
      {processedData.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No data loaded. Upload a dataset to access data analysis functions.</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="editor" className="gap-2">
            <Code2 className="h-4 w-4" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="examples" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            ML Examples
          </TabsTrigger>
          <TabsTrigger value="packages" className="gap-2">
            <Package className="h-4 w-4" />
            Packages
          </TabsTrigger>
          <TabsTrigger value="output" className="gap-2">
            <FileText className="h-4 w-4" />
            Output
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Python Code Editor</CardTitle>
              <p className="text-sm text-muted-foreground">
                Press Ctrl+Space for code completion, Ctrl+Enter to execute
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea
                  ref={codeEditorRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your Python code here..."
                  className="font-mono text-sm min-h-[400px] resize-none"
                  style={{
                    fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
                  }}
                />

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-2 right-2 bg-background border rounded-md shadow-lg p-2 max-w-xs">
                    <p className="text-xs font-medium mb-1">Suggestions:</p>
                    <div className="space-y-1">
                      {suggestions.slice(0, 5).map((suggestion, index) => (
                        <button
                          key={index}
                          className="block text-xs text-left hover:bg-muted p-1 rounded w-full"
                          onClick={() => {
                            const textarea = codeEditorRef.current
                            if (textarea) {
                              const start = textarea.selectionStart
                              const end = textarea.selectionEnd
                              const newCode = code.substring(0, start) + suggestion + code.substring(end)
                              setCode(newCode)
                              setShowSuggestions(false)
                            }
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={isExecuting ? stopExecution : executeCode}
                  disabled={!code.trim()}
                  className="gap-2"
                >
                  {isExecuting ? (
                    <>
                      <Square className="h-4 w-4" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run Code
                    </>
                  )}
                </Button>

                <Button type="button" variant="outline" onClick={clearCode}>
                  Clear
                </Button>

                {processedData.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {processedData.length} rows, {columns.length} columns available
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-4">
          <div className="grid gap-4">
            {mlExamples.map((example, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{example.title}</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCode(example.code)
                        setActiveTab("editor")
                      }}
                      className="gap-2"
                    >
                      <Code2 className="h-3 w-3" />
                      Use Example
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{example.description}</p>
                  <ScrollArea className="h-32 w-full border rounded-md p-3 bg-muted/50">
                    <pre className="text-xs font-mono whitespace-pre-wrap">{example.code}</pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="packages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Package Management</CardTitle>
              <p className="text-sm text-muted-foreground">Install and manage Python packages for your analysis</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newPackage}
                  onChange={(e) => setNewPackage(e.target.value)}
                  placeholder="Package name (e.g., plotly, xgboost)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      installPackage()
                    }
                  }}
                />
                <Button onClick={installPackage} disabled={!newPackage.trim() || isInstallingPackage} className="gap-2">
                  {isInstallingPackage ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Install
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Installed Packages ({packages.length})</Label>
                <ScrollArea className="h-64 w-full border rounded-md p-3">
                  {packages.length > 0 ? (
                    <div className="space-y-2">
                      {packages.map((pkg, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <span className="font-medium">{pkg.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">v{pkg.version}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Installed
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <Package className="h-8 w-8 mx-auto mb-2" />
                      <p>No packages loaded yet</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="output" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Execution Output</CardTitle>
                <div className="flex gap-2">
                  {output && (
                    <>
                      <Button type="button" variant="outline" size="sm" onClick={copyOutput} className="gap-2">
                        <Copy className="h-3 w-3" />
                        Copy
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={downloadOutput} className="gap-2">
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    </>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={clearOutput}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isExecuting ? (
                <div className="flex items-center gap-2 p-4 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Executing Python code...
                </div>
              ) : output ? (
                <ScrollArea className="h-64 w-full border rounded-md p-3 bg-muted/50">
                  <pre className="text-sm font-mono whitespace-pre-wrap">{output}</pre>
                </ScrollArea>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2" />
                  <p>No output yet. Run some code to see results here.</p>
                </div>
              )}

              {executionResult?.error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{executionResult.error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

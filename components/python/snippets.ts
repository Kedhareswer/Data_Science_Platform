export interface PythonSnippet {
  id: string
  label: string
  description: string
  code: string
}

export const DEFAULT_PYTHON_CODE = `# Your dataset is preloaded as a pandas DataFrame called \`df\` (alias: \`data\`).
# Press Shift+Enter to run.

print(f"{len(df)} rows x {len(df.columns)} columns")
df.head()
`

export const PYTHON_SNIPPETS: PythonSnippet[] = [
  {
    id: "head",
    label: "Peek at the data",
    description: "df.head()",
    code: "df.head(10)\n",
  },
  {
    id: "describe",
    label: "Summary statistics",
    description: "df.describe()",
    code: 'df.describe(include="all").T\n',
  },
  {
    id: "info",
    label: "Columns & missing values",
    description: "dtypes and null counts",
    code: `import pandas as pd

pd.DataFrame({
    "dtype": df.dtypes.astype(str),
    "missing": df.isna().sum(),
    "unique": df.nunique(),
})
`,
  },
  {
    id: "value-counts",
    label: "Value counts",
    description: "Most common values of a column",
    code: `# Pick a column (defaults to the first text column)
col = next((c for c in df.columns if df[c].dtype == object), df.columns[0])
df[col].value_counts().head(20).to_frame("count")
`,
  },
  {
    id: "histogram",
    label: "Histogram (matplotlib)",
    description: "Distribution of a numeric column",
    code: `import matplotlib.pyplot as plt

numeric = df.select_dtypes("number").columns
col = numeric[0]

fig, ax = plt.subplots(figsize=(7, 4))
ax.hist(df[col].dropna(), bins=30, color="#6366f1", edgecolor="white")
ax.set_title(f"Distribution of {col}")
ax.set_xlabel(col)
ax.set_ylabel("count")
plt.show()
`,
  },
  {
    id: "heatmap",
    label: "Correlation heatmap (seaborn)",
    description: "Pairwise correlations of numeric columns",
    code: `import matplotlib.pyplot as plt
import seaborn as sns

corr = df.select_dtypes("number").corr()

fig, ax = plt.subplots(figsize=(7, 6))
sns.heatmap(corr, annot=True, fmt=".2f", cmap="vlag", center=0, ax=ax)
ax.set_title("Correlation matrix")
plt.tight_layout()
plt.show()
`,
  },
  {
    id: "sklearn",
    label: "Quick model (scikit-learn)",
    description: "Random forest on the last column",
    code: `from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split

target = df.columns[-1]
X = df.drop(columns=[target]).select_dtypes("number").fillna(0)
y = df[target]

is_classification = y.dtype == object or y.nunique() <= 10
Model = RandomForestClassifier if is_classification else RandomForestRegressor

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = Model(n_estimators=100, random_state=42).fit(X_train, y_train)

metric = "accuracy" if is_classification else "R²"
print(f"Target: {target} -> {metric} = {model.score(X_test, y_test):.3f}")

import pandas as pd
pd.Series(model.feature_importances_, index=X.columns).sort_values(ascending=False).to_frame("importance")
`,
  },
  {
    id: "clean",
    label: "Drop missing rows",
    description: "Then click “Use df as notebook data”",
    code: `before = len(df)
df = df.dropna()
print(f"Dropped {before - len(df)} rows with missing values")
df.head()
`,
  },
]

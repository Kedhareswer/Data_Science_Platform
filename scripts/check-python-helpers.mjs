#!/usr/bin/env node
/**
 * Runs the Python helpers that DataNotebook installs into Pyodide
 * (lib/python/bootstrap-py.ts, lib/python/sklearn-py.ts) under a regular
 * CPython with pandas + scikit-learn + matplotlib, against the Iris sample.
 *
 *   pip install pandas scikit-learn matplotlib
 *   node scripts/check-python-helpers.mjs [python-executable]
 */
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const python = process.argv[2] ?? process.env.PYTHON ?? "python3"
const extract = (file) => {
  const match = readFileSync(file, "utf8").match(/String\.raw`([\s\S]*)`/)
  if (!match) throw new Error(`No Python block found in ${file}`)
  return match[1]
}

const rows = readFileSync("public/samples/iris.csv", "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => {
    const c = line.split(",")
    return { sl: +c[0], sw: +c[1], pl: +c[2], pw: +c[3], variety: c[4].replaceAll('"', "") }
  })

const harness = String.raw`
import json, sys
rows = json.load(open(sys.argv[1]))
cols = ["sl", "sw", "pl", "pw", "variety"]
features = ["sl", "sw", "pl", "pw"]

assert _dn_load_dataset("v1", json.dumps(cols), json.dumps(rows)) is True
assert _dn_load_dataset("v1", json.dumps(cols), json.dumps(rows)) is False, "dataset should be cached by version"
assert df.shape == (150, 5)
text, table = _dn_describe(df.describe())
assert table["totalRows"] == 8 and "sl" in table["columns"]
assert json.loads(_dn_export("df"))["columns"] == cols

def train(**kw):
    payload = {"modelId": kw["algorithm"] + kw["task"], "features": features, "rows": rows, **kw}
    return json.loads(_dn_sklearn_train(json.dumps(payload)))

for algo in ["logistic_regression", "knn", "decision_tree", "random_forest", "gradient_boosting", "svm", "naive_bayes"]:
    out = train(task="classification", algorithm=algo, target="variety")
    assert out["metrics"]["accuracy"] > 0.85, (algo, out["metrics"])
    assert out["classes"] == ["Setosa", "Versicolor", "Virginica"]
    assert len(out["featureImportance"]) == 4
    print(f"ok classification {algo:20s} acc={out['metrics']['accuracy']:.3f}")

reg = json.loads(_dn_sklearn_train(json.dumps({"modelId": "reg", "task": "regression", "algorithm": "linear_regression",
    "features": ["sw", "pl", "pw", "variety"], "target": "sl", "rows": rows})))
assert reg["metrics"]["r2Score"] > 0.7, reg["metrics"]
print(f"ok regression linear_regression r2={reg['metrics']['r2Score']:.3f}")

clu = train(task="clustering", algorithm="kmeans", hyperparameters={"k": 3})
assert len(clu["metrics"]["clusterSizes"]) == 3
print(f"ok clustering kmeans silhouette={clu['metrics']['silhouette']:.3f}")

pred = json.loads(_dn_sklearn_predict(json.dumps({"modelId": "random_forestclassification",
    "rows": [{"sl": 5.1, "sw": 3.5, "pl": 1.4, "pw": 0.2}]})))
assert pred[0]["value"] == "Setosa" and pred[0]["confidence"] > 0.5, pred
print("ok predict")

binary = [dict(r, variety="Setosa" if r["variety"] == "Setosa" else "Other") for r in rows]
out = json.loads(_dn_sklearn_train(json.dumps({"modelId": "bin", "task": "classification", "algorithm": "logistic_regression",
    "features": ["sl", "sw"], "target": "variety", "rows": binary})))
assert "rocAuc" in out["metrics"] and len(out["evaluation"]["scores"]) == out["testRows"]
print(f"ok binary roc_auc={out['metrics']['rocAuc']:.3f}")

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
plt.plot([1, 2, 3])
assert len(_dn_capture_figures()) == 1
print("ok figures")
`

const dir = mkdtempSync(join(tmpdir(), "dn-py-"))
try {
  const script = join(dir, "check.py")
  const data = join(dir, "rows.json")
  writeFileSync(script, [extract("lib/python/bootstrap-py.ts"), extract("lib/python/sklearn-py.ts"), harness].join("\n"))
  writeFileSync(data, JSON.stringify(rows))
  execFileSync(python, ["-W", "ignore", script, data], { stdio: "inherit" })
  console.log("Python helpers OK")
} finally {
  rmSync(dir, { recursive: true, force: true })
}

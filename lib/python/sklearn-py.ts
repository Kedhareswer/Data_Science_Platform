/**
 * scikit-learn training/prediction helpers executed inside Pyodide.
 * They exchange JSON strings with the TypeScript side (see lib/ml/sklearn.ts);
 * no user input is ever formatted into Python source.
 */
export const SKLEARN_PY = String.raw`
import json, time

_dn_models = {}

def _dn_sklearn_estimator(task, algorithm, hp, seed):
    from sklearn import linear_model, neighbors, tree, ensemble, naive_bayes, cluster, svm
    g = lambda k, d: hp.get(k, d)
    clf = task == "classification"
    if algorithm == "linear_regression":
        alpha = float(g("alpha", 0))
        return linear_model.Ridge(alpha=alpha) if alpha > 0 else linear_model.LinearRegression()
    if algorithm == "logistic_regression":
        l2 = float(g("l2", 0.001))
        return linear_model.LogisticRegression(C=1.0 / l2 if l2 > 0 else 1e6, max_iter=int(g("epochs", 300)) * 3)
    if algorithm == "knn":
        k = int(g("k", 5))
        return neighbors.KNeighborsClassifier(n_neighbors=k) if clf else neighbors.KNeighborsRegressor(n_neighbors=k)
    if algorithm == "decision_tree":
        kw = dict(max_depth=int(g("maxDepth", 8)), min_samples_split=int(g("minSamplesSplit", 4)), random_state=seed)
        return tree.DecisionTreeClassifier(**kw) if clf else tree.DecisionTreeRegressor(**kw)
    if algorithm == "random_forest":
        kw = dict(n_estimators=int(g("nEstimators", 100)), max_depth=int(g("maxDepth", 10)),
                  min_samples_split=int(g("minSamplesSplit", 4)), random_state=seed)
        return ensemble.RandomForestClassifier(**kw) if clf else ensemble.RandomForestRegressor(**kw)
    if algorithm == "gradient_boosting":
        kw = dict(learning_rate=float(g("learningRate", 0.1)), max_iter=int(g("nEstimators", 200)),
                  max_depth=int(g("maxDepth", 6)) or None, random_state=seed)
        return ensemble.HistGradientBoostingClassifier(**kw) if clf else ensemble.HistGradientBoostingRegressor(**kw)
    if algorithm == "svm":
        c = float(g("C", 1.0))
        kernel = str(g("kernel", "rbf"))
        if not clf:
            return svm.SVR(C=c, kernel=kernel)
        from sklearn.calibration import CalibratedClassifierCV
        return CalibratedClassifierCV(svm.SVC(C=c, kernel=kernel, random_state=seed), ensemble=False)
    if algorithm == "naive_bayes":
        return naive_bayes.GaussianNB()
    if algorithm == "kmeans":
        return cluster.KMeans(n_clusters=int(g("k", 3)), max_iter=int(g("maxIterations", 300)), n_init=10, random_state=seed)
    raise ValueError(f"Unsupported algorithm: {algorithm}")

def _dn_sklearn_frame(rows, columns):
    import pandas as pd
    return pd.DataFrame(rows, columns=columns)

def _dn_sklearn_preprocessor(X):
    import pandas as pd
    from sklearn.compose import ColumnTransformer
    from sklearn.pipeline import make_pipeline
    from sklearn.impute import SimpleImputer
    from sklearn.preprocessing import OneHotEncoder, StandardScaler
    numeric = [c for c in X.columns if pd.api.types.is_numeric_dtype(X[c]) or pd.api.types.is_bool_dtype(X[c])]
    categorical = [c for c in X.columns if c not in numeric]
    parts = []
    if numeric:
        parts.append(("num", make_pipeline(SimpleImputer(strategy="median"), StandardScaler()), numeric))
    if categorical:
        parts.append(("cat", make_pipeline(SimpleImputer(strategy="most_frequent"),
                                           OneHotEncoder(handle_unknown="ignore", max_categories=50)), categorical))
    return ColumnTransformer(parts, sparse_threshold=0)

def _dn_float(v):
    try:
        v = float(v)
    except Exception:
        return None
    return v if v == v and v not in (float("inf"), float("-inf")) else None

def _dn_py(v):
    """numpy scalar -> plain Python (JSON-safe)."""
    if hasattr(v, "item"):
        v = v.item()
    if isinstance(v, float) and v != v:
        return None
    return v

def _dn_sklearn_train(payload_json):
    import numpy as np
    from sklearn.pipeline import Pipeline
    from sklearn.model_selection import train_test_split
    from sklearn import metrics as M
    from sklearn.inspection import permutation_importance

    started = time.perf_counter()
    p = json.loads(payload_json)
    task, algorithm, features, target = p["task"], p["algorithm"], p["features"], p.get("target")
    seed = int(p.get("seed", 42))
    hp = p.get("hyperparameters") or {}
    frame = _dn_sklearn_frame(p["rows"], features + ([target] if target else []))

    estimator = _dn_sklearn_estimator(task, algorithm, hp, seed)
    model = Pipeline([("prep", _dn_sklearn_preprocessor(frame[features])), ("model", estimator)])
    out = {"metrics": {}, "featureImportance": [], "evaluation": {"actual": [], "predicted": []}}

    if task == "clustering":
        X = frame[features]
        labels = model.fit_predict(X)
        Xt = model.named_steps["prep"].transform(X)
        sizes = np.bincount(labels).tolist()
        sil = M.silhouette_score(Xt, labels, sample_size=min(len(Xt), 2000), random_state=seed) if len(set(labels)) > 1 else 0.0
        out["metrics"] = {"inertia": float(estimator.inertia_), "silhouette": float(sil), "clusterSizes": sizes}
        out["evaluation"]["predicted"] = [int(l) for l in labels[:2000]]
        out["trainRows"], out["testRows"] = int(len(X)), 0
    else:
        frame = frame[frame[target].notna()]
        X, y = frame[features], frame[target]
        stratify = None
        if task == "classification":
            counts = y.value_counts()
            stratify = y if counts.min() >= 2 else None
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=float(p.get("testSize", 0.2)),
                                                  random_state=seed, stratify=stratify)
        model.fit(X_tr, y_tr)
        pred = model.predict(X_te)
        out["trainRows"], out["testRows"] = int(len(X_tr)), int(len(X_te))
        if task == "classification":
            classes = [_dn_py(c) for c in model.classes_]
            out["classes"] = classes
            binary = len(classes) == 2
            avg = "binary" if binary else "macro"
            kw = {"pos_label": model.classes_[1]} if binary else {}
            out["metrics"] = {
                "accuracy": float(M.accuracy_score(y_te, pred)),
                "precision": float(M.precision_score(y_te, pred, average=avg, zero_division=0, **kw)),
                "recall": float(M.recall_score(y_te, pred, average=avg, zero_division=0, **kw)),
                "f1Score": float(M.f1_score(y_te, pred, average=avg, zero_division=0, **kw)),
                "confusionMatrix": M.confusion_matrix(y_te, pred, labels=model.classes_).tolist(),
            }
            if binary and hasattr(model, "predict_proba"):
                scores = model.predict_proba(X_te)[:, 1]
                out["evaluation"]["scores"] = [float(s) for s in scores]
                if len(set(y_te)) == 2:
                    out["metrics"]["rocAuc"] = float(M.roc_auc_score((y_te == model.classes_[1]).astype(int), scores))
        else:
            out["metrics"] = {
                "rmse": float(np.sqrt(M.mean_squared_error(y_te, pred))),
                "mae": float(M.mean_absolute_error(y_te, pred)),
                "r2Score": float(M.r2_score(y_te, pred)),
            }
        out["evaluation"]["actual"] = [_dn_py(v) for v in y_te.tolist()]
        out["evaluation"]["predicted"] = [_dn_py(v) for v in pred.tolist()]
        sample = X_te if len(X_te) <= 500 else X_te.sample(500, random_state=seed)
        y_sample = y_te.loc[sample.index]
        pi = permutation_importance(model, sample, y_sample, n_repeats=3, random_state=seed)
        imp = np.clip(pi.importances_mean, 0, None)
        total = float(imp.sum())
        out["featureImportance"] = sorted(
            [{"feature": f, "importance": (float(v) / total) if total > 0 else 1.0 / len(features)} for f, v in zip(features, imp)],
            key=lambda r: -r["importance"])

    _dn_models[p["modelId"]] = {"model": model, "task": task, "features": features}
    out["trainingTimeMs"] = int((time.perf_counter() - started) * 1000)
    return json.dumps(out)

def _dn_sklearn_predict(payload_json):
    p = json.loads(payload_json)
    entry = _dn_models.get(p["modelId"])
    if entry is None:
        raise KeyError("This scikit-learn model is no longer in memory (the Python runtime was restarted). Retrain it.")
    model, task, features = entry["model"], entry["task"], entry["features"]
    X = _dn_sklearn_frame(p["rows"], features)
    pred = model.predict(X)
    results = []
    proba = model.predict_proba(X) if task == "classification" and hasattr(model, "predict_proba") else None
    for i, value in enumerate(pred):
        item = {"value": _dn_py(value)}
        if task == "clustering":
            item["value"] = f"Cluster {int(value) + 1}"
        if proba is not None:
            probs = {str(_dn_py(c)): float(pr) for c, pr in zip(model.classes_, proba[i])}
            item["probabilities"] = probs
            item["confidence"] = max(probs.values())
        results.append(item)
    return json.dumps(results)

def _dn_sklearn_forget(payload_json):
    _dn_models.pop(json.loads(payload_json)["modelId"], None)
    return json.dumps(True)
`

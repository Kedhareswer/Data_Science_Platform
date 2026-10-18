/**
 * Python helpers installed once into the Pyodide interpreter. User code and
 * user data are never interpolated into Python source: data arrives as JSON
 * through `globals`, and code runs through `pyodide.runPythonAsync`.
 */
export const BOOTSTRAP_PY = String.raw`
import io, json, base64, sys, traceback

_dn_dataset_version = None

def _dn_load_dataset(version, columns_json, rows_json):
    """(Re)build the global DataFrame \`df\` when the notebook data changed."""
    global _dn_dataset_version
    if version == _dn_dataset_version:
        return False
    import pandas as pd
    frame = pd.DataFrame(json.loads(rows_json), columns=json.loads(columns_json))
    globals()["df"] = frame
    globals()["data"] = frame  # backwards-compatible alias
    _dn_dataset_version = version
    return True

def _dn_capture_figures():
    if "matplotlib" not in sys.modules:
        return []
    import matplotlib.pyplot as plt
    out = []
    for num in plt.get_fignums():
        buf = io.BytesIO()
        plt.figure(num).savefig(buf, format="png", bbox_inches="tight", dpi=110)
        out.append(base64.b64encode(buf.getvalue()).decode("ascii"))
    plt.close("all")
    return out

def _dn_describe(value):
    """Return (repr, table) for the last expression of a cell."""
    if value is None:
        return None, None
    table = None
    try:
        import pandas as pd
        if isinstance(value, pd.Series):
            value_frame = value.to_frame()
        elif isinstance(value, pd.DataFrame):
            value_frame = value
        else:
            value_frame = None
        if value_frame is not None:
            head = value_frame.head(100).reset_index()
            head.columns = [str(c) for c in head.columns]
            table = {
                "columns": list(head.columns),
                "rows": json.loads(head.to_json(orient="records", date_format="iso", default_handler=str)),
                "totalRows": int(len(value_frame)),
            }
    except Exception:
        table = None
    text = repr(value)
    if len(text) > 20000:
        text = text[:20000] + "\n… (truncated)"
    return text, table

def _dn_export(name):
    import pandas as pd
    value = globals().get(name)
    if not isinstance(value, pd.DataFrame):
        raise TypeError(f"'{name}' is not a pandas DataFrame")
    frame = value.reset_index(drop=True)
    frame.columns = [str(c) for c in frame.columns]
    return json.dumps({
        "columns": list(frame.columns),
        "rows": json.loads(frame.to_json(orient="records", date_format="iso", default_handler=str)),
    })

def _dn_setup_matplotlib():
    try:
        import matplotlib
        matplotlib.use("Agg")
    except Exception:
        pass
`

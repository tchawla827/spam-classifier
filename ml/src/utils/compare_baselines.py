#!/usr/bin/env python
"""Compare all trained model metrics and save a summary report.

Auto-discovers ml/reports/metrics_*.json files, prints a side-by-side
comparison table, and writes ml/reports/baseline_comparison.json.

Usage (from repo root):
    python -m ml.src.training.compare_baselines
"""

import json
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_REPORTS_DIR = _PROJECT_ROOT / "ml" / "reports"

_METRIC_KEYS = ("accuracy", "precision", "recall", "f1", "roc_auc")


def _discover_models() -> list[tuple[str, dict]]:
    """Find all metrics_*.json files and load them."""
    models = []
    for path in sorted(_REPORTS_DIR.glob("metrics_*.json")):
        if path.name == "metrics_.json":
            continue
        name = path.stem.replace("metrics_", "")
        data = json.loads(path.read_text())
        models.append((name, data))
    return models


def _row(label: str, metrics: dict) -> str:
    parts = [f"{label:<28}"]
    for key in _METRIC_KEYS:
        val = metrics.get(key)
        parts.append(f"{val:>8.4f}" if val is not None else "     N/A")
    return "  ".join(parts)


def main() -> None:
    models = _discover_models()
    if not models:
        print("[WARN] No metrics files found in ml/reports/. Train models first.")
        return

    print(f"\nFound {len(models)} model(s): {', '.join(n for n, _ in models)}")

    for split in ("val", "test"):
        header = f"{'Model':<28}  " + "  ".join(f"{k:>8}" for k in _METRIC_KEYS)
        sep = "-" * len(header)
        print(f"\n── {split.upper()} SPLIT ──────────────────────────────────────────")
        print(header)
        print(sep)
        for name, record in models:
            model_name = record.get("model", name)
            if split in record:
                print(_row(model_name, record[split]))
            else:
                print(f"  {model_name:<28}  (no '{split}' data)")

    # Build comparison record
    comparison: dict = {}
    for split in ("val", "test"):
        comparison[split] = {}
        for name, record in models:
            model_name = record.get("model", name)
            if split in record:
                comparison[split][model_name] = record[split]

        # Determine winner per split by F1
        if comparison[split]:
            best_name = max(
                ((k, v) for k, v in comparison[split].items() if isinstance(v, dict)),
                key=lambda kv: kv[1].get("f1", 0.0),
            )[0]
            comparison[split]["winner_by_f1"] = best_name

    output_path = _REPORTS_DIR / "baseline_comparison.json"
    output_path.write_text(json.dumps(comparison, indent=2))
    logger.info("Baseline comparison saved -> %s", output_path)

    print(f"\n[OK] Comparison saved -> {output_path}")
    for split in ("val", "test"):
        winner = comparison[split].get("winner_by_f1", "N/A")
        print(f"  {split} winner (F1): {winner}")


if __name__ == "__main__":
    main()

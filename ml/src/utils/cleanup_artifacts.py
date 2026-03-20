#!/usr/bin/env python
"""Clean up all training artifacts for a fresh retrain.

Removes:
  - Trained model artifacts (.joblib)
  - Cached feature matrices (.npz, .npy)
  - Metrics reports (.json)
  - Production bundle directory

Usage (from repo root):
    python -m ml.src.training.cleanup_artifacts
"""

import logging
import shutil
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_ARTIFACTS_DIR = _PROJECT_ROOT / "ml" / "artifacts"
_REPORTS_DIR = _PROJECT_ROOT / "ml" / "reports"


def main() -> None:
    print("\n── Cleaning Training Artifacts ──────────────────────────────────")

    # Pattern cleanup
    patterns = {
        _ARTIFACTS_DIR: ["*.joblib", "*.npz", "*.npy", "*.json"],
        _REPORTS_DIR: ["metrics_*.json", "baseline_comparison.json"],
    }

    removed_count = 0
    for directory, globs in patterns.items():
        if not directory.exists():
            continue
        for pattern in globs:
            for path in directory.glob(pattern):
                path.unlink()
                logger.info("Removed: %s", path.name)
                removed_count += 1

    # Remove bundle directory
    bundle_dir = _ARTIFACTS_DIR / "bundle"
    if bundle_dir.exists():
        shutil.rmtree(bundle_dir)
        logger.info("Removed: bundle/ directory")
        removed_count += 1

    print(f"\n[OK] Cleaned {removed_count} artifacts.")
    print("     Ready to retrain from scratch.")


if __name__ == "__main__":
    main()

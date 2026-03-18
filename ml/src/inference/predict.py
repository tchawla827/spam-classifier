"""
Inference entrypoint: loads the trained artifact bundle and runs predictions.

TODO Phase 7: Implement artifact loading and prediction:
  1. Load the exported feature pipeline, base models, and stacking meta-model
  2. Preprocess raw subject + body input
  3. Extract features through the saved pipeline
  4. Compute per-model calibrated probabilities
  5. Run ensemble stacker to produce final probability
  6. Return structured output matching the API response schema
"""

from typing import Any


def load_artifacts(artifact_dir: str) -> dict[str, Any]:
    """Load the exported model artifact bundle from disk."""
    # TODO Phase 7: implement joblib artifact loading
    raise NotImplementedError("Artifact loading not yet implemented.")


def predict(subject: str, body: str, artifacts: dict[str, Any]) -> dict[str, Any]:
    """Run inference on a single email and return structured prediction output."""
    # TODO Phase 7: implement full inference pipeline
    raise NotImplementedError("Inference not yet implemented.")


if __name__ == "__main__":
    print("Inference placeholder — not yet implemented.")
    print("See TASKS.md Phase 7 for implementation steps.")

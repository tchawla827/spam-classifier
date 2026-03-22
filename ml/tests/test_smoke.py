"""Smoke test: verify the ML artifact bundle loads without errors."""

import json
from pathlib import Path

import pytest

BUNDLE_DIR = Path(__file__).resolve().parents[1] / "artifacts" / "bundle"

REQUIRED_BUNDLE_FILES = [
    "feature_pipeline.joblib",
    "stacker_model.joblib",
    "model_metadata.json",
]


@pytest.fixture(scope="module")
def bundle_dir():
    if not BUNDLE_DIR.exists():
        pytest.skip("Artifact bundle not found — run training pipeline first")
    return BUNDLE_DIR


def test_bundle_directory_exists(bundle_dir):
    assert bundle_dir.is_dir()


def test_required_files_present(bundle_dir):
    for filename in REQUIRED_BUNDLE_FILES:
        assert (bundle_dir / filename).exists(), f"Missing artifact: {filename}"


def test_metadata_json_parseable(bundle_dir):
    metadata_path = bundle_dir / "model_metadata.json"
    with open(metadata_path) as f:
        meta = json.load(f)
    assert "version" in meta
    assert "calibrated_artifacts" in meta or "base_models" in meta


def test_load_artifacts_returns_expected_keys(bundle_dir):
    import sys
    project_root = str(Path(__file__).resolve().parents[2])
    if project_root not in sys.path:
        sys.path.insert(0, project_root)

    from ml.src.inference.predict import load_artifacts

    artifacts = load_artifacts(str(bundle_dir))
    assert "feature_pipeline" in artifacts
    assert "metadata" in artifacts
    assert "stacker" in artifacts

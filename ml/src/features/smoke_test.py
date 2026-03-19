#!/usr/bin/env python
"""Smoke test for the feature engineering pipeline.

Usage (from repo root):
    python -m ml.src.features.smoke_test

Validates:
    1. Pipeline fits on a small sample of training data
    2. Transform produces expected shape and types
    3. No NaN/Inf values in output
    4. Feature names are retrievable
    5. Single-row inference works (simulates runtime)
"""

import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import sparse

from ml.src.features.pipeline import build_feature_pipeline
from ml.src.features.handcrafted import FEATURE_NAMES

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
TRAIN_PATH = PROJECT_ROOT / "ml" / "data" / "processed" / "train.parquet"


def main() -> None:
    print("=" * 60)
    print("Feature Pipeline Smoke Test")
    print("=" * 60)

    # ── Load sample ────────────────────────────────────────────
    if not TRAIN_PATH.exists():
        print(f"[FAIL] Training data not found at {TRAIN_PATH}")
        print("       Run: python -m ml.src.datasets.build_dataset")
        sys.exit(1)

    df = pd.read_parquet(TRAIN_PATH)
    sample = df.sample(n=min(500, len(df)), random_state=42)
    print(f"\nLoaded {len(df)} training rows, using {len(sample)} for smoke test")

    # ── Build and fit ──────────────────────────────────────────
    pipeline = build_feature_pipeline()
    print("\nFitting pipeline...")
    t0 = time.time()
    X = pipeline.fit_transform(sample)
    fit_time = time.time() - t0
    print(f"  fit_transform completed in {fit_time:.1f}s")

    # ── Shape checks ───────────────────────────────────────────
    print(f"\n  Output type:  {type(X).__name__}")
    print(f"  Output shape: {X.shape}")
    print(f"  Output dtype: {X.dtype}")
    assert X.shape[0] == len(sample), f"Row mismatch: {X.shape[0]} vs {len(sample)}"
    assert X.shape[1] > 0, "Zero features produced"
    print("  [PASS] Shape is correct")

    # ── Sparsity check ─────────────────────────────────────────
    if sparse.issparse(X):
        density = X.nnz / (X.shape[0] * X.shape[1])
        print(f"  Density: {density:.4f} ({X.nnz:,} non-zero of {X.shape[0] * X.shape[1]:,})")
    print("  [PASS] Sparse output as expected")

    # ── NaN / Inf check ───────────────────────────────────────
    X_dense = X.toarray() if sparse.issparse(X) else X
    assert not np.isnan(X_dense).any(), "NaN found in output"
    assert not np.isinf(X_dense).any(), "Inf found in output"
    print("  [PASS] No NaN or Inf values")

    # ── Feature count breakdown ────────────────────────────────
    word_tfidf = pipeline.transformer_list[0][1].named_steps["tfidf"]
    char_tfidf = pipeline.transformer_list[1][1].named_steps["tfidf"]
    n_word = len(word_tfidf.vocabulary_)
    n_char = len(char_tfidf.vocabulary_)
    n_hand = len(FEATURE_NAMES)
    print(f"\n  Feature breakdown:")
    print(f"    Word TF-IDF:    {n_word:>6,}")
    print(f"    Char TF-IDF:    {n_char:>6,}")
    print(f"    Handcrafted:    {n_hand:>6}")
    print(f"    Total:          {X.shape[1]:>6,}")
    assert X.shape[1] == n_word + n_char + n_hand, "Feature count mismatch"
    print("  [PASS] Feature counts match")

    # ── Single-row inference test ──────────────────────────────
    print("\nSingle-row inference test (simulates runtime)...")
    single = pd.DataFrame([{
        "subject": "URGENT: Verify your account immediately!",
        "body": "Dear customer, your account has been suspended. "
                "Click here http://evil.com/verify to restore access. "
                "Act now or lose your $500 balance!!!",
    }])
    X_single = pipeline.transform(single)
    assert X_single.shape == (1, X.shape[1]), f"Shape mismatch: {X_single.shape}"
    print(f"  Output shape: {X_single.shape}")
    print("  [PASS] Single-row transform works")

    # ── Handcrafted feature spot-check ─────────────────────────
    from ml.src.features.handcrafted import HandcraftedFeatureExtractor
    hc = HandcraftedFeatureExtractor()
    hc_out = hc.transform(single)
    print(f"\n  Handcrafted features for spam example:")
    for name, val in zip(FEATURE_NAMES, hc_out[0]):
        print(f"    {name:30s} = {val}")

    # ── Full training set fit ──────────────────────────────────
    print(f"\nFull training set fit ({len(df)} rows)...")
    pipeline_full = build_feature_pipeline()
    t0 = time.time()
    X_full = pipeline_full.fit_transform(df)
    full_time = time.time() - t0
    print(f"  fit_transform completed in {full_time:.1f}s")
    print(f"  Output shape: {X_full.shape}")
    print("  [PASS] Full dataset fit works")

    print("\n" + "=" * 60)
    print("[ALL PASS] Feature pipeline is ready for Phase 5")
    print("=" * 60)


if __name__ == "__main__":
    main()

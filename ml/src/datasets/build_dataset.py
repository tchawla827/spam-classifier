#!/usr/bin/env python
"""Build the unified, cleaned, deduplicated dataset from all raw sources.

Usage (from repo root):
    python -m ml.src.datasets.build_dataset

Outputs:
    ml/data/processed/dataset_full.parquet   – all cleaned, deduped records
    ml/data/processed/train.parquet          – training split
    ml/data/processed/val.parquet            – validation split
    ml/data/processed/test.parquet           – test split
    ml/data/processed/build_report.json      – summary statistics
"""

import json
import logging
import sys
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

from ml.src.datasets.common_schema import COLUMNS
from ml.src.datasets import spamassassin_adapter, nazario_adapter, enron_adapter
from ml.src.preprocessing.text_cleaning import clean_dataframe, deduplicate

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
RAW_DIR = PROJECT_ROOT / "ml" / "data" / "raw"
PROCESSED_DIR = PROJECT_ROOT / "ml" / "data" / "processed"

# Split ratios
TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15
SPLIT_SEED = 42


def _collect_records() -> pd.DataFrame:
    """Load records from every adapter and return a raw DataFrame."""
    records: list[dict] = []

    logger.info("── Loading SpamAssassin ──")
    for rec in spamassassin_adapter.load(RAW_DIR / "spamassassin"):
        records.append(rec.to_dict())

    logger.info("── Loading Nazario phishing ──")
    for rec in nazario_adapter.load(RAW_DIR / "nazario_phishing"):
        records.append(rec.to_dict())

    logger.info("── Loading Enron ──")
    for rec in enron_adapter.load(RAW_DIR / "enron"):
        records.append(rec.to_dict())

    df = pd.DataFrame(records, columns=COLUMNS)
    logger.info("Collected %d raw records", len(df))
    return df


def _split(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Stratified train / val / test split.

    Splits are done on the label column to preserve class distribution.
    The split happens AFTER deduplication to prevent leakage.
    """
    train_df, temp_df = train_test_split(
        df,
        test_size=(VAL_RATIO + TEST_RATIO),
        stratify=df["label"],
        random_state=SPLIT_SEED,
    )
    relative_test = TEST_RATIO / (VAL_RATIO + TEST_RATIO)
    val_df, test_df = train_test_split(
        temp_df,
        test_size=relative_test,
        stratify=temp_df["label"],
        random_state=SPLIT_SEED,
    )
    return (
        train_df.reset_index(drop=True),
        val_df.reset_index(drop=True),
        test_df.reset_index(drop=True),
    )


def _build_report(
    raw_count: int,
    cleaned_count: int,
    deduped_count: int,
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> dict:
    """Generate a JSON-serialisable build report."""

    def _label_counts(df: pd.DataFrame) -> dict:
        counts = df["label"].value_counts().to_dict()
        return {"ham": int(counts.get(0, 0)), "spam": int(counts.get(1, 0))}

    def _source_counts(df: pd.DataFrame) -> dict:
        return {k: int(v) for k, v in df["source"].value_counts().to_dict().items()}

    full = pd.concat([train_df, val_df, test_df])
    return {
        "raw_records": raw_count,
        "after_cleaning": cleaned_count,
        "after_dedup": deduped_count,
        "splits": {
            "train": len(train_df),
            "val": len(val_df),
            "test": len(test_df),
        },
        "label_distribution": _label_counts(full),
        "source_distribution": _source_counts(full),
        "split_label_distribution": {
            "train": _label_counts(train_df),
            "val": _label_counts(val_df),
            "test": _label_counts(test_df),
        },
    }


def main() -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Collect
    df = _collect_records()
    raw_count = len(df)

    # 2. Clean
    df = clean_dataframe(df)
    cleaned_count = len(df)
    logger.info("After cleaning: %d records", cleaned_count)

    # 3. Deduplicate
    df = deduplicate(df)
    deduped_count = len(df)
    logger.info("After dedup: %d records", deduped_count)

    # 4. Save full dataset
    full_path = PROCESSED_DIR / "dataset_full.parquet"
    df.to_parquet(full_path, index=False)
    logger.info("Saved full dataset → %s", full_path)

    # 5. Split
    train_df, val_df, test_df = _split(df)
    train_df.to_parquet(PROCESSED_DIR / "train.parquet", index=False)
    val_df.to_parquet(PROCESSED_DIR / "val.parquet", index=False)
    test_df.to_parquet(PROCESSED_DIR / "test.parquet", index=False)
    logger.info(
        "Splits saved → train=%d  val=%d  test=%d",
        len(train_df), len(val_df), len(test_df),
    )

    # 6. Report
    report = _build_report(raw_count, cleaned_count, deduped_count, train_df, val_df, test_df)
    report_path = PROCESSED_DIR / "build_report.json"
    report_path.write_text(json.dumps(report, indent=2))
    logger.info("Build report → %s", report_path)

    print("\n[OK] Dataset build complete.")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

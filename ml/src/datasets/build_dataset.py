#!/usr/bin/env python
"""Build the unified, cleaned, deduplicated dataset from all raw sources.

Usage (from repo root):
    python -m ml.src.datasets.build_dataset

Outputs:
    ml/data/processed/dataset_full.parquet   - all cleaned, deduped records
    ml/data/processed/train.parquet          - training split
    ml/data/processed/val.parquet            - validation split
    ml/data/processed/test.parquet           - test split
    ml/data/processed/build_report.json      - summary statistics

Smart resampling
----------------
The pipeline uses a two-pass approach so the ham:spam ratio is always close
to TARGET_HAM_RATIO (default 3.0) regardless of how many sources are added:

  1. Load ALL spam-labelled data from every source.
  2. Count total spam → compute target ham = spam * TARGET_HAM_RATIO.
  3. Load ham data from smaller sources first (SpamAssassin, TREC).
  4. Use Enron as the "fill" source — its cap = target_ham - ham_already_loaded.
"""

import json
import logging
import sys
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

from ml.src.datasets.common_schema import (
    COLUMNS,
    LABEL_HAM,
    LABEL_SPAM,
    SOURCE_TREC05,
    SOURCE_TREC06,
    SOURCE_FRAUDULENT,
)
from ml.src.datasets import spamassassin_adapter, nazario_adapter, enron_adapter, trec_adapter, fraudulent_adapter
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

# Target ham:spam ratio for balanced training
TARGET_HAM_RATIO = 3.0


def _records_to_df(records: list[dict]) -> pd.DataFrame:
    """Convert a list of record dicts to a DataFrame with the standard schema."""
    return pd.DataFrame(records, columns=COLUMNS)


def _collect_all_spam() -> list[dict]:
    """Load spam records from every source (first pass)."""
    records: list[dict] = []

    # SpamAssassin spam
    logger.info("== Pass 1: Loading SpamAssassin (spam only) ==")
    for rec in spamassassin_adapter.load(RAW_DIR / "spamassassin"):
        if rec.label == LABEL_SPAM:
            records.append(rec.to_dict())

    # Nazario (all spam)
    logger.info("== Pass 1: Loading Nazario phishing ==")
    for rec in nazario_adapter.load(RAW_DIR / "nazario_phishing"):
        records.append(rec.to_dict())

    # Fraudulent Emails Dataset (all spam)
    fraudulent_dir = RAW_DIR / "fraudulent_emails"
    if fraudulent_dir.exists():
        logger.info("== Pass 1: Loading Fraudulent Emails Dataset ==")
        for rec in fraudulent_adapter.load(fraudulent_dir):
            if rec.label == LABEL_SPAM:
                records.append(rec.to_dict())

    # TREC 2005 spam
    trec05_dir = RAW_DIR / "trec05"
    if trec05_dir.exists():
        logger.info("== Pass 1: Loading TREC 2005 (spam only) ==")
        for rec in trec_adapter.load(trec05_dir, source_tag=SOURCE_TREC05):
            if rec.label == LABEL_SPAM:
                records.append(rec.to_dict())

    # TREC 2006 spam
    trec06_dir = RAW_DIR / "trec06"
    if trec06_dir.exists():
        logger.info("== Pass 1: Loading TREC 2006 (spam only) ==")
        for rec in trec_adapter.load(trec06_dir, source_tag=SOURCE_TREC06):
            if rec.label == LABEL_SPAM:
                records.append(rec.to_dict())

    return records


def _collect_non_enron_ham() -> list[dict]:
    """Load ham records from all sources except Enron (second pass)."""
    records: list[dict] = []

    # SpamAssassin ham
    logger.info("== Pass 2: Loading SpamAssassin (ham only) ==")
    for rec in spamassassin_adapter.load(RAW_DIR / "spamassassin"):
        if rec.label == LABEL_HAM:
            records.append(rec.to_dict())

    # TREC 2005 ham
    trec05_dir = RAW_DIR / "trec05"
    if trec05_dir.exists():
        logger.info("== Pass 2: Loading TREC 2005 (ham only) ==")
        for rec in trec_adapter.load(trec05_dir, source_tag=SOURCE_TREC05):
            if rec.label == LABEL_HAM:
                records.append(rec.to_dict())

    # TREC 2006 ham
    trec06_dir = RAW_DIR / "trec06"
    if trec06_dir.exists():
        logger.info("== Pass 2: Loading TREC 2006 (ham only) ==")
        for rec in trec_adapter.load(trec06_dir, source_tag=SOURCE_TREC06):
            if rec.label == LABEL_HAM:
                records.append(rec.to_dict())

    return records


def _collect_records() -> pd.DataFrame:
    """Two-pass smart collection with dynamic Enron cap for class balance."""

    # --- Pass 1: all spam ---
    spam_records = _collect_all_spam()
    spam_count = len(spam_records)
    logger.info("Pass 1 complete: %d spam records collected", spam_count)

    # --- Compute ham budget ---
    target_ham = int(spam_count * TARGET_HAM_RATIO)
    logger.info("Target ham count: %d (ratio %.1f:1)", target_ham, TARGET_HAM_RATIO)

    # --- Pass 2: non-Enron ham ---
    ham_records = _collect_non_enron_ham()
    non_enron_ham = len(ham_records)
    logger.info("Pass 2 complete: %d non-Enron ham records", non_enron_ham)

    # --- Pass 3: Enron as "fill" ---
    enron_budget = max(0, target_ham - non_enron_ham)
    if enron_budget > 0:
        logger.info("== Pass 3: Loading Enron (cap=%d to fill ham budget) ==", enron_budget)
        for rec in enron_adapter.load(RAW_DIR / "enron", max_emails=enron_budget):
            ham_records.append(rec.to_dict())
    else:
        logger.info("== Pass 3: Skipping Enron (ham budget already met) ==")

    # Combine
    all_records = spam_records + ham_records
    df = pd.DataFrame(all_records, columns=COLUMNS)
    logger.info("Total collected: %d records (spam=%d, ham=%d)",
                len(df), spam_count, len(ham_records))
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
    label_dist = _label_counts(full)
    ham = label_dist["ham"]
    spam = label_dist["spam"]
    ratio = round(ham / spam, 2) if spam > 0 else float("inf")

    return {
        "raw_records": raw_count,
        "after_cleaning": cleaned_count,
        "after_dedup": deduped_count,
        "ham_spam_ratio": f"{ratio}:1",
        "splits": {
            "train": len(train_df),
            "val": len(val_df),
            "test": len(test_df),
        },
        "label_distribution": label_dist,
        "source_distribution": _source_counts(full),
        "split_label_distribution": {
            "train": _label_counts(train_df),
            "val": _label_counts(val_df),
            "test": _label_counts(test_df),
        },
    }


def main() -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Smart collect with resampling
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
    logger.info("Saved full dataset -> %s", full_path)

    # 5. Split
    train_df, val_df, test_df = _split(df)
    train_df.to_parquet(PROCESSED_DIR / "train.parquet", index=False)
    val_df.to_parquet(PROCESSED_DIR / "val.parquet", index=False)
    test_df.to_parquet(PROCESSED_DIR / "test.parquet", index=False)
    logger.info(
        "Splits saved -> train=%d  val=%d  test=%d",
        len(train_df), len(val_df), len(test_df),
    )

    # 6. Report
    report = _build_report(raw_count, cleaned_count, deduped_count, train_df, val_df, test_df)
    report_path = PROCESSED_DIR / "build_report.json"
    report_path.write_text(json.dumps(report, indent=2))
    logger.info("Build report -> %s", report_path)

    print("\n[OK] Dataset build complete.")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

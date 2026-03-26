# Machine Learning Pipeline

The ML pipeline lives in `ml/` and produces a self-contained artifact bundle that the API loads at startup. The API never retrains models at runtime.

---

## Directory layout

```
ml/
├── src/
│   ├── datasets/        # Dataset adapters and merger
│   ├── features/        # Feature extraction pipeline
│   ├── preprocessing/   # Text cleaning
│   ├── training/        # Per-model trainers and orchestrator
│   ├── inference/       # predict.py — runtime inference
│   └── utils/           # Bundle export, evaluation, calibration
├── scripts/             # Dataset download and validation helpers
├── tests/               # Inference and smoke tests
└── artifacts/
    └── bundle/          # Exported artifacts (loaded by the API)
```

---

## Inference (production path)

The API loads the bundle once at startup via `ml.src.inference.predict.load_artifacts()`. All inference is done by `predict()`:

```python
from ml.src.inference.predict import predict

result = predict(subject="Win a prize!", body="Click here now.", artifacts=app.state.artifacts)
```

### Output shape

```python
{
    "final_prediction": "spam",       # "spam" | "not_spam"
    "final_risk_score": 0.9312,       # stacker ensemble probability [0, 1]
    "risk_band": "high",              # "low" | "medium" | "high"
    "agreement_ratio": 1.0,           # fraction of displayed base models agreeing
    "models": [
        {"name": "logistic_regression", "prediction": "spam", "confidence": 0.94},
        {"name": "linear_svm",          "prediction": "spam", "confidence": 0.90},
        {"name": "xgboost",             "prediction": "spam", "confidence": 0.96},
        {"name": "lightgbm",            "prediction": "spam", "confidence": 0.92},
    ],
    "ensemble": {"name": "stacked_ensemble", "prediction": "spam", "confidence": 0.93},
    "explanations": {
        "top_signals": ["Contains suspicious keywords: prize, winner", "Contains 1 URL(s)"],
        "subject_signals": [],
        "body_signals": ["Contains 'click here' call-to-action"],
    },
    "model_version": "v1.0.0",
}
```

### Risk bands

| Band | Score range |
|------|------------|
| `low` | < 0.33 |
| `medium` | 0.33 – 0.67 |
| `high` | ≥ 0.67 |

### Explanations

Explanations are heuristic — generated from the raw text, not SHAP values. They highlight:
- Suspicious keyword matches (from a fixed list of ~50 terms)
- URL count
- Uppercase ratio
- Exclamation mark count
- Dollar sign count
- All-caps subject
- "Click here" call-to-action
- Very short body

---

## Ensemble architecture

The ensemble uses a two-level stacking approach:

**Level 1 — Base models (calibrated)**

| Artifact key | Display name | Notes |
|-------------|-------------|-------|
| `logreg_calibrated` | `logistic_regression` | TF-IDF features |
| `svm_calibrated` | `linear_svm` | Linear kernel |
| `cnb_calibrated` | `complement_naive_bayes` | Internal only, not in API response |
| `xgb_calibrated` | `xgboost` | Gradient boosting |
| `lgbm_calibrated` | `lightgbm` | Gradient boosting |

All base models are calibrated with Platt scaling / isotonic regression so their outputs are well-calibrated probabilities.

**Level 2 — Stacker**

A logistic regression meta-learner that takes the five base model probabilities as input features and outputs the final `final_risk_score`. The stacker is trained on out-of-fold (OOF) predictions to avoid leakage.

---

## Feature pipeline

Defined in `ml/src/features/pipeline.py`. The pipeline processes a DataFrame with `subject` and `body` columns:

1. **Text normalization** (`text_normalizer.py`) — lowercasing, URL token replacement, punctuation normalisation
2. **TF-IDF** — character and word n-grams over concatenated subject+body
3. **Handcrafted features** (`handcrafted.py`) — numeric signals:
   - Subject/body character and word counts
   - Uppercase ratio
   - URL count
   - Suspicious keyword count
   - Exclamation and special character counts
   - HTML tag presence

The pipeline is serialised as `feature_pipeline.joblib` in the bundle.

---

## Datasets

Seven public spam datasets are supported. Adapters are in `ml/src/datasets/`:

| Adapter | Dataset |
|---------|---------|
| `enron_adapter` | Enron Email Dataset |
| `enron_spam_adapter` | Enron-Spam (alternate split) |
| `lingspam_adapter` | Ling-Spam |
| `spamassassin_adapter` | SpamAssassin public corpus |
| `trec_adapter` | TREC 2005/2006/2007 |
| `nazario_adapter` | Nazario phishing corpus |
| `fraudulent_adapter` | Fraudulent email dataset |

Each adapter normalizes its source to a common schema (`common_schema.py`) with `subject`, `body`, and `label` columns. `build_dataset.py` merges all adapters into a unified training set.

To download datasets:
```bash
cd ml
python scripts/download_datasets.py
python scripts/validate_datasets.py
```

---

## Training

### Full training run

```bash
cd ml
python -m src.training.orchestrate_training
```

This:
1. Loads and merges all available datasets
2. Runs the feature pipeline
3. Trains each base model with cross-validation
4. Builds OOF predictions
5. Trains the stacker
6. Calibrates all models
7. Exports the bundle

### Exporting the bundle

```bash
python -m src.utils.export_bundle
```

Writes to `ml/artifacts/bundle/`:
- `model_metadata.json` — version, thresholds, artifact names
- `feature_pipeline.joblib`
- `logreg_calibrated.joblib`, `svm_calibrated.joblib`, `cnb_calibrated.joblib`, `xgb_calibrated.joblib`, `lgbm_calibrated.joblib`
- `stacker.joblib`

### Validation

```bash
python -m src.utils.validate_artifacts      # check bundle integrity
python -m src.features.smoke_test           # quick inference smoke test
```

---

## Tests

```bash
cd ml
pytest tests/test_inference.py    # bundle loads and predict() returns correct shape
pytest tests/test_smoke.py        # feature pipeline smoke test
```

---

## `model_metadata.json` structure

```json
{
  "version": "v1.0.0",
  "trained_at": "2025-01-01T00:00:00Z",
  "calibrated_artifacts": [
    "logreg_calibrated",
    "svm_calibrated",
    "cnb_calibrated",
    "xgb_calibrated",
    "lgbm_calibrated"
  ],
  "stacker": "stacker",
  "base_models": ["logistic_regression", "linear_svm", "xgboost", "lightgbm"],
  "ensemble_threshold": 0.5,
  "model_thresholds": {
    "logreg": 0.5,
    "svm": 0.5,
    "cnb": 0.5,
    "xgb": 0.5,
    "lgbm": 0.5
  }
}
```

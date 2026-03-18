# Dataset and Training Notes

## 1. Goal
Use realistic public email datasets to build a credible spam classifier without overclaiming.

---

## 2. Dataset Strategy
Do not rely on a single toy dataset.

Use multiple public email sources where possible, normalized into one schema:
- legitimate email corpora
- spam corpora
- optionally chronological corpora for better evaluation realism

---

## 3. Unified Schema
Each row should map into:

- `id`
- `source`
- `subject`
- `body`
- `label`
- `timestamp` (if available)
- `meta`

Label convention:
- `1` = spam
- `0` = not spam

---

## 4. Data Cleaning Rules
- remove empty rows
- normalize missing subject/body
- strip exact duplicates
- detect near duplicates if feasible
- keep source metadata
- avoid merging train/test duplicates across corpora

---

## 5. Split Strategy
Avoid naive random split across the fully merged corpus if it creates leakage.

Preferred:
- train / validation / test
- source-aware split where needed
- time-aware split where possible
- dedupe before splitting

---

## 6. Feature Strategy
Use:
- subject-specific features
- body-specific features
- combined text features
- handcrafted risk indicators
- word TF-IDF
- char TF-IDF

---

## 7. Training Strategy
Start with:
- Logistic Regression
- Linear SVM

Then add:
- XGBoost
- LightGBM
- stacking meta-model

Calibrate before exposing confidence.

---

## 8. Evaluation Metrics
Track:
- precision
- recall
- F1
- ROC-AUC
- PR-AUC
- log loss
- confusion matrix
- calibration behavior

Do not rely on accuracy alone.

---

## 9. Export Rules
The final artifact bundle should include:
- preprocessing pipeline
- trained models
- calibration components
- stacker
- metadata
- version identifier

# ML

Offline training pipeline and inference utilities for the spam classifier ensemble.

## Structure

- `data/` — raw, interim, and processed datasets (not committed)
- `src/` — training, feature engineering, inference, and evaluation code
- `artifacts/` — exported model artifact bundles (not committed)
- `reports/` — evaluation outputs and model comparison reports
- `notebooks/` — exploratory notebooks (not in runtime path)

## Setup

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r ../apps/api/requirements/base.txt
# Additional ML deps will be added in Phase 3+
```

## Usage

Training and inference are implemented in Phases 3–7. See `TASKS.md` for the roadmap.

# Recommended Project Structure

## 1. Monorepo Root

```text
spam-classifier/
├── apps/
├── packages/
├── ml/
├── infra/
├── docs/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── Makefile
└── docker-compose.yml
```

---

## 2. apps/web

```text
apps/web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── history/
│   │   └── page.tsx
│   ├── privacy/
│   │   └── page.tsx
│   └── globals.css
├── components/
│   ├── classifier/
│   │   ├── classifier-form.tsx
│   │   ├── subject-input.tsx
│   │   ├── body-input.tsx
│   │   ├── classify-button.tsx
│   │   └── sample-inputs.tsx
│   ├── results/
│   │   ├── verdict-card.tsx
│   │   ├── risk-score-card.tsx
│   │   ├── model-comparison-grid.tsx
│   │   ├── model-confidence-card.tsx
│   │   ├── agreement-indicator.tsx
│   │   └── explanation-panel.tsx
│   ├── history/
│   │   ├── history-list.tsx
│   │   └── history-item.tsx
│   ├── layout/
│   │   ├── app-shell.tsx
│   │   ├── header.tsx
│   │   └── footer.tsx
│   └── ui/
├── lib/
│   ├── api.ts
│   ├── constants.ts
│   ├── formatters.ts
│   ├── storage.ts
│   └── validators.ts
├── hooks/
│   ├── use-classify.ts
│   └── use-history.ts
├── types/
│   └── api.ts
├── public/
└── tests/
```

Reasoning:
- group by product feature, not random file type only
- keep components small
- keep API and storage logic out of UI components

---

## 3. apps/api

```text
apps/api/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── classify.py
│   │       ├── health.py
│   │       ├── models.py
│   │       ├── history.py
│   │       └── gmail.py
│   ├── core/
│   │   ├── config.py
│   │   ├── logging.py
│   │   ├── security.py
│   │   └── exceptions.py
│   ├── schemas/
│   │   ├── classify.py
│   │   ├── common.py
│   │   ├── history.py
│   │   └── gmail.py
│   ├── services/
│   │   ├── inference_service.py
│   │   ├── explanation_service.py
│   │   ├── history_service.py
│   │   ├── gmail_oauth_service.py
│   │   └── gmail_message_service.py
│   ├── repositories/
│   │   ├── classification_repository.py
│   │   └── model_version_repository.py
│   ├── db/
│   │   ├── session.py
│   │   ├── base.py
│   │   ├── models.py
│   │   └── migrations/
│   ├── dependencies/
│   │   └── inference.py
│   └── main.py
├── tests/
│   ├── test_health.py
│   ├── test_classify.py
│   └── test_schemas.py
├── requirements/
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
├── Dockerfile
└── pyproject.toml
```

Reasoning:
- route handlers stay thin
- services handle business logic
- repositories isolate persistence
- schemas remain explicit
- future Gmail modules exist as placeholders without forcing full implementation

---

## 4. ml

```text
ml/
├── data/
│   ├── raw/
│   ├── interim/
│   └── processed/
├── src/
│   ├── datasets/
│   │   ├── common_schema.py
│   │   ├── load_spamassassin.py
│   │   ├── load_enron.py
│   │   ├── load_trec.py
│   │   └── build_dataset.py
│   ├── preprocessing/
│   │   ├── text_cleaning.py
│   │   ├── split.py
│   │   └── dedupe.py
│   ├── features/
│   │   ├── handcrafted.py
│   │   ├── vectorizers.py
│   │   └── pipeline.py
│   ├── training/
│   │   ├── train_logreg.py
│   │   ├── train_svm.py
│   │   ├── train_xgboost.py
│   │   ├── train_lightgbm.py
│   │   ├── train_stacker.py
│   │   └── orchestrate_training.py
│   ├── calibration/
│   │   └── calibrate.py
│   ├── evaluation/
│   │   ├── metrics.py
│   │   ├── reports.py
│   │   └── compare_models.py
│   ├── export/
│   │   └── export_artifacts.py
│   ├── inference/
│   │   ├── runtime_schema.py
│   │   ├── predict.py
│   │   └── explain.py
│   └── utils/
│       ├── io.py
│       └── constants.py
├── artifacts/
├── reports/
├── notebooks/
└── README.md
```

Reasoning:
- separate offline training from runtime inference
- training scripts remain individually callable
- orchestration file runs the full training pipeline
- artifact export is isolated and explicit

---

## 5. packages

```text
packages/
├── config/
│   ├── eslint/
│   ├── typescript/
│   └── prettier/
├── types/
│   └── index.ts
└── ui/   # optional only if shared components emerge
```

Keep this lean.
Do not over-engineer shared packages too early.

---

## 6. infra

```text
infra/
├── docker/
│   ├── api.Dockerfile
│   └── web.Dockerfile
├── scripts/
│   ├── dev.sh
│   ├── train.sh
│   └── smoke_test.sh
└── ci/
    └── github-actions-notes.md
```

---

## 7. docs

```text
docs/
├── architecture/
│   └── decisions.md
├── api/
│   └── contracts.md
├── security/
│   └── privacy.md
├── product/
│   └── roadmap.md
└── deployment/
    └── free-tier-notes.md
```

---

## 8. Structural Rules
- keep route files thin
- keep components focused
- avoid giant utility folders
- avoid circular imports
- do not couple frontend directly to ML internals
- do not put notebooks in the runtime path
- keep artifacts outside source code packages

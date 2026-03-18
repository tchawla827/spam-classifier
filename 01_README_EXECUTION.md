# Claude Code Execution Guide

## 1. Purpose
This file tells Claude Code how to approach implementation safely and efficiently.

---

## 2. Recommended Execution Order
1. Read `PRD.md`
2. Read `ARCHITECTURE.md`
3. Read `STRUCTURE.md`
4. Read `RULES.md`
5. Read `API_CONTRACTS.md`
6. Execute `TASKS.md` phase by phase
7. Use `TESTS.md` to validate each major milestone

---

## 3. Execution Strategy
- do not attempt full project generation in one pass
- complete one phase at a time
- after each phase:
  - verify files compile
  - verify types/tests where relevant
  - update docs if architecture changed

---

## 4. Priorities
Highest priority:
- clean scaffolding
- stable contracts
- working classify flow
- polished UI
- reliable inference output

Lower priority:
- persistence extras
- Gmail placeholders
- advanced tuning

---

## 5. Change Discipline
When implementing:
- prefer adding rather than rewriting
- preserve agreed folder structure
- keep commit-sized changes small
- do not drift into new features

---

## 6. If Stuck
If a decision is ambiguous:
1. follow `RULES.md`
2. choose the simpler option or ask me.
3. preserve future Gmail-ready architecture
4. leave clear TODOs instead of half-built risky features

---

## 7. Completion Standard
A phase is only complete when:
- relevant code runs
- contracts are respected
- touched tests pass or are added
- no major scope drift occurred

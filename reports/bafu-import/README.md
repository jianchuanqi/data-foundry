# BAFU import — trace & progress report

Generator for the consolidated BAFU 2025 V2 import trace + progress workbook.

- **`build-bafu-trace-xlsx.py`** — the generator (tracked in git).
- **`BAFU-导入trace与进展.xlsx`** — the generated report (git-ignored; regenerate from the script).

## What the workbook contains

| Sheet | Rows | Content |
|---|---|---|
| 说明 Read me | — | Overview + per-sheet guide |
| 导入进展 Summary | — | Coverage (verified / pending / gap) + per-import-round distribution |
| 待人工校验 Human Review | ~17 | Residual scopes, applied semantic mappings (with adversarial-verify verdicts), recorded residue |
| Process Trace | 11,747 | Every process: id / version / name / status / import round / timestamp |
| Flow Trace | ~14,019 | Every verified flow row: id / version / owning process / status / round / timestamp |
| 转换映射 Conversion | ~3,344 | Effective per-source-flow resolution (reuse → canonical, or mint) with basis / confidence |
| Support Identities | ~14,179 | Support datasets created/verified (contact / source / etc.) |

## How to regenerate

```bash
# default run dir: .foundry/workspaces/bafu-full-import-20260607T080646Z
uv run --with openpyxl python3 reports/bafu-import/build-bafu-trace-xlsx.py

# or point at a different import workspace:
BAFU_RUN_DIR=.foundry/workspaces/<other-run> \
  uv run --with openpyxl python3 reports/bafu-import/build-bafu-trace-xlsx.py
```

Paths resolve relative to the script (repo root is two directories up), and the run
directory can be overridden with the `BAFU_RUN_DIR` environment variable.

## Sources

Reads from the import run directory: `coverage-v19/bafu-process-universe.coverage.jsonl`,
`merged-verified-current/{ok.processes,ok.flows,verified-support-identities}.verified.jsonl`,
all `decisions-*/identity-decisions.jsonl`, and the TIDAS source under
`inputs/BAFU-2025 Version 2 - TIDAS 2026-03-09/tidas/{processes,flows}` for names.

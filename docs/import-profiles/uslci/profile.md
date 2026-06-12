---
title: USLCI Import Profile
docType: profile
scope: import-profile
status: draft
owner: tiangong-lca-data-foundry
related:
  - specs/import-profiles.json
  - docs/foundry-task-contracts.md
  - docs/skill-orchestration/dataset-authoring-skill-architecture.md
  - docs/uslci-import-runbook.md
  - inputs/source-packages/uslci-database-public.md
---

# USLCI Import Profile

This profile is the placeholder for USLCI package imports. It exists to keep USLCI as data/profile configuration, not as a Foundry code path.

## Lane

Use `external-dataset-curated-import` for structured USLCI source packages. Source extraction, conversion, validation, QA, curation queue state, and write/readback behavior must stay in the owning CLI, tools, skills, and database surfaces.

## Initial Policy

- No profile-specific QA waivers are defined yet.
- Preserve source-language/source-package evidence before row repair.
- Build entity queues with `tiangong-lca dataset curation-queue build`.
- Drive resumable work with `tiangong-lca dataset curation-queue next`.
- Require `tiangong-lca dataset curation-queue verify` before write planning.

## Resolved Decisions

- Source package format detection and converter owner (2026-06-12): the package is openLCA JSON-LD (auto-detected `openlca-jsonld`, high confidence); the converter owner is tidas-tools' `openlca-jsonld` adapter fronted by `tiangong-lca dataset import-lca convert`. The external U.S. electricity baseline library is frozen inside the package's `libraries/` directory so converting the package root yields a reference-closed conversion. Evidence and exact invocation (including the current CLI-wrapper flag workaround): `docs/uslci-import-runbook.md` Phase 0/1 and `inputs/source-packages/uslci-database-public.md`.

## Open Decisions

Owned by the pilot phase of `docs/uslci-import-runbook.md` (Phase 4, D2-D4):

- USLCI source citation/source row policy (NREL attribution, bin/ attachments).
- Any profile-specific QA observations that should be warnings rather than blockers (LCI_RESULT processes, allocationFactors, amountFormula, unsupported flow properties).
- Account/state-code/write policy (human approval gates `allow_remote_commit`).

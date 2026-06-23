---
title: USLCI Import Constraints
docType: constraints
scope: import-profile
status: draft
owner: tiangong-lca-data-foundry
related:
  - docs/import-profiles/uslci/profile.md
  - specs/import-profiles.json
---

# USLCI Import Constraints

## Authorized: account-local "My Data" creation override (2026-06-23, D4-elementary)

The user explicitly authorized `allow_account_local_support_and_elementary` for the USLCI profile (`specs/import-profiles.json`), mirroring the BAFU 2026-06-15 override. It reverses the reference-only / elementary-reuse governance **for the USLCI account only**: FEDEFL elementary flows with no public canonical match, plus the 7 local flow-properties / 4 unit-groups with no canonical equivalent, are **minted as account-local My Data (state_code=0)** rather than left non-importable. **Reversible** (`enabled=false` restores reference-only governance).

Gates that REMAIN blocking under the override (NOT relaxed):

- the unit-scale safety blocker `canonical_support_amount_scaling_required`;
- schema validation, deterministic QA, curation, and full-context proof gates;
- remote write still requires dry-run, queue verify, commit handoff, closeout, and readback verification, **and account/write-policy approval (D4) before any remote commit** — `allow_remote_commit` stays false until then.

## Generic gates (otherwise)

- schema validation blockers remain blockers;
- deterministic QA blockers remain blockers;
- missing source evidence for authored fields remains blocking;
- remote write requires dry-run, queue verify, commit handoff, closeout, and readback verification.

---
title: Enterprise Process from Files Import Profile
docType: import-profile
scope: enterprise-process-from-files
status: active
owner: tiangong-lca-data-foundry
---

# Enterprise Process from Files Import Profile

This profile turns enterprise BOMs, utility records, production logs, spreadsheets, PDFs, and office exports into TIDAS process datasets and, when the task write policy permits, writes verified draft data through the published CLI.

The profile uses public-first identity resolution rather than public-only resolution. Identity-equivalent public rows are reused. When the evidence proves that no defensible public or existing account row represents the required object, the workflow may author an account-local `state_code=0` dependency and write it before the dependent process. Account-local rows are not public canonical data and must not enter the public canonical cache.

## Authorized Relaxations

- `process_material_balance_deviation` remains visible in deterministic QA and the material-balance report, but is a profile warning rather than a process-write blocker.
- Product and waste flows may be authored as account-local draft rows after identity preflight rejects public/existing candidates.
- Unmatched elementary flows, flow properties, and unit groups may use the profile-authorized owner-draft path when public reuse is not defensible.
- True source and contact rows may be authored from enterprise evidence and committed as an upstream support scope.
- Remote commit is allowed when the task policy permits it and every generic prewrite and post-write gate passes.

## Execution Order

1. Freeze and extract all supplied files; retain source and clarification hashes.
2. Author source/contact support and flow dependencies from SDK-backed context.
3. Reuse public or existing account rows where identity-equivalent; otherwise produce evidence-bound account-local candidates.
4. Validate, classify, locate, curate, clean, and dry-run the exact rows.
5. Finalize and commit upstream support/flow scopes first; read them back and prove their owner, state, payload, and reference closure.
6. Re-finalize the dependent process rows against verified remote references.
7. Generate a mutation manifest and commit handoff for each ready process scope.
8. Commit only when the task write policy and account guard allow it; then run post-write verification and closeout.
9. Complete the task only after the import completion report covers every intended committed or explicitly blocked scope.

Blocked scopes stay out of the write queue while independent ready scopes continue.

## Ownership Boundary

Foundry owns orchestration, evidence, profile policy, gates, manifests, and checkpoints. The published CLI/SDK owns schema validation, deterministic QA, identity operations, official writes, and readback commands. The database and TIDAS contracts still own required fields, valid codes, account permissions, and remote state. This profile never authorizes direct database writes or schema bypasses.

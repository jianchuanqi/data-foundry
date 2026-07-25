---
id: enterprise-process-YYYYMMDD-short-name
title: Build import-compatible TIDAS processes from enterprise files
state: Todo
kind: source-evidence-dataset-development
dataset_type: process
profile: enterprise-process-from-files
priority: P1
allow_remote_commit: true
input_mode: files_only
interaction_policy: interrupt_on_material_decision
completion_contract: tidas_process_import_completed_v1
source_manifest: .foundry/workspaces/<task-id>/source-manifest.json
---

## Goal

Turn the supplied enterprise files into one or more document-traceable TIDAS process datasets and required dependencies, interrupt for material human clarification when needed, and complete each task-policy-authorized write through exact readback and closeout.

## Operating Contract

- Follow `specs/use-cases/enterprise-process-from-files.json` and `$foundry-enterprise-process-from-files`.
- Maintain the lane-owned `foundry-job.json`, `seed-manifest.json`, `profile-lock.json`, and `artifact-index.jsonl` alongside the enterprise use-case artifacts.
- Keep complete original, parsed, calculation, and human-clarification documents; field-level locators are best effort.
- Resolve flows and support records public-first. Reuse an identity-equivalent public or visible canonical row. When none exists, product and waste flows may follow an evidence-backed `create_new` owner-draft path; elementary flows, flow properties, and unit groups require the dedicated profile authorization and same-owner `state_code=0` closure. Mint unmatched flow properties/unit groups only through the existing `--mint-unmatched-fp-ug-support` and owner-draft path, never the public cache.
- Preserve source-language values and add `en` for every TIDAS-required multilingual field.
- When a real annual supply or production volume is absent, use the existing deterministic `9999 missing-data-sentinel/year`, record provenance and a warning, and revalidate; do not invent a value or defer it to `common:other`.
- Continue independent ready scopes while pausing only affected scopes for human input.
- Ask only the immediate necessary modeling question in concise, natural LCA professional language; keep blocker codes, status enums, commands, and unrelated pending questions in internal artifacts rather than the user-facing prompt.
- Retain every material-balance diagnostic. Apply the dedicated profile's governed, human-approved `process_material_balance_deviation` waiver as a visible warning, with the profile lock, approval provenance, exact rows, deviation values, and QA report; do not request repeated scope-level approval and do not waive any other gate.
- Author and finalize genuine source/contact dependencies and unmatched flow/support rows before dependent processes. Commit upstream scopes first when task policy permits, and require exact remote readback before downstream finalize.
- Generate finalize, mutation manifest, commit handoff, account/write guard, and dry-run evidence for every writable scope. Perform remote commit only through the generated published CLI command when task policy allows it, then require post-write verification and closeout.
- Never use direct database writes or OpenClaw integration. Publication remains separately governed.

## Required Gates

- contract context pack
- complete source manifest with file SHA-256
- lane job, seed manifest, frozen `enterprise-process-from-files` profile lock, and artifact ledger
- complete document extraction and document-level provenance
- material HITL checkpoints and clarification documents, when triggered
- public-first identity decisions and exact public or same-owner account-local reference closure
- schema validation
- TIDAS-required multilingual `en` completion with source-language preservation
- deterministic QA with every finding retained
- complete exact-payload diagnostic and frozen profile-waiver evidence for every `process_material_balance_deviation`; the deviation remains visible as a warning
- classification and location audit
- Foundry dataset curation gate
- source/contact and other required dependency finalize before dependent process finalize
- successful save-draft dry-run, mutation manifest, commit handoff, and account/write guard for every exact writable payload
- remote verification and post-write closeout for every task-policy-authorized commit
- completed task-level import report and `task-complete --completion-report` transition when all intended writes finish

## Deliverables

- `.foundry/workspaces/<task-id>/deliverables/processes/*.json`
- `.foundry/workspaces/<task-id>/deliverables/processes.jsonl`
- exact dependency rows and identity/reference-closure evidence
- finalize, mutation-manifest, commit-handoff, commit, remote-verification, and closeout reports required by task policy
- `.foundry/workspaces/<task-id>/import-completion/dataset-import-completion-report.json`
- `.foundry/workspaces/<task-id>/enterprise-process-result.json`

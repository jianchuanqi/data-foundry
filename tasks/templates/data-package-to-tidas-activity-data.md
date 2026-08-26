---
id: activity-data-YYYYMMDD-short-name
title: "Analyze one uploaded XLSX and author TIDAS activity data"
state: Todo
kind: source-evidence-dataset-development
dataset_type: process
profile: generic
priority: P1
allow_remote_commit: false
source_file: "/abs/path/<uploaded-workbook>.xlsx"
methodology: data-package-to-tidas-activity-data
---

# Uploaded enterprise XLSX to TIDAS activity data

## Purpose and boundary

Use this task skeleton when a user uploads one enterprise `.xlsx` workbook containing physical activity data, supporting metadata, or calculated results that must be analyzed and decomposed into evidence-backed TIDAS activity-data candidates. The workbook may describe a product, service, facility, organization, or another explicitly scoped system. Its domain, table layout, sheet names, coordinates, identifiers, and vocabulary are discovered from the current source rather than configured in this template.

This methodology produces the activity-data side of:

```text
activity data x emission factor = emissions (CO2e)
```

It does not select emission factors, calculate CO2e, identify hotspots, or make reduction recommendations. It does not assume a functional unit, system boundary, geography, time scope, allocation rule, or quantitative reference. Establish each value from task and workbook evidence; an unresolved value blocks only the affected scope.

This Markdown file is a task and methodology contract, not an executable converter. The authoritative TIDAS schema, methodology YAML, runtime ruleset, classifications, locations, canonical-support facts, row materialization behavior, validation, QA, and remote-write semantics come from the installed owner tools and the current task context.

## Input and ownership model

The only user-supplied input for this workflow is one `.xlsx` workbook. No companion mapping JSON or provenance Markdown file is required. The task creates manifests, extraction results, triage records, review queues, build plans, candidate rows, and gate reports inside the ignored task workspace as generated execution evidence.

Foundry owns task routing, generated manifests, artifact lineage, curation aggregation, cleanup, and policy gates. A configured structured-spreadsheet capability owns read-only workbook inspection; published CLI/Rust tooling owns TIDAS contract context, build-plan materialization, deterministic validation/QA, canonical reference behavior, and database operations. The workbook does not contribute a Foundry runtime, schema authority, credential loader, validation bypass, or remote-write authority.

## Required workspace contract

Create `.foundry/workspaces/<task-id>/` and retain at least:

```text
foundry-job.json
source-manifest.json
seed-manifest.json
profile-lock.json
account-guard.json
source-starting-points.jsonl
goal-scope.md
entity-plan.json
artifact-index.jsonl
runtime-skills/runtime-skill-resolution.json   # when runtime skills are used
extraction/workbook-structure.json
extraction/workbook-extraction-receipt.json
extraction/records.jsonl
evidence/sources.jsonl
evidence/chunks.jsonl
evidence/field-evidence.jsonl
evidence/conflicts.jsonl
checkpoints/<NN>-<stage-id>.json
```

`source-manifest.json` is generated from the uploaded workbook and binds its path, bytes/hash, access classification, and capture time. The task job and profile lock freeze product intent, functional unit, geography, time scope, target entities, and execution policy for the actual run. These are internal execution artifacts, not additional files the user must prepare.

`seed-manifest.json` is mandatory for this source-evidence lane. It freezes the executable product/process seed, source starting point, intended use, quality target, profile/account guard, and explicit unknowns before evidence intake. The workbook remains the only user upload; Foundry generates the seed, account guard, source starting points, goal/scope, entity plan, and evidence dossier in the task workspace.

## Input interpretation

The input has no universal sheet schema. Identify tables by their content rather than their titles, and preserve the original workbook, sheet, row, column, cell value, value type, display value, number format, and formula evidence.

Typical source groups include:

| Source group | Typical content | Initial handling |
| --- | --- | --- |
| Product BoM | product-level material composition | product-level candidate |
| Procurement | annual purchased goods or services | organizational annual candidate |
| Energy | fuels, purchased electricity, heat, refrigerants | organizational annual candidate |
| Transport | inbound/outbound freight, travel, commuting | boundary-dependent candidate |
| Waste | treatment, disposal, recycling, downstream scenarios | boundary-dependent candidate |
| Metadata/results | instructions, quality notes, narrative, existing CO2e results | evidence only; not an exchange |

Detect sheet roles, headers, table ranges, formulas, units, and mapping candidates from the current workbook on each run. Never generalize coordinates or inferred dictionaries from one workbook into a universal parser without a separately owned and tested converter capability.

Resolve an available structured-spreadsheet capability for the run, such as the installed Spreadsheets skill. Import the workbook read-only and persist deterministic extraction evidence that records:

- source path, byte size, SHA-256, extractor name and version, and relevant extractor configuration;
- workbook sheet names, order and visibility, used ranges, named tables or regions when available, and merged ranges with their anchor cells;
- admitted cell/range addresses, raw typed values, data types, displayed values, number formats, formulas, cached or calculated values when present, headers, and source units;
- stable record ids and the exact cell bindings used to derive each structured record;
- extraction warnings, unsupported workbook features, and hashes of the generated evidence artifacts.

Bind the canonical structural payload and its hash in `artifact-index.jsonl`, and keep volatile capture timestamps and run-local diagnostics in `workbook-extraction-receipt.json`. The same workbook bytes, extraction contract, extractor version, and configuration must produce the same stably ordered canonical structure or an explicit drift blocker. AI interpretation starts only after this evidence exists; it may identify table roles, headers, units, and business meaning, but it must not invent or silently change cell values, formulas, or coordinates.

Evidence generated by a configured structured-spreadsheet capability is admissible even when `dataset author` produces only text or page-oriented output. Document fulltext, screenshots, or page chunks may supplement narrative and image content, but they do not replace cell/formula/merged-range lineage. Write `structured_spreadsheet_extraction_unavailable` and stop before record-level triage only when every configured structured-spreadsheet route is unavailable or fails. Record the attempted routes and exact errors; do not implement a task-local parser or promote one-off inspection code into a canonical converter.

## Layer 1: semantic understanding and eligibility triage

Classify every source record before building a flow or process exchange:

| Bucket | Meaning | Handling |
| --- | --- | --- |
| A | product-level physical activity inside the boundary | eligible for functional-unit scaling |
| B | organizational/facility annual physical activity inside the boundary | isolate until allocation is proven |
| C | result, metadata, or activity outside the boundary | exclude with an evidence-backed reason |

Apply these checks in order:

1. Distinguish physical activity data from an already calculated emission result. A value reported as CO2e is never multiplied again or written as a physical exchange by this task.
2. Check the evidence-backed declared system boundary. Records outside that boundary are not silently inserted into the process.
3. Distinguish product-level quantities from annual organizational quantities.
4. Reject metadata as exchanges while retaining it as source context.
5. Record the source cell, source unit, period, facility/product scope, decision, reason, and reviewer state in `triage.json`.

Unknown scope/category strings do not fall through to write. They become blocking review items.

## Layer 2: mapping and calculation

### Product-level quantities, when present

Preserve the enterprise material code, original name, specification, source-language text, net quantity, loss rate, supplied gross quantity, unit, and source cell. When gross demand is not supplied and the loss convention is proven to be the denominator convention, calculate:

```text
gross_demand = net_usage / (1 - loss_rate)
```

Recompute and compare a supplied gross value rather than trusting it silently. Invalid, missing, negative, non-finite, or contradictory amounts/loss rates block the affected row.

Derive the source basis and target functional-unit basis from evidence. When dimensions are compatible and both bases are proven, calculate:

```text
target_amount = source_amount x target_basis / source_basis
```

The workflow may preserve the original source functional unit or normalize it deliberately, but it never assumes one item, a fixed item count, one batch, or a mass basis. Determine the quantitative-reference exchange, direction, and flow type from current contract and source evidence. For a proven manufacturing process this may be the finished-product output; other process types follow their own evidence-backed reference semantics. Eligible physical inputs use amounts on the same proven functional-unit basis.

### Organizational annual activity

Energy, annual procurement, inbound transport, and manufacturing waste may be useful inventory evidence, but an annual total is not a per-item amount. It may enter the final product process only when a real annual production volume and allocation rule produce an evidence-backed amount on the chosen functional-unit basis.

When annual production or allocation evidence is missing:

- keep the annual record in evidence and triage artifacts;
- create a blocking `annual_volume_allocation` review item;
- do not insert the annual total into the target functional-unit process;
- optionally author a separate organizational process only when its own goal, reference flow, and boundary are explicitly defined.

### Units and canonical support

Source units remain in evidence. Unit/property normalization must be resolved against current context and `specs/canonical-support/flow-properties-unit-groups.json`; workbook labels or embedded identifiers are not canonical authority.

Any non-1 unit factor is explicit amount-scaling evidence. A known positive non-1 factor remains blocked until the amount is deliberately scaled and verified; a missing, non-finite, zero, or negative factor remains unresolved. Canonical UUID replacement never silently converts amounts.

### Identity, classification, and location

Names and dictionaries can propose candidates but cannot prove identity. Process/flow identity must pass identity preflight and, when needed, the identity decision workflow. Classifications must use valid locked taxonomy paths. Machine location fields must use codes from the current TIDAS location category context.

Do not create ordinary writable source rows for data-format or compliance placeholders. Reuse canonical references as proven by the owner tools. The writable source row represents the actual enterprise package/report; contact/source statements must be supported by source evidence.

## Layer 3: evidence and human review

Use three decision states:

| State | Meaning | Effect |
| --- | --- | --- |
| `auto` | deterministic rule plus evidence uniquely proves the result | candidate may continue through gates |
| `candidate` | bounded alternatives remain | affected row/scope stays blocked pending a decision |
| `manual_review` | required evidence is missing, conflicting, or ambiguous | affected row/scope stays blocked pending a decision |

Write unresolved decisions to `review-queue.jsonl`. A decision record includes a stable review id, node, exact source reference, source value, candidates when available, reason, rule/version evidence, decision, decider, and decision time.

A dictionary miss never copies source-language text into an `en` field and continues. Preserve every original language variant, require an evidence-backed English value, and block the affected row until every TIDAS-required multilingual field contains `en`.

The minimum evidence set is:

- the generated `seed-manifest.json`, goal/scope, entity plan, profile lock, and account guard;
- the generated `source-manifest.json` bound to the uploaded workbook;
- `source-extract.json` plus target contract manifests;
- structured-spreadsheet sheet/cell/formula/merged-range lineage for every record admitted to triage or mapping;
- `evidence/sources.jsonl`, `evidence/chunks.jsonl`, `evidence/field-evidence.jsonl`, and `evidence/conflicts.jsonl`;
- `triage.json`;
- material/activity mapping evidence with source-cell and calculation bindings;
- `review-queue.jsonl` and applied decision evidence;
- identity, classification, and location preflight/decision artifacts where required;
- exact row files and every downstream gate report bound to their bytes.

## Owner-command materialization path

First generate the structured workbook evidence described above. Then fetch source text and current TIDAS contract context:

```bash
pnpm exec tiangong-lca dataset author \
  --input /abs/path/uploaded-workbook.xlsx \
  --target-types contact,source,flow,process \
  --out-dir .foundry/workspaces/<task-id>/authoring \
  --json

pnpm exec tiangong-lca dataset context-pack \
  --type <contact|source|flow|process> \
  --profile ai-import \
  --out-dir .foundry/workspaces/<task-id>/context/<type> \
  --json
```

`dataset author` proving `status=evidence_ready` means that source text and contract packs exist; it does not by itself prove record-level workbook decomposition or candidate rows. Bind its output to the separately generated structured workbook evidence. Continue when that structured evidence satisfies the extraction contract; do not fail merely because the authoring extract itself is page- or text-oriented. If the structured evidence is missing or invalid after every configured route was attempted, retain all authoring artifacts and checkpoint evidence intake with `structured_spreadsheet_extraction_unavailable`.

Translate accepted triage/mapping decisions into evidence-backed flow and process build plans. Validate and materialize them through the installed CLI rather than constructing canonical TIDAS JSON in Foundry:

```bash
pnpm exec tiangong-lca flow build-plan validate --input <flow-plan.json> --out-dir <gate-dir> --json
pnpm exec tiangong-lca flow build-plan materialize --input <flow-plan.json> --out-dir <materialize-dir> --json
pnpm exec tiangong-lca process build-plan validate --input <process-plan.json> --out-dir <gate-dir> --json
pnpm exec tiangong-lca process build-plan materialize --input <process-plan.json> --out-dir <materialize-dir> --json
```

Build plans require current schema/methodology context, locked classification/location choices, identity evidence, and field-level evidence manifests. Materialized rows are only candidates.

## Required gates

For each exact current row file:

1. Native TIDAS validation through `node scripts/foundry.ts dataset-tidas-validate`.
2. Deterministic `pnpm exec tiangong-lca qa <type>`.
3. CLI curation queue build/next/verify.
4. Identity-preflight query audit and run for process/flow rows.
5. `node scripts/foundry.ts dataset-curation-gate` with schema, methodology YAML, ruleset, classification/location context, queue, and identity evidence.
6. `node scripts/foundry.ts dataset-authoring-plan`, followed by the required identity/classification/location decision or evidence-backed patch workflows.
7. Revalidation, QA, and curation after every row-changing apply.
8. `node scripts/foundry.ts dataset-post-authoring-finalize`, which performs cleanup, validation, QA, location audit, curation, dry-run, reference closure, mutation-manifest, and handoff preparation for one exact scope.

Schema-valid does not mean curation-ready. Every unresolved review item, classification leaf, location code, identity candidate, canonical support scale, annual allocation, or source-evidence gap remains blocking.

## Remote-write boundary

`allow_remote_commit: false` is authoritative for this template. A normal run stops after local dry-run and a blocked/non-executable handoff. Do not change task write policy merely to demonstrate a workbook analysis.

A later explicitly authorized task may proceed only when the exact-scope finalize report and mutation manifest are ready, the commit handoff is ready, and the account guard accepts the generated CommandSpec. Credential-scoped execution goes through `pnpm account:run`; post-write verification, closeout, import completion, and gated task completion are mandatory. No command in this template performs a remote write.

## Expected deliverables

- `extraction/workbook-structure.json` and `extraction/records.jsonl` with exact workbook and cell lineage;
- candidate `contacts.jsonl`, `sources.jsonl`, `flows.jsonl`, and `processes.jsonl` for admitted scopes, produced through owner build-plan/materialization paths;
- source extraction and contract context packs;
- `triage.json`, mapping/calculation evidence, and `review-queue.jsonl`;
- identity/classification/location evidence and applied-decision reports;
- schema, QA, queue, curation, cleanup, dry-run, reference-closure, mutation-manifest, and handoff reports for exact current rows;
- blocker ledger entries for every affected row/scope that cannot proceed; a fail-closed semantic blocker is a valid completed test outcome when extraction and triage coverage are complete.

## Done criteria

- Every included exchange is physical activity data inside the declared boundary and uses the same proven functional-unit basis as the process reference flow.
- Product-level gross-demand calculations reconcile with net usage and loss evidence.
- No unallocated annual total appears in a product-level process.
- Excluded/result/metadata records retain an evidence-backed reason.
- Every amount traces to the source cell, source unit, formula, scaling decision, and any human decision.
- Original language is preserved and evidence-backed English exists for every required multilingual field.
- The review queue is closed for every row in the intended scope; unresolved rows remain excluded and blocked rather than being silently written.
- Identity, classification, location, schema, QA, curation, cleanup, dry-run, and reference-closure gates agree on the same exact rows.
- With the default write policy, no remote mutation occurred.

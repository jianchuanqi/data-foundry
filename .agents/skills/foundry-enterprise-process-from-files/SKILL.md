---
name: foundry-enterprise-process-from-files
description: Use when TianGong LCA Data Foundry must turn enterprise operational files such as BOMs, energy bills, production records, spreadsheets, PDFs, or office exports into evidence-backed TIDAS process datasets and required dependencies, with interruptible human clarification, governed material-balance waivers, public-first identity reuse, account-local draft fallback, and task-policy-gated remote commit and readback.
---

# Foundry Enterprise Process From Files

Use this project-local specialization of the `source-evidence-dataset-development` lane when the initial user input is files rather than a modeling prompt. Coordinate existing Foundry and published CLI capabilities; do not implement conversion, validation, identity search, or database behavior in this skill.

## Start From The Contract

1. Read `AGENTS.md`, `WORKFLOW.md`, and `docs/runtime-skill-management.md`.
2. Read `specs/use-cases/enterprise-process-from-files.json` completely. Treat it as the authoritative machine contract for routing, artifacts, statuses, HITL, gates, and completion.
3. Read `$foundry-tidas-import` before orchestrating the source-document lane.
4. Read `$foundry-tidas-authoring` before producing any identity, classification, location, or field decision/patch.
5. Resolve and read the configured runtime document-extraction skill before decomposing PDFs, spreadsheets, images, or office files.

Do not silently diverge from the use-case contract. If a required artifact or existing owner command cannot express the contract, leave the affected scope blocked and report the capability gap; do not add a one-off converter, validator, or database client.

## Hard Rules

- Accept an initial files-only submission. Derive the task context from the supplied documents; do not require an initial free-form modeling prompt.
- Use task kind `source-evidence-dataset-development` and the dedicated `enterprise-process-from-files` profile. Read `allow_remote_commit` and the frozen write policy from the task; do not infer write permission from credentials, prior tasks, or source-file upload consent.
- Preserve and rerun every material-balance diagnostic. The dedicated profile carries the governed, human-approved policy that treats `process_material_balance_deviation` as a visible warning rather than a write blocker; do not request a repeated waiver for every scope. Bind the profile-lock snapshot, deviation values, exact rows, QA report, and approval provenance into the checkpoint, curation evidence, result, and mutation manifest. Do not alter measured values merely to force balance. This profile waiver does not relax schema, multilingual, classification, location, provenance, unit, direction, allocation, identity, or reference-closure gates.
- Resolve every flow and support identity public-first. Reuse an identity-equivalent public or already-visible canonical UUID/version when one exists. When complete search evidence proves no defensible reusable identity, product and waste flows may use an evidence-backed `create_new` decision and a distinct account-local `state_code=0` draft. Account-local elementary flows, flow properties, and unit groups are allowed only under the dedicated profile authorization, with same-owner closure; unmatched flow properties and unit groups must use the existing `--mint-unmatched-fp-ug-support` and owner-draft path. Preserve source identity, version, unit scale, classification/location, provenance, and exact dependency closure. Never shadow or overwrite a public or other-owner identity, and never put account-local identities into a public canonical cache.
- Author the process and every required writable dependency. Genuine source/contact rows and unmatched account-local flow/support rows may be finalized, committed, and readback-verified before dependent flows or processes. Retain blocked candidates as workspace artifacts rather than deliverables.
- Preserve the original language and add `en` for every TIDAS-required multilingual field before a process can become import-compatible.
- When `annualSupplyOrProductionVolume` has no real source value, use the existing deterministic cleanup policy `9999 missing-data-sentinel/year`, record its provenance and a warning, then revalidate. Do not invent a physical volume or defer this required field to `common:other`.
- Apply ready-only execution: pause only affected scopes and continue independent scopes whose dependencies are closed.
- Keep document-level provenance as the minimum hard requirement. Preserve page, sheet, cell, row, or quote locators when extraction provides them, but do not block solely because a fine-grained locator is absent.
- Persist human explanations as complete clarification documents before using them in authoring. Chat history alone is not evidence.
- Ask the user only for the current modeling fact needed to continue, using concise, natural LCA professional language. Do not expose internal blocker codes, status enums, command names, or a backlog of unrelated questions in the user-facing prompt; keep those machine details in the workspace artifacts.
- Never call direct database APIs or configure OpenClaw. Use only published CLI-generated write commands for exact finalized scopes.
- Run `dataset-post-authoring-finalize`, mutation-manifest generation, commit handoff planning, account/write guards, and dependency-aware dry-runs for every writable scope. Execute remote commit only when the task explicitly permits it and the exact-scope finalize report, mutation manifest, handoff plan, account/write guard, and reference closure all pass; then require remote readback and post-write closeout before treating that scope as committed.

## Initialize The Workspace

Create the task from `tasks/templates/enterprise-process-from-files.md` and place runtime state under `.foundry/workspaces/<task-id>/`. Materialize the paths required by the authoritative contract, including:

```text
enterprise-process-job.json
source-manifest.json
foundry-job.json
seed-manifest.json
profile-lock.json
artifact-index.jsonl
evidence/parsed-documents/
evidence/calculations/
human-interactions/index.jsonl
human-interactions/<interaction-id>/request.md
human-interactions/<interaction-id>/clarification.md
human-interactions/<interaction-id>/decision.json
checkpoints/
rows/
rows/contacts.jsonl
rows/sources.jsonl
rows/flowproperties.jsonl
rows/unitgroups.jsonl
rows/flows.jsonl
rows/processes.jsonl
account-local-support/candidate-registry.jsonl
deliverables/processes/
deliverables/processes.jsonl
post-authoring-finalize/
import-completion/dataset-import-completion-report.json
enterprise-process-result.json
```

Populate `enterprise-process-job.json` from the supplied files and task defaults. Do not invent user intent that the documents do not establish. Make `source-manifest.json` conform to `docs/foundry-task-contracts.md`: include its top-level schema version, source kind, source paths, citation, and capture time, and record every original file with an absolute or workspace-resolvable path, media type, access classification, and SHA-256. Retain complete source files and complete parsed outputs; never store credentials or private payload exports in git.

Also create and maintain the lane-owned `foundry-job.json`, `seed-manifest.json`, `profile-lock.json`, and append-only `artifact-index.jsonl` required by the existing source-evidence task contract. In `foundry-job.json`, set the lane and target to this use case, include every intended entity type, and derive `write_policy.remote_commit` from the task policy: use `profile_gated_batch` only when `allow_remote_commit` is true, otherwise keep it disabled. Dry-run remains mandatory in either case. Set `execution_policy.blocked_item_policy` to `record_and_continue_independent_scopes`. Freeze the dedicated `enterprise-process-from-files` profile, including its material-balance and account-local draft authorizations, in the profile lock. Keep checkpoint statuses within the existing `pending`, `running`, `passed`, `failed`, and `waived` vocabulary; represent `awaiting_human_input` only as scope/job state and interaction metadata, never as a checkpoint status.

## Build Candidate Process Scopes

1. Extract the complete documents and tables, preserving their original structure and automatically available locators.
2. Align BOMs, bills, production records, sites, product lines, and reporting periods from document evidence.
3. After process count and boundary are unambiguous from the documents or a persisted clarification, split processes only when each proposed stage has a defensible boundary, reference product, and independently attributable or allocated exchanges. When exactly one enterprise boundary is defensible and the files support only enterprise totals, build one observed enterprise-boundary candidate instead of inventing internal stages. This preference never resolves an ambiguity between a factory-level multi-output process and multiple product processes: interrupt before authoring either interpretation.
4. Record derived values in complete calculation documents with formula, inputs, units, conversion, and referenced source or clarification documents.
5. Build candidate source, contact, flow, and process rows with their SDK-backed context packs and the existing source-document authoring path. Author only dependencies actually required by the intended processes.
6. Run existing identity preflight and decision workflows for every referenced flow and support row. Search public and already-visible identities first and deterministically apply an identity-equivalent UUID/version. If no defensible reusable identity exists, record the complete candidate search and `create_new` decision. Product and waste flows may then enter the account-local owner-draft path. Elementary flows require the dedicated profile authorization and full compartment/LCIA-gap evidence; flow properties and unit groups require the dedicated profile authorization plus the existing `--mint-unmatched-fp-ug-support` and owner-draft path. Give every new row a distinct UUID/version and exact source evidence.
7. Route classification, location, and other semantic gaps through the existing decision and patch workflows; never hand-edit final process JSONL.

One complete original, parsed, calculation, clarification, or context document may support multiple fields and decisions. When existing apply contracts require `basis` or `evidence`, point them to the applicable complete document or context bundle. Add a field-level quote or locator when available; do not manufacture one when it is not.

Preserve source-language values and add evidence-backed `en` variants for all TIDAS-required multilingual fields. If the documents do not provide a real annual supply or production volume, run the existing deterministic cleanup that writes `9999 missing-data-sentinel/year`; retain the missing-data basis as provenance and warning, and revalidate the exact cleaned rows.

Close writable dependencies in order. Finalize a mixed source/contact support scope first when those rows refer to each other, commit it when task policy permits, and prove readback before finalizing dependent flows. Finalize and, when permitted, commit account-local flow or other supported dependency scopes next, then remote-verify their exact UUID/version, owner, and `state_code=0` before finalizing processes. Public reuse and same-owner account-local closure may coexist only when every reference is visibility-compatible and exactly proven; a public process must never reference a private dependency.

## Interrupt For Material Human Input

Interrupt before producing dependent artifacts when an ambiguity can change process count or boundary, reference product or functional unit, document alignment, allocation, units, signs, exchange direction, canonical physical meaning, or material balance. Use the immediate triggers in the authoritative contract; defer only its explicitly listed batch-review topics.

Before pausing an affected scope:

1. Write a checkpoint containing current rows, source-manifest state, affected scopes, and pending questions.
2. Write `request.md` with relevant documents, the current interpretation, the uncertainty and why it matters, supported candidates, a recommended candidate with basis, downstream impact by candidate, and an invitation for free-text explanation. Present only the immediate necessary confirmation to the user in concise LCA language; retain the full decision package internally.
3. Append the interaction to `human-interactions/index.jsonl` and mark the affected scope `awaiting_human_input`.
4. Continue only independent scopes.

Allow the human to select a supported candidate, explain the source or business definition in free text, add files, or keep the scope blocked. A material question may interrupt the current Codex run; do not defer it merely to avoid interaction.

## Persist Clarification And Resume

Before using a reply, write `clarification.md` as a complete document containing:

- the question and prior system understanding;
- the human response verbatim;
- a normalized interpretation;
- applicable enterprise, site, product, period, and process scopes;
- effects on boundary, units, allocation, or exchanges;
- unresolved limits;
- timestamp and reviewer.

Write `decision.json` with the interaction type, affected scopes, chosen action or remaining blocker, clarification-document path and SHA-256, source type `human_clarification`, and the checkpoint from which to resume. Update the interaction index. The sidecar hash avoids relying on mutable chat history and binds later decisions to the exact clarification document.

Compute the SHA-256 after `clarification.md` is complete and record it in `decision.json` and `index.jsonl`; do not embed a self-referential whole-file hash in the document body. These sidecars satisfy the clarification-document hash requirement.

- For an explanation of existing evidence, invalidate and rebuild from the earliest affected boundary, mapping, or row stage.
- For added or changed files or numerical data, update the source manifest and invalidate every affected checkpoint, decision, calculation, and row from the earliest affected stage.
- If the SHA-256 of a clarification document changes, invalidate its affected checkpoints, decisions, calculations, and rows from the earliest affected stage. Never reuse a decision bound to the old clarification hash.
- Apply identity, classification, and location decisions through their existing deterministic apply commands.
- Rerun every affected schema, deterministic QA, identity/reference closure, material-balance, classification/location, finalize, and dry-run gate. Apply the frozen profile-level material-balance waiver only to the recorded deviation finding; it never substitutes for running the gate or closes any other finding.

## Validate, Finalize, And Complete Each Scope

For each exact writable support, flow, and process scope:

1. Run the published SDK-backed validator and deterministic QA for the correct dataset type and profile.
2. Block when any TIDAS-required multilingual field lacks `en`; preserve every available source-language value alongside it.
3. Apply the annual-volume missing-data sentinel policy when required and rerun validation and QA on the exact cleaned rows.
4. Resolve every identity public-first. For each account-local draft, retain the no-reuse evidence, semantic decision, exact UUID/version, target owner, `state_code=0`, unit-scale proof, source provenance, and dependency plan.
5. Prove exact reference closure and valid classification/location codes using current identity, apply, remote-verify, and audit artifacts. Never treat a planned upstream write as an existing reference.
6. Run the Foundry curation gate with full current context, rows, QA, waiver, decision/apply, and dependency evidence. Document-level evidence is sufficient when a complete source, parsed, calculation, clarification, or context document is retained; fine-grained locators remain best effort.
7. For every `process_material_balance_deviation`, retain the numerical diagnostic and exact QA lineage, then apply the dedicated profile's frozen waiver as a warning. Block if the profile lock, approval provenance, rows hash, deviation values, or QA report is missing or stale; do not require a new scope-level human decision.
8. Run `dataset-curation-cleanup` and `dataset-post-authoring-finalize` for the exact final rows. Require its validation, QA, location/classification audit, dry-run, mutation manifest, and commit handoff outputs to agree on the exact payload hash and report no unresolved reference or account/write guard blocker.
9. If remote commit is disabled, stop at a ready commit handoff and mark the scope import-compatible. If it is enabled, execute only the generated published CLI commit command for that exact scope, run remote verification, and run `dataset-post-write-closeout`. Commit source/contact support before dependent flow scopes, and commit/verify flows before dependent process scopes.

Mark a process scope `verified_import_compatible` when every non-waived gate passes, the profile-level material-balance warning has complete exact-payload lineage, every reference is exactly closed, and the process payload has a successful save-draft dry-run. When remote commit is authorized, advance it to `committed_and_verified` only after commit, readback, and closeout pass. Copy only the exact finalized process payloads to `deliverables/processes/*.json` and `deliverables/processes.jsonl`; retain corresponding dependency rows, manifests, handoffs, commit reports, and readback evidence in the workspace ledger.

## Report The Job

Write `enterprise-process-result.json` according to the authoritative contract. Include completed processes, created or reused dependencies, governed waivers, pending interactions, clarification documents, blocked scopes, warnings, and every required validation, QA, finalize, mutation-manifest, handoff, commit, remote-verification, and closeout report. Set `commit_performed` from observed execution, never intent. For each scope report, record the report path and SHA-256 plus the exact final input rows path and SHA-256; a report bound to an earlier rows payload is stale and cannot support completion.

Use these job outcomes exactly:

- `completed`: every intended write scope is `committed_and_verified`, and task-level completion evidence passes.
- `partially_completed`: at least one intended scope is `committed_and_verified` while another awaits input or remains blocked.
- `verified_import_compatible`: remote commit is disabled and every intended process scope completed through an exact ready handoff.
- `partially_verified_import_compatible`: remote commit is disabled and at least one process scope completed through an exact ready handoff while another awaits input or remains blocked.
- `awaiting_human_input`: no scope is deliverable yet and at least one material clarification is pending.
- `blocked`: no further in-scope progress is possible without corrected or additional evidence.
- `failed`: tooling or runtime execution failed independently of source ambiguity.

Treat uncertainty, representativeness, synonyms, publication-grade richness, and the profile-waived material-balance deviation as warnings unless another non-waivable TIDAS gate is also violated. Keep the deviation visible in the result, QA lineage, checkpoint, and mutation manifest; never present it as zero.

When remote commit is authorized and every committed scope has passed readback and post-write closeout, build `dataset-import-completion-report.json` from every closeout and require it to report `completed`. Then move the task to done only through `task-complete --completion-report <dataset-import-completion-report.json>`. When task policy stops at dry-run, treat the handoff-backed `enterprise-process-result.json` as the terminal use-case artifact without claiming a remote write. Publication remains a separate policy decision unless the authoritative contract explicitly includes it.

---
title: Enterprise Process from Files Constraints
docType: constraints
scope: import-profile
status: active
owner: tiangong-lca-data-foundry
related:
  - docs/import-profiles/enterprise-process-from-files/profile.md
  - specs/import-profiles.json
  - specs/use-cases/enterprise-process-from-files.json
---

# Enterprise Process from Files Constraints

## Material-balance treatment

The user authorized a profile-level relaxation on 2026-07-18. `process_material_balance_deviation` is retained as a measured QA observation and warning. Reports must preserve the known inputs, outputs, residual, boundary interpretation, units, allocation basis, omitted or zero rows, and source/clarification evidence.

The relaxation does not waive unresolved units, exchange direction, allocation, process boundary, reference product, or missing exchanges whose meaning is still unknown. Those are modeling blockers rather than a tolerated balance residual.

## Public-first and account-local identity

For every process, flow, source, contact, flow property, and unit group:

1. Search public and visible account candidates with the complete identity-defining evidence.
2. Reuse an existing UUID/version only when physical meaning, type, quantitative property, reference unit, classification/location, and process role are equivalent.
3. If no defensible candidate exists, retain the rejected-candidate evidence and author a new account-local row through the existing identity and authoring workflows.
4. Keep new rows at current-owner `state_code=0`; do not add them to the public canonical cache.
5. Write and read back dependencies before any process that references them.

Flow-property and unit-group candidates must preserve physical dimension, reference unit, conversion factors, and exchange-amount scaling. The unit-scale safety blocker remains non-waivable.

## Source and contact support

TIDAS-required source/contact references remain required. Enterprise names, workbooks, reports, and human clarification may support authoring those rows; optional email, telephone, and postal fields must not be invented. Mutually referencing source/contact rows may be finalized as one `support` scope. The dependent process remains blocked until support commit and readback prove the referenced UUID/version.

## Gates that remain blocking

- TIDAS schema or required-field failure;
- missing required English variants where the governing TIDAS/Foundry contract requires them;
- invalid classification or location codes;
- unresolved unit, direction, allocation, or physical identity;
- missing document-level provenance;
- unproven exact-scope reference closure;
- unit-scale or conversion-factor errors;
- failed dry-run, mutation manifest, account/write guard, commit handoff, remote write, readback, or closeout.

## Remote write

`allow_remote_commit: true` permits only policy-gated execution. It is not permission to bypass readiness. Every write must use the official CLI under the recorded account context, bind to the exact finalized rows, and retain the commit and post-write verification reports. Direct table writes, RLS bypasses, publication of account-local candidates, and deletion are outside this authorization.

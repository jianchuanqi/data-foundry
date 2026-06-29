---
title: worldsteel Import Constraints
docType: constraints
scope: import-profile
status: draft
owner: tiangong-lca-data-foundry
related:
  - docs/import-profiles/worldsteel/profile.md
  - docs/import-profiles/worldsteel/import-plan.md
  - specs/import-profiles.json
---

# worldsteel Import Constraints

## Reference-by-UUID first (the dominant policy)

The ~1,315 EF3.1 reference elementary flows + canonical flowproperties/unitgroups are **reused by their original canonical UUID** through the offline library-resolution `exchange-reference-rewrites.jsonl` (applied by the runner's `applyResolutionRewrites`). They are **never minted**. Each rewrite row must carry `canonical_short_description` so committed exchanges show the flow name, not the UUID.

## Authorized: capped account-local elementary mint (2026-06-29, requirement 3)

`allow_account_local_support_and_elementary` is enabled for the worldsteel profile (`specs/import-profiles.json`) **only** as a capped escape hatch. Unlike BAFU/USLCI (which mint reference support at scale), worldsteel's reference support is canonical and reused by UUID. The override is scoped to the small residual of **GaBi/Sphera pseudo-elementary flows** (dataSetVersion 20.25.x) that have no canonical match — **expected at most 17** — minted as account-local My Data (state_code=0) so the 33 steel processes stay complete.

- These residual flows are **NOT** matched by UUID; the AI judges reuse-vs-mint from **full context**.
- The final mint count is reviewed **after** the UUID-reuse pass. If the residual is zero, set `enabled=false`.
- Flow properties / unit groups are reference-only (`mintUnmatchedFpUgSupport=false`); only elementary flows may mint under this allowance.

## Gates that REMAIN blocking (NOT relaxed)

- the unit-scale safety blocker `canonical_support_amount_scaling_required`;
- schema validation against tidas-tools' **corrected eILCD schemas** (not raw EF3.1), deterministic QA (except the waived `process_material_balance_deviation`), curation, and full-context AI proof for `flow`/`process`/`lifecyclemodel`;
- remote write requires dry-run, queue verify, commit handoff, closeout, and readback verification, **and account/write-policy approval before any remote commit** — `allow_remote_commit` stays false until then.

## worldsteel-specific identity & attribution

- **Library contact:** reuse the packaged worldsteel contact `d5710976-d600-11da-a94d-0800200c9a66` (World Steel Association, v20.20.002) as the single shared library contact. Do not mint a synthetic foundry contact.
- **Database fallback source:** processes whose data source resolves to a placeholder cite the synthesized `worldsteel LCI database` source — never the BAFU 2025 default.
- **Version:** preserve the source `dataSetVersion`; do not renumber to `00.00.001`.
- **LCIA methods:** the 25 EF3.1 LCIA method datasets are reference/provenance only and are NOT written inline by the import.
- **External documents:** the 13 `referenceToDigitalFile` binaries are uploaded to the `external_docs` bucket and the source `@uri` rewritten by `tiangong-lca dataset source upload-attachments` (authenticated as `data@worldsteel.org`) before write; plain `http(s)` referenceToDigitalFile URIs are left untouched.

// worldsteel batch import runner — reuses the proven BAFU per-scope commit engine
// (materialize -> dependency flow commit -> support mint -> process commit ->
// readback verify -> resumable ledgers) with a worldsteel profile config:
//   - profile "worldsteel" so the (capped) account-local override activates only
//     for the <=17 GaBi/Sphera pseudo-elementary flows with no canonical match;
//     the ~1,315 EF3.1 reference flows are reused by their ORIGINAL UUID via the
//     offline library-resolution exchange-reference-rewrites and never minted;
//   - BAFU autofill OFF (worldsteel identity/classification decisions are pre-authored;
//     un-authored action items block instead of being mis-authored by BAFU logic);
//   - BAFU family-signature ordering OFF (worldsteel has no ecoSpold name-family concept);
//   - mintUnmatchedFpUgSupport OFF: worldsteel FP/UG are EF3.1 canonical and reused by
//     reference (the opposite of USLCI, whose FEDEFL FP/UG had no canonical equivalent).
// BAFU behavior is unchanged: the engine's defaults reproduce the BAFU runner exactly,
// and each run re-installs its own profile config (runs are sequential, race-free).
import { createBafuBatchImportRunCommands } from "./bafu-batch-import-run.mjs";

export function createWorldsteelBatchImportRunCommands(deps) {
  const { runDatasetBafuBatchImportRun } = createBafuBatchImportRunCommands(deps, {
    profile: "worldsteel",
    commandName: "dataset-worldsteel-batch-import-run",
    enableBafuAutofill: false,
    enableFamilySignatures: false,
    // First-import of a brand-new library: the worldsteel library contact is not yet
    // remote, so the dependency-flow finalize must commit its source/contact support
    // inline (right after pre-finalize) to satisfy its own reference closure. Once
    // committed, the support-identity cache + precommit remote verify let every later
    // scope reuse it. BAFU does not need this (FOEN already remote).
    commitFlowSupportInline: true,
    // Reference-only FP/UG: worldsteel's flow properties + unit groups are EF3.1/ILCD
    // canonical and are reused by reference (the canonical-support cache + UUID reuse).
    // Unlike USLCI's FEDEFL FP/UG, none need account-local minting, so this stays OFF.
    // The capped <=17 pseudo-elementary mint is governed by the profile's
    // allow_account_local_support_and_elementary flag, NOT by this FP/UG flag.
    mintUnmatchedFpUgSupport: false,
    // FIX A: apply the authoritative library-resolution exchange-reference-rewrites
    // deterministically at the flow-identity step. The worldsteel resolution is built
    // by UUID (the canonical DB already holds the EF3.1 flows under their original
    // UUIDs), so every reference flow becomes a canonical reference; only the residual
    // GaBi/Sphera pseudo-elementary flows with no rewrite reach the (capped) mint path.
    // Requires --library-resolution <dir> at runtime holding exchange-reference-rewrites.jsonl.
    applyResolutionRewrites: true,
    // Requirement 1 (2026-06-29): REUSE the worldsteel contact shipped in the package
    // (d5710976 — World Steel Association) as the single shared library contact rather
    // than minting a synthetic foundry contact. The explicit contactId/contactVersion
    // make buildLibraryContactPayload adopt the packaged identity verbatim.
    libraryContact: {
      contactId: "d5710976-d600-11da-a94d-0800200c9a66",
      contactVersion: "20.20.002",
      libraryName: "World Steel Association",
      shortName: "worldsteel",
      website: "https://www.worldsteel.org",
      contactAddress: "worldsteel, Rue Colonel Bourg 120, B-1140 Brussels, Belgium",
      telephone: "+32 (0) 2 702 8900",
      centralContactPoint: "worldsteel, Rue Colonel Bourg 120, B-1140 Brussels, Belgium",
      description:
        "Library-level contact for the worldsteel EF3.1 LCI data package, the World Steel Association (worldsteel).",
    },
  });
  return { runDatasetWorldsteelBatchImportRun: runDatasetBafuBatchImportRun };
}

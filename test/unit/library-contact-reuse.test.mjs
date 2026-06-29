import assert from "node:assert/strict";
import test from "node:test";
import { createBundleSampleUtils } from "../../scripts/lib/bundle-sample-utils.mjs";

// Minimal stubs for the eight dependencies buildLibraryContactPayload touches.
function utils() {
  return createBundleSampleUtils({
    asText: (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v)),
    deterministicUuid: () => "deterministic-minted-id",
    multiLang: (text, lang) => ({ "@xml:lang": lang, "#text": text }),
    canonicalSourceReferenceForRelation: () => null,
    cloneJson: (v) => JSON.parse(JSON.stringify(v)),
    sourceReferenceSnapshot: (ref) => ({
      ref_object_id: ref?.["@refObjectId"] ?? null,
      version: ref?.["@version"] ?? null,
      short_description: "",
    }),
    contactGlobalReference: ({ id, version }) => ({ "@refObjectId": id, "@version": version }),
    nowIso: () => "2026-06-29T00:00:00.000Z",
  });
}

// Requirement 1 (2026-06-29): the worldsteel runner reuses the packaged worldsteel
// contact (d5710976) as the shared library contact instead of minting a synthetic
// foundry contact. The library-prefixed contact id/version must win.
test("buildLibraryContactPayload reuses an explicit library contact id/version", () => {
  const payload = utils().buildLibraryContactPayload({
    profile: "worldsteel",
    libraryContactId: "d5710976-d600-11da-a94d-0800200c9a66",
    libraryContactVersion: "20.20.002",
    libraryName: "World Steel Association",
    libraryShortName: "worldsteel",
    libraryWebsite: "https://www.worldsteel.org",
  });
  const di = payload.contactDataSet.contactInformation.dataSetInformation;
  assert.equal(di["common:UUID"], "d5710976-d600-11da-a94d-0800200c9a66");
  assert.equal(di["common:name"]["#text"], "World Steel Association");
  assert.equal(
    payload.contactDataSet.administrativeInformation.publicationAndOwnership[
      "common:dataSetVersion"
    ],
    "20.20.002",
  );
  // self-reference (ownership) must also carry the reused identity
  assert.equal(
    payload.contactDataSet.administrativeInformation.publicationAndOwnership[
      "common:referenceToOwnershipOfDataSet"
    ]["@refObjectId"],
    "d5710976-d600-11da-a94d-0800200c9a66",
  );
});

test("buildLibraryContactPayload mints a deterministic id when none is supplied", () => {
  const payload = utils().buildLibraryContactPayload({
    profile: "worldsteel",
    libraryName: "X",
    libraryWebsite: "https://x",
  });
  assert.equal(
    payload.contactDataSet.contactInformation.dataSetInformation["common:UUID"],
    "deterministic-minted-id",
  );
});

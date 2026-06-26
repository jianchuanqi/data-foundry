import test from "node:test";
import { createSourceSemanticUtils } from "../../scripts/lib/source-semantics.mjs";
import { assert } from "../fixtures/foundry-core.mjs";

// Minimal-but-faithful dependency injection for the source-semantics factory. These match
// the runtime utilities foundry.mjs wires in (asText/textValue/multiLang/pathExpression/
// datasetIdentity/bundleClassificationPath) closely enough to exercise the real
// rewriteCanonicalSourceReferences + sourceSemanticKind logic.
function asText(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (Array.isArray(value)) return asText(value[0]);
  if (typeof value === "object") return asText(value["#text"] ?? value.value ?? "");
  return "";
}

function textValue(value) {
  return asText(value);
}

function bundleClassificationPath(payload, type) {
  const dataSetInformation =
    type === "source" ? payload?.sourceDataSet?.sourceInformation?.dataSetInformation : null;
  const classes =
    dataSetInformation?.classificationInformation?.["common:classification"]?.["common:class"];
  const list = Array.isArray(classes) ? classes : classes ? [classes] : [];
  return list
    .map((entry) => asText(entry?.["#text"] ?? entry))
    .filter(Boolean)
    .join(" / ");
}

function datasetIdentity(payload, type) {
  if (type === "source" || payload?.sourceDataSet) {
    const ds = payload?.sourceDataSet?.sourceInformation?.dataSetInformation ?? {};
    return { id: asText(ds["common:UUID"]) || null, version: "00.00.001" };
  }
  if (type === "process" || payload?.processDataSet) {
    const ds = payload?.processDataSet?.processInformation?.dataSetInformation ?? {};
    return { id: asText(ds["common:UUID"]) || null, version: "00.00.001" };
  }
  return { id: null, version: "00.00.001" };
}

function makeUtils() {
  return createSourceSemanticUtils({
    asText,
    bundleClassificationPath,
    cloneJson: (value) => JSON.parse(JSON.stringify(value)),
    datasetIdentity,
    deterministicUuid: (seed) => `det-${seed}`,
    languageForText: () => "en",
    multiLang: (text, lang = "en") => ({ "@xml:lang": lang, "#text": text }),
    pathExpression: (parts) => parts.join("."),
    repoRelativeMaybe: (value) => value,
    textValue,
  });
}

const FORMAT_SOURCE_ID = "16938856-0a35-5654-8aff-56c17e61da4d";
const CANONICAL_FORMAT_ID = "a97a0155-0234-4b87-b4ce-a45da52f2a40";
const CANONICAL_FORMAT_VERSION = "03.00.003";
const TRUE_SOURCE_ID = "94b3d910-206d-4478-9d5c-841ce336043b";

function formatSupportSourcePayload() {
  return {
    sourceDataSet: {
      sourceInformation: {
        dataSetInformation: {
          "common:UUID": FORMAT_SOURCE_ID,
          "common:shortName": { "@xml:lang": "en", "#text": "ILCD format" },
          classificationInformation: {
            "common:classification": {
              "common:class": { "@level": "0", "@classId": "0", "#text": "Data set formats" },
            },
          },
        },
      },
    },
  };
}

// A process whose validation/review references the format support source via
// common:referenceToCompleteReviewReport — exactly the CLASS 2 failing shape.
function processWithReviewReportReference(sourceId) {
  return {
    processDataSet: {
      processInformation: {
        dataSetInformation: { "common:UUID": "0247a4ba-9f1d-427f-b003-2718472154da" },
      },
      modellingAndValidation: {
        validation: {
          review: {
            "common:referenceToCompleteReviewReport": {
              "@type": "source data set",
              "@refObjectId": sourceId,
              "@version": "00.00.001",
              "@uri": `../sources/${sourceId}_00.00.001.xml`,
              "common:shortDescription": { "@xml:lang": "en", "#text": "ILCD format" },
            },
          },
        },
      },
    },
  };
}

function reviewReportReference(payload) {
  return payload.processDataSet.modellingAndValidation.validation.review[
    "common:referenceToCompleteReviewReport"
  ];
}

// CLASS 2: a format support source referenced on the review-report path is rewritten to the
// public canonical source when a sourceLookup is supplied (USLCI override on).
test("review-report format source is rewritten to canonical when sourceLookup is supplied", () => {
  const utils = makeUtils();
  const summary = utils.sourceSemanticSummary(formatSupportSourcePayload(), "support.jsonl");
  assert.equal(summary.kind, "format_support_source");
  const sourceLookup = new Map([[summary.dataset_id, summary]]);

  const payload = processWithReviewReportReference(FORMAT_SOURCE_ID);
  const stats = { source_reference_rewrites: 0 };
  const rewriteRows = [];
  utils.rewriteCanonicalSourceReferences(payload, {
    datasetType: "process",
    sourceFile: "processes.jsonl",
    stats,
    rewriteRows,
    datasetIdentityCache: datasetIdentity(payload, "process"),
    sourceLookup,
  });

  const ref = reviewReportReference(payload);
  assert.equal(
    ref["@refObjectId"],
    CANONICAL_FORMAT_ID,
    "rewritten to public canonical ILCD format source",
  );
  assert.equal(ref["@version"], CANONICAL_FORMAT_VERSION, "uses the canonical published version");
  assert.equal(stats.source_reference_rewrites, 1);
  assert.equal(rewriteRows.length, 1);
  assert.equal(rewriteRows[0].relation, "format_support_source");
});

// BAFU path: no sourceLookup => the review-report reference is left byte-identical (the gate).
test("review-report format source is left unchanged when no sourceLookup is supplied (BAFU)", () => {
  const utils = makeUtils();
  const payload = processWithReviewReportReference(FORMAT_SOURCE_ID);
  const before = JSON.stringify(payload);
  const stats = { source_reference_rewrites: 0 };
  const rewriteRows = [];
  utils.rewriteCanonicalSourceReferences(payload, {
    datasetType: "process",
    sourceFile: "processes.jsonl",
    stats,
    rewriteRows,
    datasetIdentityCache: datasetIdentity(payload, "process"),
    // sourceLookup omitted == null (BAFU passes null)
  });
  assert.equal(JSON.stringify(payload), before, "payload is byte-identical without the lookup");
  assert.equal(stats.source_reference_rewrites, 0);
  assert.equal(rewriteRows.length, 0);
});

// A true source on the review-report path is NEVER rewritten — only format/compliance
// support kinds have a kind-based canonical target.
test("review-report true source is never rewritten by the kind-based canonical mapping", () => {
  const utils = makeUtils();
  const trueSourceSummary = {
    dataset_id: TRUE_SOURCE_ID,
    dataset_version: "00.00.001",
    kind: "true_source",
  };
  const sourceLookup = new Map([[TRUE_SOURCE_ID, trueSourceSummary]]);
  const payload = processWithReviewReportReference(TRUE_SOURCE_ID);
  const before = JSON.stringify(payload);
  const stats = { source_reference_rewrites: 0 };
  const rewriteRows = [];
  utils.rewriteCanonicalSourceReferences(payload, {
    datasetType: "process",
    sourceFile: "processes.jsonl",
    stats,
    rewriteRows,
    datasetIdentityCache: datasetIdentity(payload, "process"),
    sourceLookup,
  });
  assert.equal(JSON.stringify(payload), before, "true source review-report reference is untouched");
  assert.equal(stats.source_reference_rewrites, 0);
});

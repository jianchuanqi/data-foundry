import test from "node:test";
import {
  assert,
  fs,
  path,
  readJson,
  rel,
  repoRoot,
  runFoundry,
  testTmpRoot,
  writeJson,
  writeJsonLines,
} from "../fixtures/foundry-core.mjs";

const fixtureRoot = testTmpRoot("enterprise-process-material-balance-gate");

test("generic enterprise process curation cannot waive material-balance deviation", (t) => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));

  const processId = "f7aca888-0df0-43b3-ae08-47f55b3d60fc";
  const rowsFile = path.join(fixtureRoot, "processes.jsonl");
  const schemaReport = path.join(fixtureRoot, "schema-report.json");
  const qaReport = path.join(fixtureRoot, "qa-report.json");
  const outDir = path.join(fixtureRoot, "curation-gate");

  writeJsonLines(rowsFile, [
    {
      processDataSet: {
        processInformation: {
          dataSetInformation: {
            "common:UUID": processId,
            name: {
              baseName: { "@xml:lang": "en", "#text": "Enterprise product process" },
            },
          },
        },
        administrativeInformation: {
          publicationAndOwnership: { "common:dataSetVersion": "00.00.001" },
        },
      },
    },
  ]);
  writeJson(schemaReport, {
    status: "completed",
    rows: [{ id: processId, status: "valid", issues: [] }],
  });
  writeJson(qaReport, {
    status: "completed",
    findings: [
      {
        process_id: processId,
        code: "process_material_balance_deviation",
        path: "processDataSet.exchanges",
        message: "Material inputs and outputs do not balance.",
        evidence: { deviation_ratio: 0.17 },
      },
    ],
    blockers: [],
  });

  const result = runFoundry([
    "dataset-curation-gate",
    "--type",
    "process",
    "--profile",
    "generic",
    "--rows-file",
    rel(rowsFile),
    "--schema-report",
    rel(schemaReport),
    "--qa-report",
    rel(qaReport),
    "--out-dir",
    rel(outDir),
  ]);

  assert.equal(result.code, 1);
  assert.equal(result.json.status, "blocked_needs_foundry_ai_authoring");
  assert.deepEqual(result.json.policy.waived_qa_codes, []);
  assert.equal(result.json.counts.waivers, 0);
  assert.equal(result.json.entities[0].waived_finding_count, 0);
  assert.equal(result.json.entities[0].status, "needs_foundry_ai_authoring");

  const authoringPackage = readJson(path.join(repoRoot, result.json.entities[0].authoring_package));
  const materialBalanceItem = authoringPackage.action_items.find(
    (item) => item.code === "process_material_balance_deviation",
  );
  assert.ok(materialBalanceItem);
  assert.equal(materialBalanceItem.source, "process_qa");
  assert.equal(materialBalanceItem.ai_required, true);
  assert.deepEqual(materialBalanceItem.evidence, { deviation_ratio: 0.17 });
});

test("dedicated enterprise process profile retains material-balance deviation as a waiver warning", (t) => {
  const root = `${fixtureRoot}-profile-waiver`;
  fs.rmSync(root, { recursive: true, force: true });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const processId = "d8370d0c-2709-4b8c-a637-cb16fb8a19e1";
  const rowsFile = path.join(root, "processes.jsonl");
  const schemaReport = path.join(root, "schema-report.json");
  const qaReport = path.join(root, "qa-report.json");
  const outDir = path.join(root, "curation-gate");

  writeJsonLines(rowsFile, [
    {
      processDataSet: {
        processInformation: {
          dataSetInformation: {
            "common:UUID": processId,
            name: {
              baseName: { "@xml:lang": "en", "#text": "Enterprise product process" },
            },
          },
        },
        administrativeInformation: {
          publicationAndOwnership: { "common:dataSetVersion": "00.00.001" },
        },
      },
    },
  ]);
  writeJson(schemaReport, {
    status: "completed",
    rows: [{ id: processId, status: "valid", issues: [] }],
  });
  writeJson(qaReport, {
    status: "completed",
    findings: [
      {
        process_id: processId,
        code: "process_material_balance_deviation",
        path: "processDataSet.exchanges",
        message: "Material inputs and outputs do not balance.",
        evidence: { deviation_ratio: 0.17 },
      },
    ],
    blockers: [],
  });

  const result = runFoundry([
    "dataset-curation-gate",
    "--type",
    "process",
    "--profile",
    "enterprise-process-from-files",
    "--rows-file",
    rel(rowsFile),
    "--schema-report",
    rel(schemaReport),
    "--qa-report",
    rel(qaReport),
    "--out-dir",
    rel(outDir),
  ]);

  assert.equal(result.code, 0);
  assert.equal(result.json.status, "ready_with_profile_waivers");
  assert.ok(result.json.policy.waived_qa_codes.includes("process_material_balance_deviation"));
  assert.equal(result.json.counts.waivers, 1);
  assert.equal(result.json.counts.blocking_items, 0);
  assert.equal(result.json.entities[0].waived_finding_count, 1);
  assert.equal(result.json.entities[0].status, "ready_with_profile_waivers");

  const authoringPackage = readJson(path.join(repoRoot, result.json.entities[0].authoring_package));
  const waivedFinding = authoringPackage.waived_findings.find(
    (item) => item.code === "process_material_balance_deviation",
  );
  assert.ok(waivedFinding);
  assert.deepEqual(waivedFinding.evidence, { deviation_ratio: 0.17 });
  assert.match(waivedFinding.waiver_basis, /warning|write blocker/iu);
  assert.equal(
    authoringPackage.action_items.some(
      (item) => item.code === "process_material_balance_deviation",
    ),
    false,
  );
});

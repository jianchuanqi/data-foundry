import test from "node:test";
import {
  assert,
  fs,
  path,
  readJson,
  readJsonLines,
  sha256Text,
  testTmpRoot,
  writeJson,
  writeJsonLines,
  writeText,
} from "../fixtures/foundry-core.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const contract = readJson(
  path.join(repoRoot, "specs/use-cases/enterprise-process-from-files.json"),
);
const fixtureRoot = testTmpRoot("enterprise-process-hitl-lifecycle");

function transition(event) {
  return contract.human_in_the_loop.state_transitions.find((item) => item.event === event);
}

function writeInitialPausedWorkspace(root) {
  const sourceManifest = path.join(root, "source-manifest.json");
  writeJson(sourceManifest, {
    schema_version: 1,
    source_kind: "enterprise_files",
    source_paths: [
      {
        path: "/private/evidence/BOM.xlsx",
        sha256: "a".repeat(64),
        access: "local-private",
        media_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      {
        path: "/private/evidence/electricity-bill.pdf",
        sha256: "b".repeat(64),
        access: "local-private",
        media_type: "application/pdf",
      },
    ],
    source_citation: "Enterprise BOM and factory electricity bill submitted for this task",
    captured_at_utc: "2026-07-17T00:00:00Z",
  });
  const sourceManifestSha256 = sha256Text(fs.readFileSync(sourceManifest, "utf8"));

  const interactionDir = path.join(root, "human-interactions", "hitl-001");
  writeText(
    path.join(interactionDir, "request.md"),
    [
      "# Material modeling clarification",
      "",
      "The BOM contains two products while the electricity bill is factory-total.",
      "Choose one factory multi-output process or two allocated product processes, or explain another evidenced interpretation.",
    ].join("\n"),
  );
  writeJson(path.join(root, "checkpoints", "01-boundary-mapping.json"), {
    schema_version: 1,
    stage_id: "boundary-mapping",
    status: "pending",
    input_hashes: { "source-manifest.json": sourceManifestSha256 },
    current_rows: [],
    affected_scopes: ["product-a", "product-b"],
    pending_questions: ["hitl-001"],
    earliest_affected_stage: "boundary-mapping",
  });
  writeJsonLines(path.join(root, "human-interactions", "index.jsonl"), [
    {
      schema_version: 1,
      interaction_id: "hitl-001",
      task_id: "enterprise-fixture",
      scope_ids: ["product-a", "product-b"],
      input_types: ["boundary_decision", "allocation_decision"],
      review_timing: "immediate",
      status: "awaiting_human_input",
      request_path: "human-interactions/hitl-001/request.md",
      clarification_path: null,
      clarification_sha256: null,
      decision_path: null,
      checkpoint_path: "checkpoints/01-boundary-mapping.json",
      created_at: "2026-07-17T00:00:00Z",
      updated_at: "2026-07-17T00:00:00Z",
    },
  ]);
  writeJson(path.join(root, "enterprise-process-result.json"), {
    schema_version: 1,
    task_id: "enterprise-fixture",
    use_case_id: "enterprise-process-from-files",
    status: "awaiting_human_input",
    completed_processes: [],
    pending_interactions: ["hitl-001"],
    clarification_documents: [],
    blocked_scopes: [
      { scope_id: "product-a", status: "awaiting_human_input" },
      { scope_id: "product-b", status: "awaiting_human_input" },
    ],
    warnings: [],
    reports: [],
    commit_performed: false,
    committed_scopes: [],
    write_scope_closeouts: [],
    completion_report: null,
  });
  return { interactionDir, sourceManifest, sourceManifestSha256 };
}

test("material boundary ambiguity checkpoints before downstream process rows", (t) => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));
  writeInitialPausedWorkspace(fixtureRoot);

  const checkpoint = readJson(path.join(fixtureRoot, "checkpoints/01-boundary-mapping.json"));
  const result = readJson(path.join(fixtureRoot, "enterprise-process-result.json"));
  const interaction = readJsonLines(path.join(fixtureRoot, "human-interactions/index.jsonl"))[0];

  assert.equal(transition("material_model_unambiguous").interrupt_now, false);
  assert.equal(transition("material_model_unambiguous").downstream_process_rows_allowed, true);
  assert.equal(transition("material_ambiguity_detected").downstream_process_rows_allowed, false);
  assert.equal(checkpoint.status, "pending");
  assert.deepEqual(checkpoint.current_rows, []);
  assert.equal(interaction.status, "awaiting_human_input");
  assert.equal(interaction.clarification_path, null);
  assert.equal(result.status, "awaiting_human_input");
  assert.equal(result.commit_performed, false);
  assert.equal(fs.existsSync(path.join(fixtureRoot, "rows/processes.jsonl")), false);
  assert.equal(fs.existsSync(path.join(fixtureRoot, "deliverables/processes.jsonl")), false);
});

test("free-text clarification is hashed, supports multiple decisions, and precedes resume", (t) => {
  const root = `${fixtureRoot}-clarified`;
  fs.rmSync(root, { recursive: true, force: true });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { interactionDir } = writeInitialPausedWorkspace(root);
  const clarificationPath = path.join(interactionDir, "clarification.md");
  writeText(
    clarificationPath,
    [
      "# Clarification",
      "",
      "## Question and current understanding",
      "The two products share factory-total electricity.",
      "",
      "## Human response verbatim",
      "Build two processes and allocate electricity by metered production quantity: 60% and 40%.",
      "",
      "## Normalized interpretation",
      "Use two product processes and allocate the bill 60:40 for the stated site and period.",
      "",
      "## Scope and impact",
      "Applies to product-a and product-b; changes boundary, allocation, and electricity exchanges.",
      "",
      "## Unresolved limits",
      "No cell-level locator was available for the human business rule.",
      "",
      "Reviewer: enterprise-model-owner",
      "Timestamp: 2026-07-17T01:00:00Z",
      "",
    ].join("\n"),
  );
  const clarificationSha256 = sha256Text(fs.readFileSync(clarificationPath, "utf8"));
  writeJson(path.join(interactionDir, "decision.json"), {
    schema_version: 1,
    interaction_id: "hitl-001",
    task_id: "enterprise-fixture",
    scope_ids: ["product-a", "product-b"],
    input_types: ["boundary_decision", "allocation_decision", "source_clarification"],
    decision_status: "completed",
    source_type: "human_clarification",
    clarification_document_path: "human-interactions/hitl-001/clarification.md",
    clarification_document_sha256: clarificationSha256,
    basis_documents: ["human-interactions/hitl-001/clarification.md"],
    checkpoint_path: "checkpoints/01-boundary-mapping.json",
    selected_candidate_id: "two-processes-metered-production-allocation",
    normalized_decision: {
      process_count: 2,
      electricity_allocation: { "product-a": 0.6, "product-b": 0.4 },
      supports_fields: ["process_boundary", "reference_product", "electricity_exchange"],
    },
    reviewer: "enterprise-model-owner",
    decided_at: "2026-07-17T01:00:00Z",
  });

  const decision = readJson(path.join(interactionDir, "decision.json"));
  assert.equal(decision.clarification_document_sha256, clarificationSha256);
  assert.equal(decision.source_type, "human_clarification");
  assert.equal(decision.normalized_decision.supports_fields.length, 3);
  assert.equal(contract.document_level_provenance.missing_field_level_locator_is_blocking, false);
  assert.equal(
    transition("material_question_answered").precondition,
    "clarification_document_persisted_and_hashed",
  );
});

test("changed clarification or source hash invalidates old scope evidence", (t) => {
  const root = `${fixtureRoot}-invalidated`;
  fs.rmSync(root, { recursive: true, force: true });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { interactionDir, sourceManifest, sourceManifestSha256 } =
    writeInitialPausedWorkspace(root);
  const clarificationPath = path.join(interactionDir, "clarification.md");
  writeText(clarificationPath, "Original clarification\n");
  const oldClarificationSha256 = sha256Text(fs.readFileSync(clarificationPath, "utf8"));
  writeJson(path.join(interactionDir, "decision.json"), {
    clarification_document_sha256: oldClarificationSha256,
  });

  writeText(clarificationPath, "Corrected clarification with a different allocation\n");
  const newClarificationSha256 = sha256Text(fs.readFileSync(clarificationPath, "utf8"));
  const source = readJson(sourceManifest);
  source.source_paths[0].sha256 = "c".repeat(64);
  writeJson(sourceManifest, source);
  const newSourceManifestSha256 = sha256Text(fs.readFileSync(sourceManifest, "utf8"));

  assert.notEqual(newClarificationSha256, oldClarificationSha256);
  assert.notEqual(newSourceManifestSha256, sourceManifestSha256);
  assert.equal(
    contract.resume_and_invalidation.clarification_document_changed.old_decision_reuse_allowed,
    false,
  );
  assert.equal(
    contract.resume_and_invalidation.new_or_changed_source_files.invalidate_affected_rows,
    true,
  );
  assert.ok(
    contract.resume_and_invalidation.required_rerun_gates.includes("process_material_balance"),
  );
});

test("ready-only execution may commit and close an independent scope while another waits", (t) => {
  const root = `${fixtureRoot}-ready-only`;
  fs.rmSync(root, { recursive: true, force: true });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const processPayload = { processDataSet: { fixture: "independent-product" } };
  const finalRowsPath = path.join(root, "deliverables/processes.jsonl");
  writeText(finalRowsPath, `${JSON.stringify(processPayload)}\n`);
  const finalRowsSha256 = sha256Text(fs.readFileSync(finalRowsPath, "utf8"));
  const reportKinds = [
    ...contract.artifacts.required_reports,
    ...contract.artifacts.required_commit_reports,
  ];
  const reports = reportKinds.map((kind) => {
    const reportPath = path.join(root, "reports", `${kind}.json`);
    writeJson(reportPath, {
      schema_version: 1,
      status: "passed",
      scope_id: "independent-product",
      input_rows_path: "deliverables/processes.jsonl",
      input_rows_sha256: finalRowsSha256,
    });
    return {
      scope_id: "independent-product",
      kind,
      status: "passed",
      report_path: path.relative(root, reportPath),
      report_sha256: sha256Text(fs.readFileSync(reportPath, "utf8")),
      input_rows_path: "deliverables/processes.jsonl",
      input_rows_sha256: finalRowsSha256,
    };
  });
  writeJson(path.join(root, "enterprise-process-result.json"), {
    schema_version: 1,
    task_id: "enterprise-fixture",
    use_case_id: "enterprise-process-from-files",
    status: "partially_completed",
    completed_processes: [{ scope_id: "independent-product", status: "committed_and_verified" }],
    pending_interactions: ["hitl-dependent-product"],
    clarification_documents: [],
    blocked_scopes: [{ scope_id: "dependent-product", status: "awaiting_human_input" }],
    warnings: ["uncertainty_completeness"],
    reports,
    commit_performed: true,
    committed_scopes: [
      {
        scope_id: "independent-product",
        final_rows_path: "deliverables/processes.jsonl",
        final_rows_sha256: finalRowsSha256,
        state_code: 0,
      },
    ],
    write_scope_closeouts: [
      {
        scope_id: "independent-product",
        status: "completed",
        report_path: "reports/post_write_closeout.json",
        input_rows_sha256: finalRowsSha256,
      },
    ],
    completion_report: null,
  });
  writeJson(path.join(root, "deliverables/processes/independent-product.json"), processPayload);

  const result = readJson(path.join(root, "enterprise-process-result.json"));
  assert.equal(result.status, "partially_completed");
  assert.equal(result.completed_processes.length, 1);
  assert.equal(result.blocked_scopes[0].status, "awaiting_human_input");
  assert.deepEqual(
    result.reports.map((report) => report.kind),
    reportKinds,
  );
  assert.equal(
    result.reports.every((report) => report.input_rows_sha256 === finalRowsSha256),
    true,
  );
  assert.equal(transition("batch_review_issue_detected").interrupt_now, false);
  assert.equal(result.commit_performed, true);
  assert.equal(result.committed_scopes[0].state_code, 0);
  assert.equal(result.write_scope_closeouts[0].status, "completed");
  assert.equal(result.completion_report, null);
  assert.equal(contract.completion.remote_write_allowed, true);
  assert.deepEqual(contract.artifacts.write_lifecycle.ordered_stages.slice(0, 6), [
    "post_authoring_finalize",
    "mutation_manifest",
    "commit_handoff_plan",
    "published_cli_commit",
    "post_write_verification",
    "post_write_closeout",
  ]);
  for (const kind of contract.artifacts.required_commit_reports) {
    assert.equal(fs.existsSync(path.join(root, "reports", `${kind}.json`)), true, kind);
  }
  assert.equal(fs.existsSync(path.join(root, "publication-report.json")), false);
});

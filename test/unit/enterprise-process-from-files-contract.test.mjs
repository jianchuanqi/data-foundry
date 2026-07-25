import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function readText(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const contract = readJson("specs/use-cases/enterprise-process-from-files.json");

test("enterprise process use-case keeps the established lane and adds governed remote completion", () => {
  assert.equal(contract.schema_version, 1);
  assert.equal(contract.routing.lane, "source-evidence-dataset-development");
  assert.equal(contract.routing.task_kind, "source-evidence-dataset-development");
  assert.equal(contract.routing.profile, "enterprise-process-from-files");
  assert.equal(contract.routing.input_mode, "files_only");
  assert.equal(contract.routing.interaction_policy, "interrupt_on_material_decision");
  assert.equal(contract.routing.completion_contract, "tidas_process_import_completed_v1");
  assert.equal(contract.routing.allow_remote_commit, true);
  assert.match(contract.routing.allow_remote_commit_semantics, /explicitly set.*false/u);
  assert.equal(contract.execution.current_agent_surface, "codex");
  assert.equal(contract.execution.openclaw_integration_in_scope, false);
  assert.equal(contract.execution.scope_isolation, "ready_only");
  assert.deepEqual(contract.statuses.scope, [
    "running",
    "awaiting_human_input",
    "verified_import_compatible",
    "ready_for_commit",
    "committed_and_verified",
    "blocked_hard_gate",
    "failed",
  ]);
  assert.deepEqual(contract.statuses.job, [
    "verified_import_compatible",
    "partially_verified_import_compatible",
    "completed",
    "partially_completed",
    "awaiting_human_input",
    "blocked",
    "failed",
  ]);
  assert.equal(contract.artifacts.job.path, "enterprise-process-job.json");
  assert.deepEqual(contract.artifacts.job.initial_user_required_fields, ["source_files"]);
  for (const field of [
    "schema_version",
    "task_id",
    "use_case_id",
    "source_files",
    "workspace",
    "profile",
  ]) {
    assert.ok(contract.artifacts.job.required_fields.includes(field), field);
  }
  assert.deepEqual(contract.artifacts.job.source_file_user_required_fields, ["path"]);
  assert.deepEqual(contract.artifacts.job.source_file_orchestrator_generated_fields, [
    "sha256",
    "media_type",
  ]);
  assert.equal(contract.artifacts.source_manifest.path, "source-manifest.json");
  assert.equal(contract.artifacts.human_interactions.index_path, "human-interactions/index.jsonl");
  assert.equal(contract.artifacts.result.path, "enterprise-process-result.json");
  assert.equal(contract.artifacts.deliverables.eligible_scope_status, "verified_import_compatible");
  assert.equal(contract.artifacts.deliverables.commit_eligible_scope_status, "ready_for_commit");
  assert.equal(contract.artifacts.deliverables.completed_scope_status, "committed_and_verified");
  assert.deepEqual(
    contract.artifacts.base_foundry_contract.artifacts.map((artifact) => artifact.path),
    ["foundry-job.json", "seed-manifest.json", "profile-lock.json", "artifact-index.jsonl"],
  );
  const foundryJob = contract.artifacts.base_foundry_contract.artifacts.find(
    (artifact) => artifact.path === "foundry-job.json",
  );
  assert.equal(foundryJob.use_case_constants.target_profile, "enterprise-process-from-files");
  assert.deepEqual(foundryJob.use_case_constants.target_entities, ["support", "flow", "process"]);
  assert.equal(foundryJob.use_case_constants["write_policy.mode"], "commit");
  assert.equal(foundryJob.use_case_constants["write_policy.remote_commit"], "profile_gated_batch");
  assert.equal(foundryJob.use_case_constants["write_policy.requires_human_approval"], false);
  assert.deepEqual(foundryJob.use_case_constants["write_policy.explicit_task_disable"], {
    when: "allow_remote_commit=false",
    "write_policy.mode": "dry-run",
    "write_policy.remote_commit": "disabled",
  });
  assert.equal(
    foundryJob.use_case_constants["execution_policy.blocked_item_policy"],
    "record_and_continue_independent_scopes",
  );
  assert.deepEqual(contract.artifacts.source_manifest.required_fields, [
    "schema_version",
    "source_kind",
    "source_paths",
    "source_citation",
    "captured_at_utc",
  ]);
  assert.deepEqual(contract.artifacts.source_manifest.required_file_fields, [
    "path",
    "sha256",
    "access",
    "media_type",
  ]);
  assert.deepEqual(contract.artifacts.checkpoints.status_vocabulary, [
    "pending",
    "running",
    "passed",
    "failed",
    "waived",
  ]);
  assert.deepEqual(contract.artifacts.checkpoints.pause_representation, {
    checkpoint_status: "pending",
    scope_status: "awaiting_human_input",
    interaction_status: "awaiting_human_input",
  });
});

test("human interaction index and decision artifacts have stable agent-neutral fields", () => {
  const interactions = contract.artifacts.human_interactions;

  for (const field of [
    "interaction_id",
    "task_id",
    "scope_ids",
    "input_types",
    "review_timing",
    "status",
    "request_path",
    "clarification_path",
    "clarification_sha256",
    "decision_path",
    "checkpoint_path",
  ]) {
    assert.ok(interactions.index_row_required_fields.includes(field), field);
  }
  for (const field of [
    "interaction_id",
    "task_id",
    "scope_ids",
    "input_types",
    "decision_status",
    "source_type",
    "clarification_document_path",
    "clarification_document_sha256",
    "basis_documents",
    "checkpoint_path",
    "selected_candidate_id",
    "normalized_decision",
    "reviewer",
    "decided_at",
  ]) {
    assert.ok(interactions.decision_required_fields.includes(field), field);
  }
  assert.deepEqual(interactions.decision_statuses, ["completed", "remain_blocked"]);
  assert.equal(interactions.decision_constant_fields.source_type, "human_clarification");
  assert.deepEqual(interactions.decision_nullable_when_not_applicable, ["selected_candidate_id"]);
});

test("contract distinguishes immediate interruptions from deferred reviews", () => {
  const immediate = new Set(contract.human_in_the_loop.immediate_triggers);
  const batch = new Set(contract.human_in_the_loop.batch_review_triggers);

  assert.ok(immediate.has("process_count_or_boundary_ambiguity"));
  assert.ok(immediate.has("shared_input_output_allocation_ambiguity"));
  assert.ok(immediate.has("conflicting_values_across_documents"));
  assert.ok(
    immediate.has(
      "process_material_balance_deviation_requiring_source_boundary_unit_or_omission_clarification",
    ),
  );
  assert.ok(batch.has("synonyms"));
  assert.ok(batch.has("uncertainty_or_representativeness"));
  assert.equal(contract.human_in_the_loop.interruption_behavior.checkpoint_before_pause, true);
  assert.equal(contract.human_in_the_loop.interruption_behavior.continue_independent_scopes, true);
  assert.ok(
    contract.human_in_the_loop.interruption_behavior.question_contract.includes(
      "free_text_response_allowed",
    ),
  );
  assert.ok(
    contract.human_in_the_loop.interruption_behavior.question_contract.includes(
      "natural_lca_professional_language",
    ),
  );
  const languagePolicy = contract.human_in_the_loop.user_facing_clarification_language_policy;
  assert.equal(
    languagePolicy.ask_only_for_information_needed_to_resolve_the_current_modeling_decision,
    true,
  );
  assert.equal(languagePolicy.internal_blocker_status_and_command_codes_shown_by_default, false);
  assert.equal(languagePolicy.machine_artifacts_retain_stable_codes, true);
  assert.match(
    contract.human_in_the_loop.scope_construction_precedence,
    /immediate process-count\/boundary interruption takes precedence/u,
  );
  const transitions = new Map(
    contract.human_in_the_loop.state_transitions.map((transition) => [
      transition.event,
      transition,
    ]),
  );
  assert.equal(
    transitions.get("material_ambiguity_detected").downstream_process_rows_allowed,
    false,
  );
  assert.equal(
    transitions.get("material_question_answered").precondition,
    "clarification_document_persisted_and_hashed",
  );
  assert.equal(transitions.get("batch_review_issue_detected").interrupt_now, false);
});

test("human clarification is a complete document-level source rather than a field-citation gate", () => {
  const provenance = contract.document_level_provenance;
  const clarification = contract.human_in_the_loop.clarification_document;

  assert.equal(provenance.minimum_granularity, "document");
  assert.equal(provenance.source_file_sha256_required, true);
  assert.equal(provenance.complete_source_documents_retained, true);
  assert.equal(provenance.clarification_documents_are_valid_sources, true);
  assert.equal(provenance.one_document_may_support_multiple_fields_and_decisions, true);
  assert.equal(provenance.field_level_locator_policy, "best_effort");
  assert.equal(provenance.missing_field_level_locator_is_blocking, false);
  assert.equal(clarification.required_before_use_in_authoring, true);
  assert.equal(clarification.chat_history_alone_is_sufficient, false);

  for (const requiredContent of [
    "question_and_current_system_understanding",
    "human_response_verbatim",
    "normalized_interpretation",
    "applicable_enterprise_site_product_period_and_process_scopes",
    "impact_on_boundary_units_allocation_or_exchanges",
    "unresolved_limits",
    "timestamp",
    "reviewer",
  ]) {
    assert.ok(clarification.required_content.includes(requiredContent), requiredContent);
  }
  assert.equal(clarification.required_content.includes("document_sha256"), false);
  assert.equal(clarification.integrity.algorithm, "sha256");
  assert.equal(clarification.integrity.hash_target, "completed clarification.md bytes");
  assert.equal(clarification.integrity.compute_after_document_is_complete, true);
  assert.equal(clarification.integrity.embedded_in_clarification_document, false);
  assert.deepEqual(clarification.integrity.stored_in, [
    "human-interactions/index.jsonl",
    "decision.json",
  ]);
  assert.deepEqual(clarification.integrity.fields_by_artifact, {
    "human-interactions/index.jsonl": "clarification_sha256",
    "decision.json": "clarification_document_sha256",
  });

  assert.deepEqual(
    new Set(contract.human_in_the_loop.human_input_types),
    new Set([
      "source_clarification",
      "boundary_decision",
      "allocation_decision",
      "conflict_resolution",
      "canonical_identity_decision",
      "classification_or_location_decision",
      "data_correction",
      "approval",
    ]),
  );
});

test("resume invalidates affected evidence and reruns every import-compatibility gate", () => {
  const policy = contract.resume_and_invalidation;
  const sourceChange = policy.new_or_changed_source_files;

  assert.equal(policy.resume_precondition, "persist_clarification_document");
  assert.equal(sourceChange.update_source_manifest, true);
  assert.equal(sourceChange.invalidate_affected_checkpoints, true);
  assert.equal(sourceChange.invalidate_affected_decisions, true);
  assert.equal(sourceChange.invalidate_affected_rows, true);
  for (const gate of [
    "schema_validation",
    "deterministic_qa",
    "canonical_reference_closure",
    "process_material_balance",
    "classification_audit",
    "location_audit",
    "process_save_draft_dry_run",
  ]) {
    assert.ok(policy.required_rerun_gates.includes(gate), gate);
  }
  assert.equal(policy.clarification_document_changed.detect_by, "clarification_document_sha256");
  assert.equal(policy.clarification_document_changed.invalidate_affected_decisions, true);
  assert.equal(policy.clarification_document_changed.invalidate_affected_checkpoints, true);
  assert.equal(policy.clarification_document_changed.invalidate_affected_calculations, true);
  assert.equal(policy.clarification_document_changed.invalidate_affected_rows, true);
  assert.equal(policy.clarification_document_changed.old_decision_reuse_allowed, false);
});

test("material balance is a visible profile waiver while write-safety gates stay non-waivable", () => {
  const gatesByCode = new Map(contract.gates.non_waivable.map((gate) => [gate.code, gate]));
  const documentProvenance = gatesByCode.get("document_level_provenance_missing");
  const requiredEnglish = gatesByCode.get("required_multilingual_en_missing");
  const waiverPolicy = contract.gates.profile_waiver_policy;
  const canonicalPolicy = contract.gates.canonical_flow_policy;
  const sourceContactPolicy = contract.gates.source_contact_policy;

  assert.equal(contract.gates.profile_waivers_allowed, true);
  assert.equal(gatesByCode.has("process_material_balance_deviation"), false);
  assert.deepEqual(waiverPolicy.authorized_qa_codes_by_type, {
    process: ["process_material_balance_deviation"],
  });
  assert.equal(waiverPolicy.authorization.source, "user_policy_decision");
  assert.equal(waiverPolicy.authorization_must_be_persisted_in_profile_and_profile_lock, true);
  assert.equal(waiverPolicy.per_scope_human_approval_required, false);
  assert.equal(waiverPolicy.waived_finding_must_remain_in_qa_and_material_balance_reports, true);
  assert.equal(waiverPolicy.waived_finding_outcome, "warning");
  assert.equal(documentProvenance.outcome, "blocked_hard_gate");
  assert.equal(documentProvenance.field_level_locator_required, false);
  assert.equal(requiredEnglish.outcome, "blocked_hard_gate");
  assert.equal(requiredEnglish.preserve_source_language_variants, true);
  for (const code of [
    "tidas_schema_or_required_field_error",
    "deterministic_validation_or_unwaived_qa_error",
    "invalid_classification_or_location",
    "exact_reference_closure_missing",
    "canonical_support_amount_scaling_required",
    "exact_payload_evidence_stale_or_mismatched",
    "target_owner_or_account_write_guard_missing",
    "write_scope_dry_run_failed_or_missing",
    "post_write_readback_failed_or_missing",
    "post_write_closeout_failed_or_missing",
  ]) {
    assert.equal(gatesByCode.get(code)?.outcome, "blocked_hard_gate", code);
  }

  assert.equal(canonicalPolicy.public_canonical_search_first, true);
  assert.equal(canonicalPolicy.public_canonical_reuse_required_when_equivalent_exists, true);
  assert.equal(canonicalPolicy.account_local_creation_allowed_when_no_equivalent_exists, true);
  assert.equal(canonicalPolicy.local_flow_minting_allowed, true);
  assert.equal(canonicalPolicy.account_local_state_code, 0);
  assert.ok(canonicalPolicy.account_local_candidate_types.includes("waste_flow"));
  assert.ok(canonicalPolicy.account_local_candidate_types.includes("flowproperty"));
  assert.ok(
    canonicalPolicy.creation_requirements.includes("same_owner_state_code_0_reference_closure"),
  );

  assert.equal(sourceContactPolicy.account_local_authoring_allowed_when_no_equivalent_exists, true);
  assert.deepEqual(sourceContactPolicy.authorable_types, ["source", "contact"]);
  assert.equal(sourceContactPolicy.ordered_support_commit_required, true);
  assert.equal(sourceContactPolicy.dependent_scope_may_commit_before_support_readback, false);
  assert.deepEqual(contract.artifacts.account_local_support.row_paths, {
    flowproperty: "rows/flowproperties.jsonl",
    unitgroup: "rows/unitgroups.jsonl",
  });
  assert.equal(
    contract.artifacts.account_local_support.candidate_registry_path,
    "account-local-support/candidate-registry.jsonl",
  );
  assert.match(contract.artifacts.account_local_support.scope_policy, /state_code=0/u);
  assert.ok(
    contract.artifacts.account_local_support.required_evidence.includes(
      "unit_scale_and_conversion_factors",
    ),
  );
  assert.equal(contract.completion.dry_run_success_required, true);
  assert.equal(contract.completion.remote_write_allowed, true);
  assert.equal(contract.completion.remote_write_policy.task_write_policy_required, true);
  assert.equal(
    contract.completion.remote_write_policy.required_remote_commit_mode,
    "profile_gated_batch",
  );
  assert.equal(
    contract.completion.remote_write_policy.foundry_direct_database_write_allowed,
    false,
  );
  assert.equal(
    contract.completion.remote_write_policy.target_owner_and_account_guard_required,
    true,
  );
  assert.equal(contract.completion.remote_write_policy.post_write_verification_required, true);
  assert.equal(contract.completion.task_complete_command_allowed, true);
  assert.equal(contract.completion.task_queue_terminal_transition_performed, true);
  assert.equal(contract.completion.scope_completion_status, "committed_and_verified");
  assert.equal(contract.completion.terminal_artifact, "dataset-import-completion-report.json");
  assert.equal(contract.artifacts.result.exact_payload_binding.required, true);
  for (const field of [
    "scope_id",
    "kind",
    "status",
    "report_path",
    "report_sha256",
    "input_rows_path",
    "input_rows_sha256",
  ]) {
    assert.ok(contract.artifacts.result.report_entry_required_fields.includes(field), field);
  }
  assert.match(contract.artifacts.result.dynamic_write_fields.commit_performed, /Boolean/u);

  for (const forbidden of ["openclaw_integration", "publication"]) {
    assert.ok(contract.completion.forbidden_stages.includes(forbidden), forbidden);
  }
  for (const required of [
    "mutation_manifest",
    "commit_handoff",
    "published_cli_commit",
    "post_write_readback",
    "post_write_closeout",
  ]) {
    assert.ok(contract.completion.required_stages_for_committed_scope.includes(required), required);
  }
  assert.deepEqual(contract.completion.forbidden_artifact_kinds, [
    "openclaw_configuration",
    "publication_report",
  ]);
  assert.deepEqual(contract.artifacts.required_commit_reports, [
    "post_authoring_finalize",
    "mutation_manifest",
    "commit_handoff_plan",
    "commit_report",
    "post_write_verification",
    "post_write_closeout",
  ]);
  assert.deepEqual(contract.artifacts.write_lifecycle.ordered_stages.slice(-3), [
    "post_write_closeout",
    "dataset_import_completion_report",
    "task_complete",
  ]);
});

test("missing annual volume uses the governed sentinel as a warning", () => {
  const policy = contract.gates.missing_data_policy.annualSupplyOrProductionVolume;

  assert.equal(policy.when, "source_value_missing");
  assert.equal(policy.value, 9999);
  assert.equal(policy.unit, "missing-data-sentinel/year");
  assert.equal(policy.outcome, "warning");
  assert.equal(policy.warning_code, "annual_volume_missing_data_sentinel_used");
  assert.deepEqual(policy.forbidden_fallbacks, ["invented_annual_volume", "common:other"]);
  assert.ok(contract.gates.warnings.includes(policy.warning_code));
});

test("dedicated enterprise profile carries the globally authorized material-balance waiver", () => {
  const profiles = readJson("specs/import-profiles.json");
  const generic = profiles.profiles.generic;
  const enterprise = profiles.profiles[contract.routing.profile];

  assert.equal(profiles.default_profile, "generic");
  assert.deepEqual(generic.waived_qa_codes_by_type, {});
  assert.ok(enterprise);
  const waivedProcessCodes = enterprise.waived_qa_codes_by_type.process ?? [];
  assert.equal(waivedProcessCodes.includes("process_material_balance_deviation"), true);
  assert.match(
    enterprise.waiver_reasons.process_material_balance_deviation,
    /warning|write blocker/iu,
  );
});

test("repository exposes a dedicated template and local orchestration skill", () => {
  const template = readText("tasks/templates/enterprise-process-from-files.md");
  const skill = readText(".agents/skills/foundry-enterprise-process-from-files/SKILL.md");
  const openAi = readText(
    ".agents/skills/foundry-enterprise-process-from-files/agents/openai.yaml",
  );
  const skills = readJson(".agents/shared-skills.json");
  const locations = readJson("docs/file-location-registry.json");
  const registration = skills.local_project_skills.find(
    (item) => item.name === "foundry-enterprise-process-from-files",
  );

  assert.match(template, /^---\n[\s\S]*kind: source-evidence-dataset-development/mu);
  assert.match(template, /^profile: enterprise-process-from-files$/mu);
  assert.match(template, /^input_mode: files_only$/mu);
  assert.match(template, /^interaction_policy: interrupt_on_material_decision$/mu);
  assert.match(template, /^allow_remote_commit: true$/mu);
  assert.match(template, /^completion_contract: tidas_process_import_completed_v1$/mu);
  assert.match(template, /dataset-import-completion-report|task-complete/u);

  assert.match(skill, /^---\nname: foundry-enterprise-process-from-files\n/u);
  assert.match(skill, /process_material_balance_deviation/u);
  assert.match(skill, /state_code=0/u);
  assert.match(skill, /profile_gated_batch|task write policy/u);
  assert.match(skill, /interrupt before authoring either interpretation/u);
  assert.match(skill, /do not embed a self-referential whole-file hash/u);
  assert.match(skill, /dataset-import-completion-report|task-complete/u);
  assert.doesNotMatch(skill, /\b(?:TODO|FIXME)\b/u);
  assert.match(openAi, /\$foundry-enterprise-process-from-files/u);
  assert.deepEqual(registration, {
    name: "foundry-enterprise-process-from-files",
    owner: "tiangong-lca-data-foundry",
    path: ".agents/skills/foundry-enterprise-process-from-files",
    tracked: true,
    purpose:
      "Foundry-local enterprise-files-to-process orchestration with interruptible HITL, guarded account-local dependencies, and policy-gated write/readback completion.",
  });
  assert.equal(
    locations.entries.find((entry) => entry.id === "enterprise-process-from-files-contract")
      ?.current_path,
    "specs/use-cases/enterprise-process-from-files.json",
  );
});

test("downstream Foundry skills honor profile-authorized enterprise dependencies", () => {
  const authoring = readText(".agents/skills/foundry-tidas-authoring/SKILL.md");
  const importing = readText(".agents/skills/foundry-tidas-import/SKILL.md");

  assert.match(authoring, /account_local_create_new_allowed_for_elementary_flow=true/u);
  assert.match(authoring, /--profile <frozen-profile-id>/u);
  assert.match(authoring, /add evidence-backed `en` values/u);
  assert.doesNotMatch(authoring, /Keep import rows source-language only/u);

  assert.match(importing, /profile-authorized identity task/u);
  assert.match(importing, /--mint-unmatched-fp-ug-support/u);
  assert.match(importing, /--profile <frozen-profile-id>/u);
  assert.match(importing, /include evidence-backed `en` values/u);
  assert.doesNotMatch(importing, /elementary flows can only reuse existing TianGong flows/u);
  assert.doesNotMatch(importing, /Flow Properties and Unit Groups are reference-only:/u);
});

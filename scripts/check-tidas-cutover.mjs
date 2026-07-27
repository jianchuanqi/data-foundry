import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const historicalDocs = new Set([
  "docs/import-profiles/bafu/bafu-endgame-goal.md",
  "docs/import-profiles/hiq/hiq-import-governance-proposal.md",
  "docs/import-profiles/hiq/hiq-issue-03-source-data-labeling-and-normalization.md",
  "docs/import-profiles/worldsteel/import-plan.md",
  "docs/runner-improvements-from-bafu-cleanup.md",
  "docs/uslci-import-plan.md",
  "docs/uslci-import-runbook.md",
  "inputs/source-packages/uslci-database-public.md",
]);

const forbidden = [
  /TIANGONG_LCA_TIDAS_SDK_DIR/u,
  /TIANGONG_TIDAS_TOOLS_EXECUTABLE/u,
  /tidas-release-tool/u,
  /dataset\s+import-lca/u,
  /--tidas-tools-dir/u,
  /src\/tidas_tools/u,
  /python(?:3)?\s+-m\s+tidas_tools/u,
];

function walk(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) return [];
  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) return [relativePath];
  return fs
    .readdirSync(absolutePath, { withFileTypes: true })
    .flatMap((entry) => walk(path.posix.join(relativePath, entry.name)));
}

export function auditTidasCutover() {
  const files = [
    "AGENTS.md",
    "README.md",
    "WORKFLOW.md",
    ".env.example",
    ...walk(".agents/skills"),
    ...walk("docs"),
    ...walk("specs"),
    ...walk("scripts"),
  ].filter(
    (file) =>
      !historicalDocs.has(file) &&
      file !== "scripts/check-tidas-cutover.mjs" &&
      !file.startsWith("reports/") &&
      /\.(?:js|json|md|mjs|ya?ml)$/u.test(file),
  );
  const findings = [];
  for (const file of files) {
    const lines = fs.readFileSync(path.join(repoRoot, file), "utf8").split(/\r?\n/u);
    lines.forEach((line, index) => {
      for (const pattern of forbidden) {
        if (pattern.test(line)) {
          findings.push({
            file,
            line: index + 1,
            pattern: pattern.source,
          });
        }
      }
    });
  }
  return {
    schema_version: 1,
    status: findings.length === 0 ? "passed" : "failed",
    active_files_scanned: files.length,
    historical_documents_excluded: [...historicalDocs].sort(),
    forbidden_patterns: forbidden.map((pattern) => pattern.source),
    findings,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = auditTidasCutover();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status !== "passed") process.exitCode = 1;
}

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");

interface SkillEntry {
  name: string;
  source: string;
  source_type: string;
  agent?: string;
  install_command: string;
  use_command: string;
}

interface SharedSkillsConfig {
  default_agent: string;
  package_commands: Record<string, string>;
  local_project_skills: SkillEntry[];
  shared_runtime_skills: SkillEntry[];
}

interface PackageConfig {
  scripts: Record<string, string>;
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8")) as T;
}

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("document-granular-decompose is a runtime Tiangong AI skill, not a tracked Foundry skill", () => {
  const sharedSkills = readJson<SharedSkillsConfig>(".agents/shared-skills.json");
  const packageJson = readJson<PackageConfig>("package.json");
  const gitignore = readText(".gitignore");

  const localNames = new Set(sharedSkills.local_project_skills.map((skill) => skill.name));
  assert.equal(localNames.has("document-granular-decompose"), false);

  const runtimeSkill = sharedSkills.shared_runtime_skills.find(
    (skill) => skill.name === "document-granular-decompose",
  );
  assert.ok(runtimeSkill, "document-granular-decompose should be configured as a runtime skill");
  assert.equal(runtimeSkill.source, "https://github.com/tiangong-ai/skills");
  assert.equal(runtimeSkill.source_type, "github");
  assert.match(
    runtimeSkill.install_command,
    /skills@latest add https:\/\/github\.com\/tiangong-ai\/skills/,
  );
  assert.match(
    runtimeSkill.use_command,
    /skills@latest use https:\/\/github\.com\/tiangong-ai\/skills/,
  );

  assert.match(packageJson.scripts["skills:install:shared"], /document-granular-decompose/);
  assert.match(
    packageJson.scripts["skills:source-evidence:use:document"],
    /document-granular-decompose/,
  );
  assert.match(gitignore, /\.agents\/skills\/document-granular-decompose\//);
});

test("persistent runtime skills install only into the universal project skill root", () => {
  const sharedSkills = readJson<SharedSkillsConfig>(".agents/shared-skills.json");
  const packageJson = readJson<PackageConfig>("package.json");
  const installScript = packageJson.scripts["skills:install:shared"];

  assert.equal(sharedSkills.default_agent, "universal");
  assert.match(sharedSkills.package_commands.install_all_shared_runtime, /--agent universal/u);
  assert.doesNotMatch(sharedSkills.package_commands.install_all_shared_runtime, /--agent '\*'/u);
  assert.match(installScript, /--agent universal/u);
  assert.doesNotMatch(installScript, /--agent '\*'/u);

  for (const skill of sharedSkills.shared_runtime_skills) {
    assert.equal(skill.agent, "universal", skill.name);
    assert.match(skill.install_command, /--agent universal/u, skill.name);
    assert.doesNotMatch(skill.install_command, /--agent '\*'/u, skill.name);
  }
});

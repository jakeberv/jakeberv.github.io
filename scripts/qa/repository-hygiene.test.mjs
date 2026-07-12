import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function git(args) {
  const result = spawnSync("git", args, { cwd: repositoryRoot, encoding: "utf8" });
  if (result.error) assert.fail(`Unable to run git ${args.join(" ")}: ${result.error.message}`);
  if (result.status !== 0 && result.status !== 1) {
    assert.fail(result.stderr.trim() || `git ${args.join(" ")} exited ${result.status}`);
  }
  return result;
}

test("local and generated root state is ignored but not tracked", async () => {
  const localArtifacts = [
    ".RData",
    "todo",
    "citing_paper_details_batch.RDS",
    "second_degree_citing_paper_details_batch.RDS",
  ];

  for (const artifact of localArtifacts) {
    assert.equal(
      git(["ls-files", "--error-unmatch", artifact]).status,
      1,
      `${artifact} must not remain tracked`,
    );
    assert.equal(
      git(["check-ignore", "--no-index", "--quiet", artifact]).status,
      0,
      `${artifact} must remain ignored locally`,
    );
  }

  const dockerignore = await readFile(path.join(repositoryRoot, ".dockerignore"), "utf8");
  assert.match(dockerignore, /^\/\.RData$/m);
  assert.match(dockerignore, /^\/\*\.RDS$/m);
  assert.match(dockerignore, /^\/todo$/m);
});

test("R analysis source is sanitized, documented, and lives outside the repository root", async () => {
  const relocated = {
    "scripts/analysis/citation_map_parser.R": "citation_map_parser.R",
    "scripts/analysis/legacy/citation_analysis.R": "citation_analysis.R",
    "scripts/analysis/legacy/citation_network.R": "citation_network.R",
  };

  for (const [target, formerRootPath] of Object.entries(relocated)) {
    await access(path.join(repositoryRoot, target));
    await assert.rejects(access(path.join(repositoryRoot, formerRootPath)));
  }

  const [citationAnalysis, analysisReadme] = await Promise.all([
    readFile(path.join(repositoryRoot, "scripts/analysis/legacy/citation_analysis.R"), "utf8"),
    readFile(path.join(repositoryRoot, "scripts/analysis/README.md"), "utf8"),
  ]);
  assert.match(citationAnalysis, /Sys\.getenv\("SEMANTIC_SCHOLAR_API_KEY"/);
  assert.doesNotMatch(citationAnalysis, /api_key\s*<-\s*["'][^"']+["']/);
  assert.match(analysisReadme, /SEMANTIC_SCHOLAR_API_KEY/);
  assert.match(analysisReadme, /not part of the website build/);
});

test("documentation and npm expose the repository hygiene contract", async () => {
  const [packageSource, pipelineSpec] = await Promise.all([
    readFile(path.join(repositoryRoot, "package.json"), "utf8"),
    readFile(path.join(repositoryRoot, "agents/IMPACT_DATA_PIPELINE_SPEC_TEMPLATE.md"), "utf8"),
  ]);
  const packageDefinition = JSON.parse(packageSource);

  assert.equal(
    packageDefinition.scripts["check:hygiene"],
    "node --test scripts/qa/repository-hygiene.test.mjs",
  );
  assert.match(packageDefinition.scripts.test, /scripts\/qa\/repository-hygiene\.test\.mjs/);
  assert.match(pipelineSpec, /scripts\/analysis\/citation_map_parser\.R/);
  assert.doesNotMatch(pipelineSpec, /`citation_map_parser\.R`/);
});

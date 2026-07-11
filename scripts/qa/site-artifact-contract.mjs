import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const modulePath = fileURLToPath(import.meta.url);
const defaultRepositoryRoot = path.resolve(path.dirname(modulePath), "../..");

const protectedPrefixes = [
  ".devcontainer/",
  ".github/",
  ".Rproj.user/",
  "agents/",
  "docs/superpowers/",
  "markdown_generator/",
  "node_modules/",
  "scripts/",
];

const protectedFilenames = new Set([
  ".rdata",
  ".rhistory",
  ".ruserdata",
  "agents.md",
  "contributing.md",
  "dockerfile",
  "gemfile",
  "gemfile.lock",
  "website.rproj",
  "docker-compose.yaml",
  "package-lock.json",
  "package.json",
  "todo",
]);

const developmentExtensions = new Set([
  ".command",
  ".ipynb",
  ".lock",
  ".mjs",
  ".py",
  ".r",
  ".rds",
  ".rproj",
]);

export function parseRouteManifest(source) {
  return source.trim().split(/\r?\n/).filter(Boolean);
}

export function normalizeArtifactPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function contractError(violations) {
  return new Error(`Site artifact contract failed:\n${violations.map((violation) => `- ${violation}`).join("\n")}`);
}

export function validateArtifactInventory({ files, expectedRoutes }) {
  const normalizedFiles = [...new Set(files.map(normalizeArtifactPath))].sort();
  const routes = normalizedFiles.filter((file) => file.endsWith(".html"));
  const violations = [];
  const seenExpectedRoutes = new Set();
  for (const route of expectedRoutes) {
    if (seenExpectedRoutes.has(route)) violations.push(`duplicate expected HTML route: ${route}`);
    seenExpectedRoutes.add(route);
  }
  const expected = [...new Set(expectedRoutes)].sort();
  const actualRouteSet = new Set(routes);
  const expectedRouteSet = new Set(expected);

  for (const route of expected) {
    if (!actualRouteSet.has(route)) violations.push(`missing HTML route: ${route}`);
  }
  for (const route of routes) {
    if (!expectedRouteSet.has(route)) violations.push(`unexpected HTML route: ${route}`);
  }

  for (const file of normalizedFiles) {
    const lowercaseFile = file.toLowerCase();
    const prefix = protectedPrefixes.find((candidate) => lowercaseFile.startsWith(candidate));
    if (prefix) violations.push(`protected path prefix "${prefix}": ${file}`);

    const filename = path.posix.basename(file);
    if (protectedFilenames.has(filename.toLowerCase())) {
      violations.push(`protected filename "${filename}": ${file}`);
    }

    const extension = path.posix.extname(filename);
    if (developmentExtensions.has(extension.toLowerCase())) {
      violations.push(`development extension "${extension}": ${file}`);
    }
  }

  if (violations.length > 0) throw contractError(violations);
  return { files: normalizedFiles.length, routes };
}

async function collectFiles(directory, root = directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(entryPath, root)));
    else if (entry.isFile() || entry.isSymbolicLink()) {
      files.push(normalizeArtifactPath(path.relative(root, entryPath)));
    }
  }
  return files.sort();
}

async function validateScholarSource(repositoryRoot) {
  const scholarScript = path.join(repositoryRoot, "fetch_scholar_metrics.py");
  const scholarWorkflow = path.join(repositoryRoot, ".github/workflows/fetch_scholar_data.yml");

  try {
    await access(scholarScript);
  } catch {
    throw contractError(["tracked Scholar source is missing: fetch_scholar_metrics.py"]);
  }

  let workflow;
  try {
    workflow = await readFile(scholarWorkflow, "utf8");
  } catch {
    throw contractError(["Scholar workflow is missing: .github/workflows/fetch_scholar_data.yml"]);
  }

  if (!/^\s*(?:-\s+run:\s+|if\s+)?python(?:3)?\s+fetch_scholar_metrics\.py(?:\s|;|$)/m.test(workflow)) {
    throw contractError(["Scholar workflow no longer invokes fetch_scholar_metrics.py"]);
  }
}

export async function validateSiteArtifact({
  repositoryRoot = defaultRepositoryRoot,
  siteDirectory = path.join(repositoryRoot, "_site"),
  manifestPath = path.join(repositoryRoot, "scripts/qa/expected-html-routes.txt"),
} = {}) {
  await validateScholarSource(repositoryRoot);
  const [files, manifestSource] = await Promise.all([
    collectFiles(siteDirectory),
    readFile(manifestPath, "utf8"),
  ]);
  return validateArtifactInventory({ files, expectedRoutes: parseRouteManifest(manifestSource) });
}

async function main() {
  const result = await validateSiteArtifact();
  console.log(`Site artifact contract passed: ${result.files} files, ${result.routes.length} HTML routes.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

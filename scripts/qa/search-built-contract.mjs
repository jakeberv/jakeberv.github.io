import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseRouteManifest, validateSiteArtifact } from "./site-artifact-contract.mjs";

const modulePath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(modulePath), "../..");

export const EXPECTED_SEARCH_TYPE_COUNTS = Object.freeze({
  News: 170,
  Publications: 27,
  Research: 5,
  Software: 1,
  Talks: 2,
  Teaching: 1,
  Pages: 4,
});

function contractError(violations) {
  return new Error(`Built search contract failed:\n${violations.map((item) => `- ${item}`).join("\n")}`);
}

function parseAttributes(tag) {
  const attributes = new Map();
  for (const match of tag.matchAll(/([^\s=<>]+)\s*=\s*(["'])(.*?)\2/gs)) {
    attributes.set(match[1].toLowerCase(), match[3]);
  }
  return attributes;
}

function pagefindMeta(source, key) {
  for (const match of source.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0]);
    const declarations = (attributes.get("data-pagefind-meta") || "")
      .split(",")
      .map((value) => value.trim());
    if (declarations.includes(`${key}[content]`)) {
      return { attributes, value: attributes.get("content") || "" };
    }
  }
  return null;
}

export function validateSearchPages({
  pages,
  expectedRoutes,
  expectedTypeCounts = EXPECTED_SEARCH_TYPE_COUNTS,
}) {
  const violations = [];
  const expected = new Set(expectedRoutes);
  const searchable = new Set();
  const typeCounts = Object.fromEntries(Object.keys(expectedTypeCounts).map((type) => [type, 0]));

  for (const [route, source] of pages) {
    if (/\bdata-pagefind-body(?:\s|=|>)/i.test(source)) searchable.add(route);
  }

  for (const route of expected) {
    if (!pages.has(route)) {
      violations.push(`missing HTML route required by search: ${route}`);
      continue;
    }
    if (!searchable.has(route)) violations.push(`missing data-pagefind-body: ${route}`);

    const source = pages.get(route);
    for (const key of ["title", "description", "canonical_url"]) {
      const metadata = pagefindMeta(source, key);
      if (!metadata?.value.trim()) violations.push(`missing Pagefind ${key.replace("_", " ")} metadata: ${route}`);
    }

    const typeMetadata = pagefindMeta(source, "type");
    if (!typeMetadata?.value.trim()) {
      violations.push(`missing Pagefind type metadata: ${route}`);
      continue;
    }
    if (typeMetadata.attributes.get("data-pagefind-filter") !== "type[content]") {
      violations.push(`missing Pagefind type filter metadata: ${route}`);
    }
    const type = typeMetadata.value.trim();
    if (!Object.hasOwn(expectedTypeCounts, type)) {
      violations.push(`unsupported search type "${type}": ${route}`);
      continue;
    }
    typeCounts[type] += 1;
  }

  for (const route of searchable) {
    if (!expected.has(route)) violations.push(`unexpected searchable route: ${route}`);
  }
  for (const [type, expectedCount] of Object.entries(expectedTypeCounts)) {
    if (typeCounts[type] !== expectedCount) {
      violations.push(`search type count ${type}: expected ${expectedCount}, found ${typeCounts[type]}`);
    }
  }

  if (violations.length > 0) throw contractError(violations);
  return { pages: searchable.size, typeCounts };
}

export function validatePagefindInventory(files, { entrySource } = {}) {
  const normalized = [...new Set(files.map((file) => file.split(path.sep).join("/")))].sort();
  const violations = [];
  const requiredExact = new Map([
    ["pagefind/pagefind.js", "missing Pagefind browser API"],
    ["pagefind/pagefind-component-ui.js", "missing Pagefind component module"],
    ["pagefind/pagefind-component-ui.css", "missing Pagefind component stylesheet"],
    ["pagefind/pagefind-entry.json", "missing Pagefind entry metadata"],
  ]);

  for (const [required, message] of requiredExact) {
    if (!normalized.includes(required)) violations.push(message);
  }
  for (const [pattern, message] of [
    [/\.pf_meta$/, "missing Pagefind metadata index"],
    [/\.pf_index$/, "missing Pagefind language index"],
    [/\.pf_fragment$/, "missing Pagefind content fragments"],
    [/(?:\.wasm|\.pagefind)$/, "missing Pagefind search runtime"],
  ]) {
    if (!normalized.some((file) => pattern.test(file))) violations.push(message);
  }
  if (normalized.some((file) => file.startsWith("pagefind/playground/") || /\/playground(?:\/|$)/.test(file))) {
    violations.push("Pagefind playground must not be deployed");
  }
  if (normalized.some((file) => file.startsWith("pagefind/") && file.endsWith(".html"))) {
    violations.push("Pagefind bundle must not add public HTML routes");
  }

  let entry;
  try {
    entry = JSON.parse(entrySource);
  } catch {
    violations.push("Pagefind entry metadata must be valid JSON");
  }
  if (entry) {
    if (entry.version !== "1.5.2") violations.push(`Pagefind bundle version: expected 1.5.2, found ${entry.version}`);
    const indexedPages = Object.values(entry.languages || {})
      .reduce((total, language) => total + Number(language?.page_count || 0), 0);
    if (indexedPages !== 210) {
      violations.push(`Pagefind indexed-page count: expected 210, found ${indexedPages}`);
    }
  }

  if (violations.length > 0) throw contractError(violations);
  return { files: normalized.filter((file) => file.startsWith("pagefind/")).length };
}

async function collectFiles(directory, root = directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(entryPath, root)));
    else if (entry.isFile() || entry.isSymbolicLink()) {
      files.push(path.relative(root, entryPath).split(path.sep).join("/"));
    }
  }
  return files.sort();
}

export async function validateBuiltSearch({
  siteDirectory = path.join(repositoryRoot, "_site"),
  searchManifestPath = path.join(repositoryRoot, "scripts/qa/expected-search-routes.txt"),
} = {}) {
  const [files, manifestSource, artifact] = await Promise.all([
    collectFiles(siteDirectory),
    readFile(searchManifestPath, "utf8"),
    validateSiteArtifact({ repositoryRoot, siteDirectory }),
  ]);
  const pages = new Map();
  for (const file of files.filter((candidate) => candidate.endsWith(".html"))) {
    pages.set(file, await readFile(path.join(siteDirectory, file), "utf8"));
  }

  const search = validateSearchPages({
    pages,
    expectedRoutes: parseRouteManifest(manifestSource),
  });
  const entrySource = await readFile(path.join(siteDirectory, "pagefind/pagefind-entry.json"), "utf8");
  const bundle = validatePagefindInventory(files, { entrySource });
  return { artifactRoutes: artifact.routes.length, bundleFiles: bundle.files, ...search };
}

async function main() {
  if (process.argv.length > 3) throw new Error("Usage: node scripts/qa/search-built-contract.mjs [SITE_DIR]");
  const siteDirectory = process.argv[2] ? path.resolve(process.argv[2]) : path.join(repositoryRoot, "_site");
  const result = await validateBuiltSearch({ siteDirectory });
  console.log(
    `Built search contract passed: ${result.pages} searchable documents, ${result.artifactRoutes} HTML routes, ${result.bundleFiles} Pagefind files.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

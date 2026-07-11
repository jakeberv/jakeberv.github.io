#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const modulePath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(modulePath), "../..");
const defaultSiteUrl = "https://jakeberv.com";

function normalize(filePath) {
  return filePath.split(path.sep).join("/");
}

async function collectFiles(directory, root = directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(entryPath, root)));
    else if (entry.isFile() || entry.isSymbolicLink()) {
      files.push(normalize(path.relative(root, entryPath)));
    }
  }
  return files.sort();
}

function decodePathname(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function localReference(value, { source, siteUrl, allowedExternalPaths }) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  if (/^(?:data|blob|mailto|tel|javascript):/i.test(trimmed)) return null;
  if (trimmed.startsWith("//")) return null;

  let pathname = trimmed.split("#", 1)[0].split("?", 1)[0];
  if (/^https?:/i.test(trimmed)) {
    const target = new URL(trimmed);
    if (target.origin !== new URL(siteUrl).origin) return null;
    if (allowedExternalPaths.some((prefix) => target.pathname === prefix || target.pathname.startsWith(`${prefix}/`))) {
      return null;
    }
    pathname = target.pathname;
  }

  pathname = decodePathname(pathname);
  const sourceDirectory = path.posix.dirname(source);
  const resolved = pathname.startsWith("/")
    ? path.posix.normalize(pathname.slice(1))
    : path.posix.normalize(path.posix.join(sourceDirectory, pathname));
  if (resolved === ".." || resolved.startsWith("../")) {
    return { escaped: true, path: resolved };
  }
  return { escaped: false, path: resolved === "." ? "" : resolved.replace(/^\.\//, "") };
}

function extractHtmlReferences(source) {
  const references = [];
  const tagPattern = /<([a-z][\w:-]*)\b([^>]*)>/gi;
  for (const tagMatch of source.matchAll(tagPattern)) {
    const tag = tagMatch[1].toLowerCase();
    const attributes = tagMatch[2];
    const attributePattern = /\b(href|src|srcset|poster)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
    for (const attributeMatch of attributes.matchAll(attributePattern)) {
      const attribute = attributeMatch[1].toLowerCase();
      const value = attributeMatch[2] ?? attributeMatch[3] ?? "";
      const values = attribute === "srcset"
        ? value.split(",").map((part) => part.trim().split(/\s+/, 1)[0]).filter(Boolean)
        : [value];
      for (const item of values) {
        references.push({
          value: item,
          active: attribute !== "href" || tag !== "a",
          manifest: tag === "link" && /\brel\s*=\s*(?:"manifest"|'manifest')/i.test(attributes),
        });
      }
    }
    if (tag === "meta") {
      const name = attributes.match(/\bname\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      const content = attributes.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      const metaName = (name?.[1] ?? name?.[2] ?? "").toLowerCase();
      if (["msapplication-tileimage", "msapplication-config"].includes(metaName) && content) {
        references.push({ value: content[1] ?? content[2] ?? "", active: true });
      }
    }
  }
  return references;
}

function extractCssReferences(source) {
  return [...source.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]+))\s*\)/gi)]
    .map((match) => ({ value: match[1] ?? match[2] ?? match[3] ?? "", active: true }));
}

function extractXmlReferences(source) {
  return [...source.matchAll(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)]
    .map((match) => ({ value: match[1] ?? match[2] ?? "", active: true }));
}

function resolveInventoryPath(reference, inventory, lowercaseInventory) {
  if (reference === "") reference = "index.html";
  const candidates = [reference];
  if (reference.endsWith("/")) candidates.push(`${reference}index.html`);
  else if (!path.posix.extname(reference)) {
    candidates.push(`${reference}.html`, `${reference}/index.html`);
  }
  for (const candidate of candidates) {
    if (inventory.has(candidate)) return { found: candidate };
  }
  for (const candidate of candidates) {
    const actual = lowercaseInventory.get(candidate.toLowerCase());
    if (actual) return { caseMismatch: actual };
  }
  return {};
}

function formatError(violations) {
  return new Error(`Rendered asset contract failed:\n${violations.map((item) => `- ${item}`).join("\n")}`);
}

export async function validateRenderedAssets({
  siteDirectory = path.join(repositoryRoot, "_site"),
  siteUrl = defaultSiteUrl,
  allowedExternalPaths = ["/bifrost"],
} = {}) {
  const files = await collectFiles(siteDirectory);
  const inventory = new Set(files);
  const lowercaseInventory = new Map(files.map((file) => [file.toLowerCase(), file]));
  const violations = [];
  const manifests = new Set();
  let references = 0;

  async function validateReferences(sourceFile, extracted) {
    for (const reference of extracted) {
      references += 1;
      if (reference.active && /^http:\/\//i.test(reference.value)) {
        violations.push(`${sourceFile}: insecure active resource: ${reference.value}`);
        continue;
      }
      const local = localReference(reference.value, {
        source: sourceFile,
        siteUrl,
        allowedExternalPaths,
      });
      if (!local) continue;
      if (local.escaped) {
        violations.push(`${sourceFile}: local reference escapes site root: ${reference.value}`);
        continue;
      }
      const result = resolveInventoryPath(local.path, inventory, lowercaseInventory);
      if (result.caseMismatch) {
        violations.push(`${sourceFile}: case mismatch for ${reference.value}; deployed path is /${result.caseMismatch}`);
      } else if (!result.found) {
        violations.push(`${sourceFile}: missing local resource: ${reference.value}`);
      } else if (reference.manifest) {
        manifests.add(result.found);
      }
    }
  }

  for (const file of files) {
    if (!file.endsWith(".html") && !file.endsWith(".css") && !file.endsWith(".xml")) continue;
    const source = await readFile(path.join(siteDirectory, file), "utf8");
    const extracted = file.endsWith(".html")
      ? extractHtmlReferences(source)
      : file.endsWith(".css")
        ? extractCssReferences(source)
        : extractXmlReferences(source);
    await validateReferences(
      file,
      extracted,
    );
  }

  for (const manifest of manifests) {
    let parsed;
    try {
      parsed = JSON.parse(await readFile(path.join(siteDirectory, manifest), "utf8"));
    } catch (error) {
      violations.push(`${manifest}: invalid manifest JSON: ${error.message}`);
      continue;
    }
    const icons = Array.isArray(parsed.icons) ? parsed.icons : [];
    await validateReferences(
      manifest,
      icons.filter((icon) => icon && typeof icon.src === "string").map((icon) => ({
        value: icon.src,
        active: true,
      })),
    );
  }

  if (violations.length > 0) throw formatError(violations);
  return {
    files: files.length,
    htmlFiles: files.filter((file) => file.endsWith(".html")).length,
    references,
  };
}

async function main() {
  const siteDirectory = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(repositoryRoot, "_site");
  const result = await validateRenderedAssets({ siteDirectory });
  console.log(
    `Rendered asset contract passed: ${result.htmlFiles} HTML files, ${result.references} local/resource references.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

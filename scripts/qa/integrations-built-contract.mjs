import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const modulePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(modulePath), "../..");

async function collectHtmlFiles(directory, root = directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectHtmlFiles(entryPath, root)));
    else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push({
        absolutePath: entryPath,
        relativePath: path.relative(root, entryPath).split(path.sep).join("/"),
      });
    }
  }
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function occurrences(source, pattern) {
  return Array.from(source.matchAll(pattern)).length;
}

function validateShareActions(source, relativePath, violations) {
  const actions = [
    "bsky.app/intent/compose",
    "facebook.com/sharer/sharer.php",
    "linkedin.com/sharing/share-offsite",
    "addtoany.com/add_to/mastodon",
    "x.com/intent/post",
  ];
  let previous = -1;

  for (const action of actions) {
    const index = source.indexOf(action);
    if (index <= previous) {
      violations.push(`${relativePath}: missing or out-of-order share action ${action}`);
      return;
    }
    previous = index;
  }

  if (/twitter\.com\/intent|linkedin\.com\/shareArticle/.test(source)) {
    violations.push(`${relativePath}: legacy Twitter or LinkedIn share endpoint remains`);
  }

  const shareStart = source.search(/class=["'][^"']*page__share(?:\s|["'])/);
  const shareEnd = source.indexOf("</section>", shareStart);
  const shareSource = source.slice(shareStart, shareEnd >= 0 ? shareEnd : source.length);
  if (occurrences(shareSource, /https%3A%2F%2F/gi) < actions.length) {
    violations.push(`${relativePath}: share actions must use encoded absolute URLs`);
  }
}

function contractError(violations) {
  return new Error(`Rendered integration contract failed:\n${violations.map((item) => `- ${item}`).join("\n")}`);
}

export async function validateBuiltIntegrations({
  siteDirectory = path.join(repoRoot, "_site"),
  expectedGa4Id = "",
} = {}) {
  const htmlFiles = await collectHtmlFiles(siteDirectory);
  const violations = [];
  let sharedPages = 0;
  let sharePages = 0;
  let ga4Pages = 0;

  for (const file of htmlFiles) {
    const source = await readFile(file.absolutePath, "utf8");
    const isSharedPage = /<script[^>]+type=["']module["'][^>]+main\.min\.js/.test(source);
    const hasShare = /class=["'][^"']*page__share(?:\s|["'])/.test(source);
    const goatLoaders = occurrences(source, /data-goatcounter=/g);
    const ga4Loaders = occurrences(source, /googletagmanager\.com\/gtag\/js\?id=/g);
    const ga4Configs = occurrences(source, /gtag\(['"]config['"]\s*,/g);

    if (isSharedPage) {
      sharedPages += 1;
      if (goatLoaders !== 1) {
        violations.push(`${file.relativePath}: expected exactly one GoatCounter loader, found ${goatLoaders}`);
      }
      if (!/href=["']https:\/\/x\.com\/(?!intent(?:\/|["']))[^"'/?#]+\/?["']/.test(source)) {
        violations.push(`${file.relativePath}: shared footer/profile X link is missing`);
      }
    }

    if (ga4Loaders > 0 || ga4Configs > 0) ga4Pages += 1;
    if (expectedGa4Id) {
      if (isSharedPage && (ga4Loaders !== 1 || ga4Configs !== 1)) {
        violations.push(
          `${file.relativePath}: expected exactly one GA4 loader and configuration, found ${ga4Loaders}/${ga4Configs}`,
        );
      }
      if (isSharedPage && !source.includes(`gtag/js?id=${expectedGa4Id}`)) {
        violations.push(`${file.relativePath}: GA4 loader does not use ${expectedGa4Id}`);
      }
      const escapedId = expectedGa4Id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (isSharedPage && !new RegExp(`gtag\\(['"]config['"]\\s*,\\s*['"]${escapedId}['"]\\)`).test(source)) {
        violations.push(`${file.relativePath}: GA4 configuration does not use ${expectedGa4Id}`);
      }
    } else if (ga4Loaders > 0 || ga4Configs > 0) {
      violations.push(`${file.relativePath}: GA4 output is disabled but a loader or configuration was rendered`);
    }

    if (hasShare) {
      sharePages += 1;
      validateShareActions(source, file.relativePath, violations);
    }
  }

  if (htmlFiles.length === 0) violations.push("site directory contains no HTML files");
  if (sharedPages === 0) violations.push("site directory contains no shared-layout pages");
  if (sharePages === 0) violations.push("site directory contains no social-share pages");

  if (violations.length > 0) throw contractError(violations);
  return { htmlFiles: htmlFiles.length, sharedPages, sharePages, ga4Pages };
}

export async function readConfiguredGa4Id() {
  const config = await readFile(path.join(repoRoot, "_config.yml"), "utf8");
  const match = config.match(/^\s*tracking_id\s*:\s*["']?(G-[A-Z0-9]+)["']?\s*$/m);
  return match?.[1] ?? "";
}

export function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument !== "--site-dir" && argument !== "--ga4-id") {
      throw new Error(`Unknown argument: ${argument}`);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value`);
    index += 1;

    if (argument === "--site-dir") options.siteDirectory = path.resolve(value);
    else {
      if (!/^G-[A-Z0-9]+$/.test(value)) throw new Error("GA4 ID must match G-[A-Z0-9]+");
      options.expectedGa4Id = value;
    }
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (!Object.hasOwn(options, "expectedGa4Id")) options.expectedGa4Id = await readConfiguredGa4Id();
  const result = await validateBuiltIntegrations(options);
  console.log(
    `Rendered integration contract passed: ${result.sharedPages}/${result.htmlFiles} shared pages, `
      + `${result.sharePages} share pages, ${result.ga4Pages} GA4 pages.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

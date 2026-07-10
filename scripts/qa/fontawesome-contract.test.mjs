import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const siteMarkupRoots = [
  "_includes",
  "_layouts",
  "_pages",
  "_publications",
  "_news",
  "_research",
  "_collaborators",
];

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function trackedSiteMarkup(runGit = execFileSync) {
  let trackedFiles;

  try {
    trackedFiles = runGit("git", ["ls-files", "-z", "--", ...siteMarkupRoots], {
      cwd: repoRoot,
      encoding: "utf8",
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    assert.fail(
      `Font Awesome contract requires the git executable and a Git working tree; git ls-files failed: ${detail}`,
    );
  }

  return trackedFiles
    .split("\0")
    .filter(Boolean)
    .filter((file) => /\.(?:html?|liquid|markdown|md)$/i.test(file) || path.extname(file) === "");
}

function classAttributes(source) {
  return Array.from(source.matchAll(/class\s*=\s*(["'])([\s\S]*?)\1/g), (match) => match[2]);
}

function fontAwesomeUtilityClasses() {
  return new Set([
    "fa-2xs", "fa-xs", "fa-sm", "fa-lg", "fa-xl", "fa-2xl",
    "fa-1x", "fa-2x", "fa-3x", "fa-4x", "fa-5x", "fa-6x", "fa-7x", "fa-8x", "fa-9x", "fa-10x",
    "fa-fw", "fa-ul", "fa-li", "fa-border", "fa-pull-left", "fa-pull-right",
    "fa-beat", "fa-bounce", "fa-fade", "fa-beat-fade", "fa-flip", "fa-shake",
    "fa-spin", "fa-pulse", "fa-spin-pulse", "fa-spin-reverse",
    "fa-rotate-90", "fa-rotate-180", "fa-rotate-270", "fa-rotate-by",
    "fa-flip-horizontal", "fa-flip-vertical", "fa-flip-both",
    "fa-stack", "fa-stack-1x", "fa-stack-2x", "fa-inverse",
    "fa-classic", "fa-solid", "fa-brands", "fa-sr-only", "fa-sr-only-focusable",
  ]);
}

test("site markup discovery explains its Git working-tree requirement", () => {
  assert.throws(
    () => trackedSiteMarkup(() => {
      const error = new Error("spawn git ENOENT");
      error.code = "ENOENT";
      throw error;
    }),
    /Font Awesome contract requires the git executable and a Git working tree/,
  );
});

test("site markup discovery includes extensionless Jekyll templates", () => {
  assert.ok(trackedSiteMarkup().includes("_includes/toc"));
});

test("utility allowlist covers static classes from compiled Font Awesome layers", () => {
  const utilityClasses = fontAwesomeUtilityClasses();
  const intentionallyUnsupported = new Set(["fa-regular"]);
  const missing = [];

  for (const file of [
    "_sass/vendor/font-awesome/_core.scss",
    "_sass/vendor/font-awesome/_animated.scss",
    "_sass/vendor/font-awesome/_rotated-flipped.scss",
    "_sass/vendor/font-awesome/_screen-reader.scss",
  ]) {
    for (const match of read(file).matchAll(/\.#\{\$fa-css-prefix\}-([a-z0-9-]+)/g)) {
      const utilityClass = `fa-${match[1]}`;
      if (!utilityClasses.has(utilityClass) && !intentionallyUnsupported.has(utilityClass)) {
        missing.push(`${file}: ${utilityClass}`);
      }
    }
  }

  assert.deepEqual(missing, [], `Font Awesome utility classes are missing from the allowlist:\n${missing.join("\n")}`);
});

test("Font Awesome 6 is compiled as a standalone solid-and-brands stylesheet", () => {
  const entryPath = "assets/css/fontawesome.scss";
  assert.equal(existsSync(path.join(repoRoot, entryPath)), true, `${entryPath} must exist`);

  const entry = read(entryPath);
  const main = read("assets/css/main.scss");
  const vendor = read("_sass/vendor/font-awesome/fontawesome.scss");

  assert.match(vendor, /Font Awesome Free 6\.7\.2/);
  assert.doesNotMatch(vendor, /Font Awesome Free 5\.5\.0/);
  assert.match(entry, /vendor\/font-awesome\/fontawesome/);
  assert.match(entry, /vendor\/font-awesome\/solid/);
  assert.match(entry, /vendor\/font-awesome\/brands/);
  assert.doesNotMatch(entry, /vendor\/font-awesome\/(?:regular|v4-shims)/);
  assert.doesNotMatch(main, /vendor\/font-awesome/);
});

test("the head loads local icon assets in stable render order", () => {
  const head = read("_includes/head/custom.html");
  const academicons = head.indexOf("/assets/css/academicons.css");
  const solidPreload = head.indexOf("/assets/webfonts/fa-solid-900.woff2");
  const brandsPreload = head.indexOf("/assets/webfonts/fa-brands-400.woff2");
  const fontawesome = head.indexOf("/assets/css/fontawesome.css");

  assert.ok(academicons >= 0, "the local Academicons stylesheet must remain");
  assert.ok(solidPreload > academicons, "the solid font preload must follow Academicons");
  assert.ok(brandsPreload > solidPreload, "the brands font preload must follow the solid preload");
  assert.ok(fontawesome > brandsPreload, "Font Awesome CSS must load after both font preloads");
  assert.match(head, /fa-solid-900\.woff2[^>]+as="font"[^>]+type="font\/woff2"[^>]+crossorigin/);
  assert.match(head, /fa-brands-400\.woff2[^>]+as="font"[^>]+type="font\/woff2"[^>]+crossorigin/);
  assert.match(head, /<link rel="stylesheet" href="\{\{ base_path \}\}\/assets\/css\/fontawesome\.css"\s*\/?>/);
  assert.doesNotMatch(head, /fontawesome\.css[^>]+onload=/);
});

test("only the deployed solid and brands font families are present", () => {
  const expected = [
    "assets/webfonts/fa-brands-400.ttf",
    "assets/webfonts/fa-brands-400.woff2",
    "assets/webfonts/fa-solid-900.ttf",
    "assets/webfonts/fa-solid-900.woff2",
  ];

  for (const file of expected) {
    assert.equal(existsSync(path.join(repoRoot, file)), true, `${file} must exist`);
  }

  const legacyFonts = readdirSync(path.join(repoRoot, "assets/fonts"))
    .filter((file) => file.startsWith("fa-"));
  assert.deepEqual(legacyFonts, []);

  for (const unsupported of [
    "assets/webfonts/fa-regular-400.ttf",
    "assets/webfonts/fa-regular-400.woff2",
    "assets/webfonts/fa-v4compatibility.ttf",
    "assets/webfonts/fa-v4compatibility.woff2",
  ]) {
    assert.equal(existsSync(path.join(repoRoot, unsupported)), false, `${unsupported} must not ship`);
  }
});

test("site markup uses FA6 prefixes and every referenced icon exists", () => {
  const variableSource = read("_sass/vendor/font-awesome/_variables.scss");
  const availableIcons = new Set(
    Array.from(variableSource.matchAll(/^\s*"([a-z0-9-]+)":\s*\$fa-var-/gm), (match) => match[1]),
  );
  const utilityClasses = fontAwesomeUtilityClasses();
  const legacyPrefixes = new Set(["fa", "fas", "fab", "far", "fal"]);
  const missing = [];
  const legacy = [];

  for (const file of trackedSiteMarkup()) {
    const source = read(file);
    for (const attribute of classAttributes(source)) {
      for (const token of attribute.split(/\s+/)) {
        if (legacyPrefixes.has(token)) legacy.push(`${file}: ${token}`);
        if (/^fa-[a-z0-9-]+$/.test(token) && !utilityClasses.has(token) && !availableIcons.has(token.slice(3))) {
          missing.push(`${file}: ${token}`);
        }
      }
    }
    for (const match of source.matchAll(/fa-\{\{[^}]*default:\s*["']([^"']+)["']/g)) {
      if (!availableIcons.has(match[1])) missing.push(`${file}: fa-${match[1]}`);
    }
    for (const match of source.matchAll(/^toc_icon:\s*["']?([a-z0-9-]+)/gm)) {
      if (!availableIcons.has(match[1])) missing.push(`${file}: fa-${match[1]}`);
    }
  }

  assert.deepEqual(legacy, [], `legacy Font Awesome prefixes remain:\n${legacy.join("\n")}`);
  assert.deepEqual(missing, [], `unknown Font Awesome icons found:\n${missing.join("\n")}`);
});

test("local Sass selectors target the canonical FA6 prefix contract", () => {
  const files = ["_sass/include/_utilities.scss", "_sass/layout/_footer.scss", "_sass/_custom.scss"];
  const legacySelector = /\.(?:fa|fas|fab|far|fal)(?=\s*[,\{])/;

  for (const file of files) {
    assert.doesNotMatch(read(file), legacySelector, `${file} still targets a legacy style prefix`);
  }

  const syntax = read("_sass/_syntax.scss");
  assert.doesNotMatch(syntax, /Font Awesome 5/);
  assert.match(syntax, /font-family:\s*var\(--fa-style-family-classic\)/);
  assert.match(syntax, /font-weight:\s*900/);
});

test("npm exposes and runs the icon contract", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(packageJson.scripts["check:icons"], "node --test scripts/qa/fontawesome-contract.test.mjs");
  assert.match(packageJson.scripts.test, /fontawesome-contract\.test\.mjs/);
});

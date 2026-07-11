import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("Academicons 1.9.4 is the only vendored academic icon release", () => {
  const css = read("assets/css/academicons.css");

  assert.match(css, /Academicons 1\.9\.4/);
  assert.doesNotMatch(css, /Academicons 1\.8\.0|\?v=1\.8\.0/);
  assert.equal(existsSync(path.join(repoRoot, "assets/css/academicons.min.css")), false);
});

test("Academicons ships only WOFF and TTF font fallbacks", () => {
  const fonts = readdirSync(path.join(repoRoot, "assets/fonts"))
    .filter((file) => file.startsWith("academicons."))
    .sort();

  assert.deepEqual(fonts, ["academicons.ttf", "academicons.woff"]);

  const css = read("assets/css/academicons.css");
  assert.match(css, /academicons\.woff[^\n]+format\(['"]woff['"]\)/);
  assert.match(css, /academicons\.ttf[^\n]+format\(['"]truetype['"]\)/);
  assert.doesNotMatch(css, /academicons\.(?:eot|svg)/);
});

test("the head preloads Academicons before its blocking stylesheet", () => {
  const head = read("_includes/head/custom.html");
  const preload = head.indexOf("/assets/fonts/academicons.woff");
  const stylesheet = head.indexOf("/assets/css/academicons.css");

  assert.ok(preload >= 0, "Academicons WOFF preload must exist");
  assert.ok(stylesheet > preload, "Academicons CSS must follow its font preload");
  assert.match(
    head,
    /academicons\.woff[^>]+as="font"[^>]+type="font\/woff"[^>]+crossorigin/,
  );
});

test("the v0.9 academic-profile glyph contract is complete", () => {
  const css = read("assets/css/academicons.css");
  const expected = [
    "academia",
    "arxiv",
    "google-scholar",
    "impactstory",
    "inspire",
    "orcid",
    "pubmed",
    "scopus",
    "semantic-scholar",
    "ssrn",
    "zotero",
  ];

  for (const icon of expected) {
    assert.match(css, new RegExp(`\\.ai-${icon}:before\\s*\\{`), `missing ai-${icon}`);
  }
});

test("right-pulled Academicons separate from preceding content", () => {
  const css = read("assets/css/academicons.css");
  const rule = css.match(/\.ai\.ai-pull-right\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(rule, /margin-left:\s*\.3em/);
  assert.doesNotMatch(rule, /margin-right/);
});

test("npm exposes and runs the Academicons contract", () => {
  const packageJson = JSON.parse(read("package.json"));

  assert.equal(
    packageJson.scripts["check:academicons"],
    "node --test scripts/qa/academicons-contract.test.mjs",
  );
  assert.match(packageJson.scripts.test, /academicons-contract\.test\.mjs/);
});

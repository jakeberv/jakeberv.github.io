import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const palettes = ["default", "air", "sunrise", "mint", "dirt", "contrast"];

async function source(filePath) {
  return readFile(path.join(repositoryRoot, filePath), "utf8");
}

test("all supported palettes provide isolated light and dark partials", async () => {
  for (const palette of palettes) {
    const lightPath = `_sass/theme/_${palette}_light.scss`;
    const darkPath = `_sass/theme/_${palette}_dark.scss`;
    await Promise.all([
      access(path.join(repositoryRoot, lightPath)),
      access(path.join(repositoryRoot, darkPath)),
    ]);

    const [light, dark] = await Promise.all([source(lightPath), source(darkPath)]);
    assert.match(light, /\$active-light-theme:/);
    assert.match(light, /@include emit-theme-properties\(\$active-light-theme\)/);
    assert.match(dark, /html\[data-theme="dark"\]/);
    assert.match(dark, /@include emit-theme-properties\([^,]+, dark\)/);
    assert.doesNotMatch(dark, /^\$(?:primary|gray|light-gray|info|warning|success|danger)-?color\s*:/m);
  }
});

test("the stylesheet selects both modes and preserves compile-time aliases", async () => {
  const entrypoint = await source("assets/css/main.scss");
  assert.match(entrypoint, /append: '_light'/);
  assert.match(entrypoint, /theme\/compile_aliases/);
  assert.match(entrypoint, /append: '_dark'/);
  assert.ok(entrypoint.indexOf("theme/compile_aliases") < entrypoint.indexOf("append: '_dark'"));
});

test("the shared theme emitter exposes core, site, visualization, and syntax roles", async () => {
  const themes = await source("_sass/_themes.scss");
  const required = [
    "--global-base-color",
    "--global-bg-color",
    "--global-footer-bg-color",
    "--global-border-color",
    "--global-dark-border-color",
    "--global-code-background-color",
    "--global-code-text-color",
    "--global-fig-caption-color",
    "--global-link-color",
    "--global-link-color-hover",
    "--global-link-color-visited",
    "--global-masthead-link-color",
    "--global-masthead-link-color-hover",
    "--global-text-color",
    "--global-text-color-light",
    "--global-thead-color",
    "--global-toc-bg-color",
    "--global-selection-bg-color",
    "--global-selection-text-color",
    "--site-surface-raised",
    "--site-surface-muted",
    "--site-surface-accent",
    "--site-surface-overlay",
    "--site-text-strong",
    "--site-text-muted",
    "--site-text-subtle",
    "--site-border-subtle",
    "--site-border-strong",
    "--site-control-bg",
    "--site-control-bg-hover",
    "--site-control-bg-active",
    "--site-control-text",
    "--site-control-border",
    "--site-focus-ring",
    "--site-link-contrast",
    "--site-shadow-color",
    "--site-danger-color",
    "--site-danger-contrast",
    "--site-warning-color",
    "--site-warning-contrast",
    "--site-success-color",
    "--site-success-contrast",
    "--site-info-color",
    "--site-info-contrast",
    "--viz-surface",
    "--viz-text",
    "--viz-text-muted",
    "--viz-grid",
    "--viz-outline",
    "--viz-tooltip-bg",
    "--viz-tooltip-text",
    "--viz-selection-stroke",
    "--syntax-comment",
    "--syntax-error",
    "--syntax-keyword",
    "--syntax-literal",
    "--syntax-operator",
    "--syntax-number",
    "--syntax-string",
    "--syntax-attribute",
    "--syntax-decorator",
  ];
  for (const property of required) assert.match(themes, new RegExp(property));
});

test("the light-first runtime does not consult system color preference", async () => {
  const [head, main, masthead] = await Promise.all([
    source("_includes/head.html"),
    source("assets/js/_main.js"),
    source("_includes/masthead.html"),
  ]);
  assert.doesNotMatch(head + main, /prefers-color-scheme|matchMedia/);
  assert.match(head, /localStorage\.getItem\("theme"\)/);
  assert.match(masthead, /id="theme-toggle"[^>]+aria-pressed="false"/);
  assert.match(masthead, /greedy-nav__toggle/);
  assert.match(masthead, /aria-label="Show more navigation links"/);
  assert.match(masthead, /class="greedy-nav__icon fa-solid fa-ellipsis"/);
  assert.match(main, /new CustomEvent\("site:themechange"/);
});

test("the reusable artifact validator tolerates CRLF route manifests", async () => {
  const artifactContract = await source("scripts/qa/site-artifact-contract.mjs");

  assert.match(artifactContract, /\.split\(\/\\r\?\\n\/\)/);
});

test("the route contract contains only the 221 intended public HTML routes", async () => {
  const [themeMatrix, manifestSource] = await Promise.all([
    source("scripts/qa/theme-build-matrix.mjs"),
    source("scripts/qa/expected-html-routes.txt"),
  ]);
  const routes = manifestSource.trim().split(/\r?\n/);

  assert.equal(routes.length, 221);
  assert.equal(routes.some((route) => /^(?:AGENTS|agents|docs\/superpowers)\//.test(route)), false);
  assert.doesNotMatch(themeMatrix, /canonicalizeRoute/);
  assert.match(themeMatrix, /validateSiteArtifact/);
});

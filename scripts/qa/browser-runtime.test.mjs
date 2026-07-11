import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

async function source(filePath) {
  return readFile(path.join(repositoryRoot, filePath), "utf8");
}

test("the shared bundle is delivered as a module and the logo stays visible", async () => {
  const [scriptsInclude, masthead] = await Promise.all([
    source("_includes/scripts.html"),
    source("_includes/masthead.html"),
  ]);

  assert.match(
    scriptsInclude,
    /<script type="module" src="{{ base_path }}\/assets\/js\/main\.min\.js"><\/script>/,
  );
  assert.match(
    masthead,
    /masthead__menu-item masthead__menu-item--lg persist/,
  );
});

test("legacy plugin sources and Sass integration are removed", async () => {
  const removedPaths = [
    "assets/js/vendor/jquery/jquery-1.12.4.min.js",
    "assets/js/plugins/jquery.fitvids.js",
    "assets/js/plugins/jquery.magnific-popup.js",
    "assets/js/plugins/jquery.smooth-scroll.min.js",
    "assets/js/plugins/stickyfill.min.js",
    "_sass/vendor/magnific-popup/_magnific-popup.scss",
    "_sass/vendor/magnific-popup/_settings.scss",
  ];

  for (const removedPath of removedPaths) {
    await assert.rejects(access(path.join(repositoryRoot, removedPath)));
  }

  assert.doesNotMatch(
    await source("assets/css/main.scss"),
    /magnific-popup/,
  );
});

test("native CSS preserves scrolling and responsive video behavior", async () => {
  const [baseStyles, customStyles] = await Promise.all([
    source("_sass/layout/_base.scss"),
    source("_sass/_custom.scss"),
  ]);

  assert.match(baseStyles, /scroll-behavior:\s*smooth/);
  assert.match(baseStyles, /prefers-reduced-motion:\s*reduce/);
  assert.match(baseStyles, /scroll-behavior:\s*auto/);
  assert.doesNotMatch(baseStyles, /fluid-width-video-wrapper/);
  assert.match(
    customStyles,
    /\.phylo-history-embed[^{]*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/s,
  );
});

test("dynamic footer spacing replaces the static Sass fallback", async () => {
  const mainScript = await source("assets/js/_main.js");

  assert.match(
    mainScript,
    /updateFooterSpacing[\s\S]*css\("padding-bottom",\s*"0"\)[\s\S]*css\("margin-bottom"/,
  );
});

test("the author menu defers breakpoint state to CSS", async () => {
  const mainScript = await source("assets/js/_main.js");

  assert.doesNotMatch(mainScript, /\bscssLarge\b|\b925\b|\$\(window\)\.width\(\)/);
  assert.match(
    mainScript,
    /const authorMenuButton = \$\("\.author__urls-wrapper button"\)/,
  );
  assert.match(mainScript, /authorLinks\.stop\(true, true\)\.removeAttr\("style"\)/);
});

test("the npm test command does not depend on shell glob expansion", async () => {
  const packageDefinition = JSON.parse(await source("package.json"));

  assert.equal(
    packageDefinition.scripts.test,
    "node --test scripts/qa/academicons-contract.test.mjs scripts/qa/browser-behavior.test.mjs scripts/qa/browser-runtime.test.mjs scripts/qa/build-js.test.mjs scripts/qa/comments-contract.test.mjs scripts/qa/content-generators.test.mjs scripts/qa/fontawesome-contract.test.mjs scripts/qa/integrations-built-contract.test.mjs scripts/qa/integrations-contract.test.mjs scripts/qa/rendered-asset-contract.test.mjs scripts/qa/scientific-content.test.mjs scripts/qa/site-artifact-contract.test.mjs scripts/qa/talkmap-contract.test.mjs scripts/qa/theme-contract.test.mjs && npm run check:js && npm run check:container",
  );
});

test("the JavaScript toolchain is pinned to Node 24 and npm 11", async () => {
  const [nodeVersion, packageDefinition] = await Promise.all([
    source(".node-version"),
    source("package.json").then(JSON.parse),
  ]);

  assert.equal(nodeVersion.trim(), "24");
  assert.equal(packageDefinition.engines.node, "24.x");
  assert.equal(packageDefinition.engines.npm, ">=11 <12");
  assert.equal(packageDefinition.scripts["check:site-artifact"], "node scripts/qa/site-artifact-contract.mjs");
});

test("the Pages artifact excludes build-only infrastructure", async () => {
  const config = await source("_config.yml");
  const exclusionBlock = config.match(/^exclude:\n([\s\S]*?)^keep_files:/m)?.[1];
  assert.ok(exclusionBlock, "_config.yml must define an exclude block");
  const exclusions = new Set(
    exclusionBlock
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/^-\s*/, "").replace(/^"|"$/g, ""))
      .filter(Boolean),
  );

  for (const protectedPath of [
    "*_artifacts",
    "package-lock.json",
    "scripts",
    "markdown_generator",
    "AGENTS.md",
    "agents",
    "docs/superpowers",
    "CONTRIBUTING.md",
    "todo",
    "fetch_scholar_metrics.py",
  ]) {
    assert.ok(exclusions.has(protectedPath), `_config.yml must exclude ${protectedPath}`);
  }
  for (const extension of [
    "*.R",
    "*.RDS",
    "*.Rproj",
    "*.command",
    "*.ipynb",
    "*.lock",
    "*.mjs",
    "*.py",
  ]) {
    assert.ok(exclusions.has(extension), `_config.yml must exclude ${extension}`);
  }
});

test("the Pages workflow validates pull requests and deploys only trusted events", async () => {
  const workflow = await source(".github/workflows/deploy_site.yml");

  assert.match(workflow, /^\s+pull_request:\s*$/m);
  assert.match(workflow, /actions\/checkout@v7/);
  assert.match(workflow, /actions\/setup-node@v6/);
  assert.match(workflow, /node-version:\s*"24"/);
  assert.match(workflow, /cache:\s*"npm"/);
  assert.match(workflow, /run:\s*npm ci/);
  assert.match(workflow, /run:\s*npm test/);
  assert.match(workflow, /run:\s*npm run test:themes/);
  assert.match(workflow, /run:\s*npm run check:site-artifact/);
  assert.match(workflow, /actions\/upload-pages-artifact@v5/);
  assert.match(workflow, /actions\/deploy-pages@v5/);
  assert.doesNotMatch(workflow, /^\s+ref:\s*master\s*$/m);
  assert.match(workflow, /github\.event_name != 'pull_request'/);
});

test("scheduled data workflows modernize actions without changing their jobs", async () => {
  const [scholarWorkflow, impactWorkflow] = await Promise.all([
    source(".github/workflows/fetch_scholar_data.yml"),
    source(".github/workflows/refresh_impact_reach_data.yml"),
  ]);

  for (const workflow of [scholarWorkflow, impactWorkflow]) {
    assert.match(workflow, /actions\/checkout@v7/);
    assert.match(workflow, /actions\/setup-python@v6/);
    assert.match(workflow, /python-version:\s*["']3\.12["']/);
    assert.match(workflow, /git push origin master/);
  }

  assert.match(scholarWorkflow, /cron:\s*['"]0 0 \* \* 0['"]/);
  assert.match(scholarWorkflow, /python fetch_scholar_metrics\.py/);
  assert.match(scholarWorkflow, /git add _data\/scholar_metrics\.json/);
  assert.match(impactWorkflow, /cron:\s*['"]17 6 \* \* 1['"]/);
  assert.match(impactWorkflow, /python3 scripts\/build-impact-reach-data\.py/);
  assert.match(impactWorkflow, /git add[\s\S]*data\/impact\/reach\/outlet_reach\.json/);
});

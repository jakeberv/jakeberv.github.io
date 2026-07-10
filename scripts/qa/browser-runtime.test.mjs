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

test("Staticman waits for the module bundle before using jQuery", async () => {
  const staticman = await source("_includes/comments-providers/staticman.html");

  assert.match(
    staticman,
    /document\.addEventListener\("DOMContentLoaded", function \(\) \{/,
  );
  assert.match(staticman, /\}\)\(window\.jQuery\);/);
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
    "node --test scripts/qa/browser-behavior.test.mjs scripts/qa/browser-runtime.test.mjs scripts/qa/build-js.test.mjs scripts/qa/theme-contract.test.mjs && npm run check:js",
  );
});

test("the Pages artifact excludes build-only infrastructure", async () => {
  const config = await source("_config.yml");

  assert.match(config, /^\s+- "\*_artifacts"$/m);
  assert.match(config, /^\s+- package-lock\.json$/m);
  assert.match(config, /^\s+- scripts$/m);
});

test("the Pages workflow installs and verifies browser and theme contracts", async () => {
  const workflow = await source(".github/workflows/deploy_site.yml");

  assert.match(workflow, /node-version:\s*"20"/);
  assert.match(workflow, /cache:\s*"npm"/);
  assert.match(workflow, /run:\s*npm ci/);
  assert.match(workflow, /run:\s*npm test/);
  assert.match(workflow, /run:\s*npm run test:themes/);
});

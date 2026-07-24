import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const allowedTypes = new Set([
  "News",
  "Publications",
  "Research",
  "Software",
  "Talks",
  "Teaching",
  "Pages",
]);
const excludedRoutes = new Set([
  "404.html",
  "about.html",
  "about/index.html",
  "code/index.html",
  "collaborators/index.html",
  "posts/index.html",
  "resume.html",
  "tags/index.html",
  "talkmap/map.html",
  "talks-archive/index.html",
  "terms/index.html",
]);

async function source(relativePath) {
  return readFile(path.join(repositoryRoot, relativePath), "utf8");
}

function routes(sourceText) {
  return sourceText.trim().split(/\r?\n/).filter(Boolean);
}

test("the search manifest contains the intended 210-document subset", async () => {
  const [siteManifestSource, searchManifestSource] = await Promise.all([
    source("scripts/qa/expected-html-routes.txt"),
    source("scripts/qa/expected-search-routes.txt"),
  ]);
  const siteRoutes = routes(siteManifestSource);
  const searchRoutes = routes(searchManifestSource);

  assert.equal(siteRoutes.length, 221);
  assert.equal(searchRoutes.length, 210);
  assert.equal(new Set(searchRoutes).size, 210, "search routes must be unique");
  assert.deepEqual(
    siteRoutes.filter((route) => !searchRoutes.includes(route)),
    [...excludedRoutes],
  );
});

test("Pagefind is exactly pinned and npm exposes every search contract", async () => {
  const packageDefinition = JSON.parse(await source("package.json"));
  const lockfile = JSON.parse(await source("package-lock.json"));

  assert.equal(packageDefinition.devDependencies.pagefind, "1.5.2");
  assert.equal(lockfile.packages["node_modules/pagefind"].version, "1.5.2");
  assert.equal(packageDefinition.scripts["build:search"], "node scripts/build-search.mjs");
  assert.equal(
    packageDefinition.scripts["check:search"],
    "node --test scripts/qa/search-contract.test.mjs",
  );
  assert.equal(
    packageDefinition.scripts["check:search:built"],
    "node scripts/qa/search-built-contract.mjs",
  );
  assert.match(packageDefinition.scripts.test, /search-contract\.test\.mjs/);
});

test("production builds the index while the visitor UI remains dormant", async () => {
  const [production, development] = await Promise.all([
    source("_config.yml"),
    source("_config.dev.yml"),
  ]);

  assert.match(
    production,
    /^search:\s*\n\s+index_enabled\s*:\s*true\s*\n\s+ui_enabled\s*:\s*false\s*$/m,
  );
  assert.match(
    development,
    /^search:\s*\n\s+index_enabled\s*:\s*false\s*\n\s+ui_enabled\s*:\s*false\s*$/m,
  );
  assert.match(production, /type: publications[\s\S]+search_type:\s*Publications/);
  assert.match(production, /type: research[\s\S]+search_type:\s*Research/);
  assert.match(production, /type: talks[\s\S]+search_type:\s*Talks/);
  assert.match(production, /type: news[\s\S]+search_type:\s*News/);
});

test("search metadata and indexed-body markers are layout-scoped", async () => {
  const [defaultLayout, metadata, archive, about, news, single, portfolio, splash, talk] =
    await Promise.all([
      source("_layouts/default.html"),
      source("_includes/search-metadata.html"),
      source("_layouts/archive.html"),
      source("_layouts/about.html"),
      source("_layouts/news.html"),
      source("_layouts/single.html"),
      source("_layouts/single-portfolio.html"),
      source("_layouts/splash.html"),
      source("_layouts/talk.html"),
    ]);

  assert.match(defaultLayout, /include search-metadata\.html/);
  assert.match(metadata, /page\.search != false/);
  assert.match(metadata, /page\.search_title/);
  assert.match(metadata, /page\.search_description/);
  assert.match(metadata, /page\.search_type/);
  assert.match(metadata, /data-pagefind-meta="title\[content\]"/);
  assert.match(metadata, /data-pagefind-filter="type\[content\]"/);
  assert.match(metadata, /data-pagefind-meta="type\[content\]"/);
  assert.match(metadata, /data-pagefind-meta="date\[content\]"/);

  for (const [name, layout] of Object.entries({ archive, about, news, single, portfolio, splash, talk })) {
    assert.match(layout, /page\.search != false/, `${name} must honor search: false`);
    assert.match(layout, /data-pagefind-body/, `${name} must mark only its meaningful content`);
  }
  assert.doesNotMatch(defaultLayout, /data-pagefind-body/);
});

test("aggregate pages have stable types, opt-outs, and duplicate-list ignores", async () => {
  const files = {
    homepage: await source("_pages/about.md"),
    publications: await source("_pages/publications.md"),
    research: await source("_pages/research.md"),
    software: await source("_pages/software.md"),
    talks: await source("_pages/talks.md"),
    talkmap: await source("_pages/talkmap.html"),
    teaching: await source("_pages/teaching.md"),
    news: await source("_pages/news.md"),
    background: await source("_pages/background.md"),
    cv: await source("_pages/cv.md"),
    impact: await source("_pages/impact.md"),
  };
  const expectedTypes = {
    homepage: "Pages",
    publications: "Publications",
    research: "Research",
    software: "Software",
    talks: "Talks",
    talkmap: "Talks",
    teaching: "Teaching",
    news: "News",
    background: "Pages",
    cv: "Pages",
    impact: "Pages",
  };

  for (const [name, expectedType] of Object.entries(expectedTypes)) {
    assert.ok(allowedTypes.has(expectedType));
    assert.match(files[name], new RegExp(`^search_type:\\s*${expectedType}\\s*$`, "m"), `${name} type`);
  }
  for (const relativePath of [
    "_pages/404.md",
    "_pages/code.md",
    "_pages/collaborators.md",
    "_pages/posts.html",
    "_pages/tag-archive.html",
    "_pages/talks.html",
    "_pages/terms.md",
  ]) {
    assert.match(await source(relativePath), /^search:\s*false\s*$/m, `${relativePath} must opt out`);
  }

  assert.match(files.homepage, /data-pagefind-ignore[\s\S]+Pinned News[\s\S]+Recent News/);
  assert.match(files.publications, /data-pagefind-ignore[\s\S]+pub-year/);
  assert.match(files.research, /class="research-grid" data-pagefind-ignore/);
  assert.match(files.news, /data-pagefind-ignore[\s\S]+news-filters/);
  assert.match(
    files.news,
    /<p class="visually-hidden">\{\{ page\.search_description \}\}<\/p>[\s\S]+data-pagefind-ignore/,
  );
});

test("the masthead composes the accessible Pagefind modal before the theme toggle", async () => {
  const [head, masthead, styles, entrypoint] = await Promise.all([
    source("_includes/head.html"),
    source("_includes/masthead.html"),
    source("_sass/layout/_search.scss"),
    source("assets/css/main.scss"),
  ]);

  const pagefindCss = head.indexOf("pagefind-component-ui.css");
  const mainCss = head.indexOf("assets/css/main.css");
  assert.ok(pagefindCss >= 0 && pagefindCss < mainCss, "Pagefind CSS must load before main.css");
  assert.match(head, /site\.search\.ui_enabled/);
  assert.doesNotMatch(head, /site\.search\.enabled/);
  assert.match(head, /pagefind-component-ui\.js/);
  assert.match(head, /type="module"/);

  const searchTrigger = masthead.indexOf("<pagefind-modal-trigger");
  const themeToggle = masthead.indexOf('id="theme-toggle"');
  assert.ok(searchTrigger >= 0 && searchTrigger < themeToggle);
  assert.match(masthead, /site\.search\.ui_enabled/);
  assert.doesNotMatch(masthead, /site\.search\.enabled/);
  assert.match(masthead, /pagefind-modal-trigger[^>]+compact[^>]+hide-shortcut[^>]+shortcut="mod\+k"/);
  assert.match(masthead, /placeholder="Search site"/);
  assert.match(masthead, /<pagefind-filter-dropdown[^>]+filter="type"[^>]+single-select/);
  assert.match(masthead, /<pagefind-results[^>]+max-sub-results="2"/);
  assert.match(masthead, /type="text\/pagefind-template"/);
  assert.match(
    masthead,
    /<li class="pf-result site-search-result">\s*<div class="pf-result-card">\s*<div class="pf-result-content">/,
    "custom results must retain Pagefind's positioned card wrapper for reliable click targets",
  );
  assert.match(masthead, /meta\.type/);
  assert.match(masthead, /meta\.date/);
  assert.match(masthead, /{{\+ excerpt \+}}/);

  assert.match(styles, /--pf-/);
  assert.match(styles, /--site-/);
  assert.match(styles, /--global-/);
  assert.match(entrypoint, /layout\/search/);
});

test("local search is explicit and deployment builds it in production order", async () => {
  const [preview, workflow] = await Promise.all([
    source("scripts/local_preview.command"),
    source(".github/workflows/deploy_site.yml"),
  ]);

  assert.match(preview, /--with-search/);
  assert.match(preview, /search:\\n  index_enabled: true\\n  ui_enabled: true/);
  assert.match(preview, /npm ci/);
  assert.match(preview, /npm run build:search/);
  assert.match(
    preview,
    /if \[\[ "\$WITH_SEARCH" -eq 0 \]\]; then\s+rm -rf "\$ROOT_DIR\/_site\/pagefind"\s+fi/,
  );
  assert.doesNotMatch(preview, /^\s*npm\s+(?:install|ci)\b/m);

  const jekyllBuild = workflow.indexOf("bundle exec jekyll build --safe --config _config.yml");
  const searchBuild = workflow.indexOf("npm run build:search");
  const searchCheck = workflow.indexOf("npm run check:search:built");
  const assets = workflow.indexOf("npm run check:assets");
  const artifact = workflow.indexOf("npm run check:site-artifact");
  assert.ok(searchBuild > jekyllBuild, "search must build after Jekyll");
  assert.ok(searchCheck > searchBuild, "built search must be checked after generation");
  assert.ok(assets > searchCheck, "rendered assets must follow the search check");
  assert.ok(artifact > searchCheck, "artifact validation must follow the search check");
});

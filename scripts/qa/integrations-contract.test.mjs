import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("analytics configuration prefers an ordered provider list with inactive GA4", () => {
  const config = read("_config.yml");
  const analyticsStart = config.indexOf("analytics:\n");
  const analyticsEnd = config.indexOf("\n\n# Site Author", analyticsStart);
  const analyticsBlock = config.slice(analyticsStart, analyticsEnd);
  const providers = Array.from(analyticsBlock.matchAll(/^\s{4}-\s+([^\s#]+)/gm), (match) => match[1]);

  assert.match(config, /analytics:\s*\n\s+providers:\s*\n\s+- goatcounter\s*\n\s+- google-analytics-4/);
  assert.deepEqual(providers, ["goatcounter", "google-analytics-4"]);
  assert.match(config, /google:\s*\n\s+tracking_id\s*:\s*(?:#.*)?\n/);
  assert.match(config, /goatcounter:\s*\n\s+code\s*:\s*jakeberv/);
});

test("analytics dispatch preserves compatibility and guards GA4 output", () => {
  const dispatcher = read("_includes/analytics.html");
  const ga4Path = "_includes/analytics-providers/google-analytics-4.html";

  assert.equal(existsSync(path.join(repoRoot, ga4Path)), true, `${ga4Path} must exist`);
  assert.match(dispatcher, /site\.analytics\.providers/);
  assert.match(dispatcher, /site\.analytics\.provider/);
  assert.match(dispatcher, /site\.analytics\.provider != false/);
  assert.match(dispatcher, /uniq/);
  assert.match(dispatcher, /google-analytics-4/);
  assert.match(dispatcher, /goatcounter/);
  assert.match(dispatcher, /page\.analytics != false/);

  const ga4 = read(ga4Path);
  assert.match(ga4, /site\.analytics\.google\.tracking_id/);
  assert.match(ga4, /contains ['"]G-['"]/);
  assert.match(ga4, /https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=/);
  assert.match(ga4, /gtag\(['"]config['"]/);
});

test("author profiles expose the v0.9 identity hooks without activating accounts", () => {
  const profile = read("_includes/author-profile.html");
  const config = read("_config.yml");
  const hooks = [
    "academia", "arxiv", "inspire-hep", "mastodon", "medium", "scopus",
    "semantic", "ssrn", "telegram", "zotero", "artstation", "bluesky",
    "goodreads", "kaggle", "zhihu",
  ];
  const activeHooks = new Set(["bluesky"]);

  for (const hook of hooks) {
    assert.match(profile, new RegExp(`author\\.${hook.replace("-", "\\-")}`), `missing author.${hook}`);
    if (!activeHooks.has(hook)) {
      assert.match(config, new RegExp(`^  ${hook.replace("-", "\\-")}\\s*:\\s*$`, "m"), `${hook} must be dormant`);
    }
  }

  assert.match(config, /^  bluesky\s*:\s*"jakeberv\.bsky\.social"\s*$/m);
  assert.match(config, /^\s+- https:\/\/bsky\.app\/profile\/jakeberv\.bsky\.social\s*$/m);
  assert.match(config, /^  linkedin\s*:\s*"jakeberv"\s*$/m);
  assert.match(config, /^\s+- https:\/\/www\.linkedin\.com\/in\/jakeberv\/?\s*$/m);
  assert.doesNotMatch(config, /linkedin\.com\/in\/jake-berv/);
  assert.match(profile, /author\.pronouns/);
  assert.match(profile, /fetchpriority="high"/);
  assert.match(profile, /fa-building-columns/);
  assert.match(profile, /gitlab\.com\/\{\{ author\.gitlab \}\}/);
  assert.match(profile, /https:\/\/x\.com\/\{\{ author\.twitter \}\}/);
  assert.match(profile, /fa-x-twitter/);
  assert.match(profile, />X<\/a>/);
});

test("active social presentation uses X while preserving Twitter Card metadata", () => {
  const footer = read("_includes/footer.html");
  const seo = read("_includes/seo.html");
  const config = read("_config.yml");

  assert.match(footer, /https:\/\/x\.com\/\{\{ site\.twitter\.username \}\}/);
  assert.match(footer, /fa-x-twitter/);
  assert.match(footer, /> X<\/a>/);
  assert.match(config, /https:\/\/x\.com\/jakeberv/);
  assert.doesNotMatch(config, /https:\/\/twitter\.com\/jakeberv/);
  assert.match(seo, /name="twitter:card"/);
  assert.equal(existsSync(path.join(repoRoot, "_includes/right-sidebar.html")), false);
});

test("sharing exposes five encoded modern actions in stable order", () => {
  const share = read("_includes/social-share.html");
  const markers = [
    "bsky.app/intent/compose",
    "facebook.com/sharer/sharer.php",
    "linkedin.com/sharing/share-offsite",
    "addtoany.com/add_to/mastodon",
    "x.com/intent/post",
  ];

  let previous = -1;
  for (const marker of markers) {
    const index = share.indexOf(marker);
    assert.ok(index > previous, `${marker} must follow the preceding share action`);
    previous = index;
  }

  assert.match(share, /page\.url \| absolute_url/);
  assert.match(share, /share_url \| url_encode/);
  assert.match(share, /share_title \| url_encode/);
  assert.match(share, /aria-label=/);
  assert.doesNotMatch(share, /twitter\.com\/intent|linkedin\.com\/shareArticle/);
});

test("brand styles and icon maps cover the active sharing surface", () => {
  const buttons = read("_sass/layout/_buttons.scss");
  const page = read("_sass/layout/_page.scss");
  const themes = read("_sass/_themes.scss");
  const icons = read("_sass/vendor/font-awesome/_variables.scss");

  assert.match(buttons, /\(bluesky, \$bluesky-color\)/);
  assert.match(buttons, /\(x, \$x-color\)/);
  assert.match(page, /\.page__share-links[\s\S]+flex-wrap:\s*wrap/);
  assert.match(themes, /\$bluesky-color\s*:/);
  assert.match(themes, /\$x-color\s*:/);

  for (const icon of ["bluesky", "facebook", "linkedin", "mastodon", "x-twitter"]) {
    assert.match(icons, new RegExp(`^\\s*"${icon}":\\s*\\$fa-var-`, "m"), `missing fa-${icon}`);
  }
});

test("npm exposes and runs both integration contracts", () => {
  const packageJson = JSON.parse(read("package.json"));

  assert.equal(
    packageJson.scripts["check:integrations"],
    "node --test scripts/qa/integrations-contract.test.mjs",
  );
  assert.equal(
    packageJson.scripts["check:integrations:built"],
    "node scripts/qa/integrations-built-contract.mjs",
  );
  assert.match(packageJson.scripts.test, /integrations-contract\.test\.mjs/);
  assert.match(packageJson.scripts.test, /integrations-built-contract\.test\.mjs/);
});

test("deployment validates rendered integrations before the Pages artifact", () => {
  const workflow = read(".github/workflows/deploy_site.yml");
  const build = workflow.indexOf("bundle exec jekyll build --safe --config _config.yml");
  const integrations = workflow.indexOf("npm run check:integrations:built");
  const artifact = workflow.indexOf("npm run check:site-artifact");

  assert.ok(build >= 0, "production build step must exist");
  assert.ok(integrations > build, "rendered integrations must be checked after the build");
  assert.ok(artifact > integrations, "artifact validation must follow integration validation");
});

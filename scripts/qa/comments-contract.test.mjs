import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const supportedProviders = new Set(["", "disqus", "discourse", "facebook", "custom"]);

function source(filePath) {
  return readFile(path.join(repositoryRoot, filePath), "utf8");
}

function scalar(sourceText, key, indentation = 2) {
  const pattern = new RegExp(`^ {${indentation}}${key}\\s*:`);
  const line = sourceText.split(/\r?\n/).find((candidate) => pattern.test(candidate));
  if (!line) return "";
  return line
    .slice(line.indexOf(":") + 1)
    .replace(/\s+#.*$/, "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

function providerBlock(sourceText, provider) {
  const lines = sourceText.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^  ${provider}:\\s*$`).test(line));
  if (start === -1) return "";
  let end = start + 1;
  while (end < lines.length && (lines[end].trim() === "" || /^ {4,}/.test(lines[end]))) end += 1;
  return lines.slice(start + 1, end).join("\n");
}

function validateConfiguration(sourceText) {
  const provider = scalar(sourceText, "provider", 2);
  assert.ok(supportedProviders.has(provider), `unsupported comments.provider: ${provider}`);
  if (provider === "disqus") {
    assert.ok(scalar(providerBlock(sourceText, "disqus"), "shortname", 4), "Disqus requires comments.disqus.shortname");
  }
  if (provider === "discourse") {
    const server = scalar(providerBlock(sourceText, "discourse"), "server", 4);
    assert.match(server, /^https:\/\/[^/]+(?:\/.*)?$/, "Discourse requires an HTTPS comments.discourse.server");
  }
  if (provider === "facebook") {
    const facebook = providerBlock(sourceText, "facebook");
    assert.ok(scalar(facebook, "appid", 4), "Facebook requires comments.facebook.appid");
    assert.ok(scalar(facebook, "sdk_version", 4), "Facebook requires comments.facebook.sdk_version");
  }
  return provider;
}

function isIgnored(candidate, run = spawnSync) {
  const result = run("git", ["check-ignore", "--quiet", candidate], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  if (result.error) {
    assert.fail(`Unable to run git check-ignore for ${candidate}: ${result.error.message}`);
  }
  if (result.status !== 0 && result.status !== 1) {
    const detail = result.stderr?.trim() || `exit status ${result.status}`;
    assert.fail(`git check-ignore failed for ${candidate}: ${detail}`);
  }
  return result.status === 0;
}

test("git ignore diagnostics expose command startup and repository failures", () => {
  assert.throws(
    () => isIgnored("local/example", () => ({ error: new Error("git is unavailable") })),
    /Unable to run git check-ignore for local\/example: git is unavailable/,
  );
  assert.throws(
    () => isIgnored("local/example", () => ({ status: 128, stderr: "fatal: not a git repository" })),
    /git check-ignore failed for local\/example: fatal: not a git repository/,
  );
});

test("comments configuration accepts only complete supported providers", async () => {
  assert.equal(validateConfiguration(await source("_config.yml")), "");

  const valid = [
    "comments:\n  provider: disqus\n  disqus:\n    shortname: example\n",
    "comments:\n  provider: discourse\n  discourse:\n    server: https://forum.example.test\n",
    "comments:\n  provider: facebook\n  facebook:\n    appid: '123'\n    sdk_version: v24.0\n",
    "comments:\n  provider: custom\n",
  ];
  valid.forEach((fixture) => assert.doesNotThrow(() => validateConfiguration(fixture)));

  const invalid = [
    ["comments:\n  provider: unknown\n", /unsupported comments\.provider/],
    ["comments:\n  provider: disqus\n  disqus:\n    shortname:\n", /Disqus requires/],
    ["comments:\n  provider: discourse\n  discourse:\n    server: http:\/\/forum\.example\.test\n", /HTTPS/],
    ["comments:\n  provider: facebook\n  facebook:\n    appid: '123'\n    sdk_version:\n", /sdk_version/],
  ];
  invalid.forEach(([fixture, message]) => assert.throws(() => validateConfiguration(fixture), message));
});

test("retained comment providers use centralized guarded HTTPS loaders", async () => {
  const [comments, dispatch, scripts, disqus, discourse, facebook] = await Promise.all([
    source("_includes/comments.html"),
    source("_includes/comments-providers/scripts.html"),
    source("_includes/scripts.html"),
    source("_includes/comments-providers/disqus.html"),
    source("_includes/comments-providers/discourse.html"),
    source("_includes/comments-providers/facebook.html"),
  ]);

  assert.match(scripts, /include comments-providers\/scripts\.html/);
  assert.doesNotMatch(comments, /include .*comments-providers/);
  assert.deepEqual(
    [...dispatch.matchAll(/{% when ["']([^"']+)["'] %}/g)].map((match) => match[1]),
    ["disqus", "discourse", "facebook", "custom"],
  );

  assert.match(disqus, /site\.comments\.disqus\.shortname/);
  assert.match(disqus, /https:\/\/.*\.disqus\.com\/embed\.js/);
  assert.doesNotMatch(disqus, /count\.js|http:\/\//);

  assert.match(comments, /id="discourse-comments"/);
  assert.match(discourse, /discourse_server \| slice: 0, 8/);
  assert.match(discourse, /if discourse_scheme == ["']https:\/\//);
  assert.match(discourse, /page\.url \| absolute_url/);
  assert.doesNotMatch(discourse, /["']\/\//);

  assert.match(comments, /class="fb-comments"/);
  assert.match(comments, /page\.url \| absolute_url/);
  assert.match(facebook, /site\.comments\.facebook\.appid/);
  assert.match(facebook, /site\.comments\.facebook\.sdk_version/);
  assert.match(facebook, /https:\/\/connect\.facebook\.net/);
});

test("npm and Pages validation enforce both comments contracts", async () => {
  const [packageSource, workflow] = await Promise.all([
    source("package.json"),
    source(".github/workflows/deploy_site.yml"),
  ]);
  const packageDefinition = JSON.parse(packageSource);

  assert.equal(
    packageDefinition.scripts["check:comments"],
    "node --test scripts/qa/comments-contract.test.mjs",
  );
  assert.equal(
    packageDefinition.scripts["check:comments:built"],
    "node --test scripts/qa/comments-built-contract.test.mjs",
  );
  assert.match(packageDefinition.scripts.test, /scripts\/qa\/comments-contract\.test\.mjs/);

  const build = workflow.indexOf("run: bundle exec jekyll build --safe --config _config.yml");
  const integrations = workflow.indexOf("run: npm run check:integrations:built");
  const comments = workflow.indexOf("run: npm run check:comments:built");
  const assets = workflow.indexOf("run: npm run check:assets");
  assert.ok(build >= 0 && build < integrations, "production build must precede rendered checks");
  assert.ok(integrations < comments, "comments validation must follow rendered integration checks");
  assert.ok(comments < assets, "comments validation must precede rendered asset validation");
});

test("obsolete Google Plus and Staticman executable paths are removed", async () => {
  const operationalSources = await Promise.all([
    source("_config.yml"),
    source("_includes/comments.html"),
    source("_includes/comments-providers/scripts.html"),
    source("_includes/author-profile.html"),
  ]);
  operationalSources.forEach((text) => assert.doesNotMatch(text, /google-plus|google_plus|staticman/i));

  for (const removedPath of [
    "_includes/comments-providers/google-plus.html",
    "_includes/comments-providers/staticman.html",
    "_includes/comment.html",
  ]) {
    await assert.rejects(access(path.join(repositoryRoot, removedPath)));
  }
});

test("local dependency caches are ignored without hiding reproducibility inputs", () => {
  const ignored = [
    ".bundle/config",
    "vendor/bundle/example",
    "vendor/cache/example.gem",
    "local/notes.txt",
    ".vscode/settings.json",
  ];
  ignored.forEach((candidate) => {
    assert.equal(isIgnored(candidate), true, `${candidate} should be ignored`);
  });

  for (const candidate of ["Gemfile.lock", "package-lock.json", "_sass/vendor/susy/_susy.scss"]) {
    assert.equal(isIgnored(candidate), false, `${candidate} must remain trackable`);
  }
});

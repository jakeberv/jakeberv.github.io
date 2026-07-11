import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const contract = await import("./site-artifact-contract.mjs");
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("the artifact contract exposes reusable inventory and site validators", () => {
  assert.equal(typeof contract.validateArtifactInventory, "function");
  assert.equal(typeof contract.validateSiteArtifact, "function");
});

test("the repository retains Scholar workflow source outside the Pages artifact", async () => {
  const [workflow, config] = await Promise.all([
    readFile(path.join(repositoryRoot, ".github/workflows/fetch_scholar_data.yml"), "utf8"),
    readFile(path.join(repositoryRoot, "_config.yml"), "utf8"),
    access(path.join(repositoryRoot, "fetch_scholar_metrics.py")),
  ]);

  assert.match(workflow, /\bpython fetch_scholar_metrics\.py\b/);
  assert.match(config, /^\s+- fetch_scholar_metrics\.py$/m);
});

test("the inventory accepts intended routes and public website assets", () => {
  const result = contract.validateArtifactInventory({
    files: [
      "404.html",
      "index.html",
      "talkmap/index.html",
      "talkmap/map.html",
      "assets/css/main.css",
      "assets/js/main.min.js",
      "data/impact/dashboard.json",
      "files/cv.pdf",
      "CNAME",
      "feed.xml",
      "robots.txt",
    ],
    expectedRoutes: ["404.html", "index.html", "talkmap/index.html", "talkmap/map.html"],
  });

  assert.deepEqual(result.routes, ["404.html", "index.html", "talkmap/index.html", "talkmap/map.html"]);
  assert.equal(result.files, 11);
});

test("the inventory rejects protected prefixes, filenames, and development extensions", async (t) => {
  const cases = [
    ["agents/INDEX.html", /protected path prefix "agents\/"/],
    ["Agents/private.json", /protected path prefix "agents\/"/],
    ["docs/superpowers/specs/plan.html", /protected path prefix "docs\/superpowers\/"/],
    ["AGENTS.md", /protected filename "AGENTS\.md"/],
    ["nested/todo", /protected filename "todo"/],
    ["analysis.R", /development extension "\.R"/],
    ["analysis.rds", /development extension "\.rds"/],
    ["notebook.IPYNB", /development extension "\.IPYNB"/],
    ["fetch_scholar_metrics.py", /development extension "\.py"/],
    ["scripts/check.mjs", /protected path prefix "scripts\/"/],
    ["Gemfile.lock", /protected filename "Gemfile\.lock"/],
  ];

  for (const [file, message] of cases) {
    await t.test(file, () => {
      assert.throws(
        () => contract.validateArtifactInventory({ files: ["index.html", file], expectedRoutes: ["index.html"] }),
        message,
      );
    });
  }
});

test("the inventory reports missing, unexpected, and case-sensitive route drift", () => {
  assert.throws(
    () => contract.validateArtifactInventory({
      files: ["index.html", "Talkmap/index.html"],
      expectedRoutes: ["index.html", "talkmap/index.html"],
    }),
    (error) => {
      assert.match(error.message, /missing HTML route: talkmap\/index\.html/);
      assert.match(error.message, /unexpected HTML route: Talkmap\/index\.html/);
      return true;
    },
  );
});

test("the inventory rejects duplicate expected routes", () => {
  assert.throws(
    () => contract.validateArtifactInventory({
      files: ["index.html"],
      expectedRoutes: ["index.html", "index.html"],
    }),
    /duplicate expected HTML route: index\.html/,
  );
});

test("the site validator preserves Scholar workflow source while excluding it from output", async (t) => {
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "site-artifact-contract-"));
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  const siteDirectory = path.join(repositoryRoot, "_site");
  const workflowDirectory = path.join(repositoryRoot, ".github/workflows");
  const qaDirectory = path.join(repositoryRoot, "scripts/qa");
  await Promise.all([
    mkdir(siteDirectory, { recursive: true }),
    mkdir(workflowDirectory, { recursive: true }),
    mkdir(qaDirectory, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(path.join(siteDirectory, "index.html"), "<!doctype html>\n", "utf8"),
    writeFile(path.join(repositoryRoot, "fetch_scholar_metrics.py"), "print('ok')\n", "utf8"),
    writeFile(
      path.join(workflowDirectory, "fetch_scholar_data.yml"),
      "steps:\n  - run: python fetch_scholar_metrics.py\n",
      "utf8",
    ),
    writeFile(path.join(qaDirectory, "expected-html-routes.txt"), "index.html\n", "utf8"),
  ]);

  const result = await contract.validateSiteArtifact({ repositoryRoot, siteDirectory });
  assert.equal(result.routes.length, 1);

  await writeFile(
    path.join(workflowDirectory, "fetch_scholar_data.yml"),
    "# python fetch_scholar_metrics.py\nsteps: []\n",
    "utf8",
  );
  await assert.rejects(
    contract.validateSiteArtifact({ repositoryRoot, siteDirectory }),
    /Scholar workflow no longer invokes fetch_scholar_metrics\.py/,
  );

  await writeFile(
    path.join(workflowDirectory, "fetch_scholar_data.yml"),
    "steps:\n  - run: python fetch_scholar_metrics.py\n",
    "utf8",
  );

  await rm(path.join(repositoryRoot, "fetch_scholar_metrics.py"));
  await assert.rejects(
    contract.validateSiteArtifact({ repositoryRoot, siteDirectory }),
    /tracked Scholar source is missing: fetch_scholar_metrics\.py/,
  );
});

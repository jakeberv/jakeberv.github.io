import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const siteDirectory = path.join(repositoryRoot, "_site");

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(entryPath)));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(entryPath);
  }
  return files;
}

async function requireSiteDirectory(directory) {
  try {
    const details = await stat(directory);
    assert.ok(details.isDirectory(), `${directory} must be a directory`);
  } catch (error) {
    if (error?.code === "ENOENT") {
      assert.fail(`Missing ${directory}; build the production site before running this check`);
    }
    throw error;
  }
}

test("missing production output reports the required build step", async () => {
  await assert.rejects(
    requireSiteDirectory(path.join(repositoryRoot, "_site-does-not-exist")),
    /build the production site before running this check/,
  );
});

test("default production output contains no comment provider surface", async () => {
  await requireSiteDirectory(siteDirectory);
  const files = await htmlFiles(siteDirectory);
  assert.equal(files.length, 222);
  const forbidden = [
    /id=["']disqus_thread["']/i,
    /id=["']discourse-comments["']/i,
    /class=["'][^"']*fb-comments/i,
    /id=["']comments["']/i,
    /\.disqus\.com\/embed\.js/i,
    /connect\.facebook\.net/i,
    /javascripts\/embed\.js/i,
  ];
  for (const file of files) {
    const html = await readFile(file, "utf8");
    forbidden.forEach((pattern) => assert.doesNotMatch(html, pattern, path.relative(siteDirectory, file)));
  }
});

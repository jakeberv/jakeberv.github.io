import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { generateBundle, verifyBundle } from "../build-js.mjs";

test("generateBundle is deterministic and retains the jQuery license", async () => {
  const first = await generateBundle();
  const second = await generateBundle();

  assert.equal(first, second);
  assert.match(first, /jQuery v3\.7\.1/);
  assert.ok(first.endsWith("\n"));
});

test("verifyBundle rejects stale output without rewriting it", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "phase3-js-bundle-"));
  const outputPath = path.join(directory, "main.min.js");

  try {
    await writeFile(outputPath, "stale bundle\n", "utf8");

    await assert.rejects(
      verifyBundle(outputPath),
      /JavaScript bundle is stale/,
    );
    assert.equal(await readFile(outputPath, "utf8"), "stale bundle\n");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

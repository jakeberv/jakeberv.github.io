import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const generatorPath = path.join(repositoryRoot, "scripts/build-career-geo-data.mjs");

test("talk-map generation is deterministic for a fixed as-of date", () => {
  const source = readFileSync(generatorPath, "utf8");
  assert.match(source, /--as-of/);
  assert.match(source, /--talkmap-output/);

  const first = mkdtempSync(path.join(os.tmpdir(), "talkmap-first-"));
  const second = mkdtempSync(path.join(os.tmpdir(), "talkmap-second-"));
  try {
    const run = (directory) => spawnSync(
      process.execPath,
      [
        generatorPath,
        "--as-of", "2026-07-11",
        "--career-output", path.join(directory, "career.json"),
        "--talkmap-output", path.join(directory, "talks.json"),
      ],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    const firstRun = run(first);
    const secondRun = run(second);
    assert.equal(firstRun.status, 0, firstRun.stderr || firstRun.stdout);
    assert.equal(secondRun.status, 0, secondRun.stderr || secondRun.stdout);

    const firstSource = readFileSync(path.join(first, "talks.json"), "utf8");
    const secondSource = readFileSync(path.join(second, "talks.json"), "utf8");
    assert.equal(firstSource, secondSource);
    const payload = JSON.parse(firstSource);
    assert.equal(payload.as_of, "2026-07-11");
    assert.equal(payload.event_count, 61);
    assert.equal(payload.entries.length, 61);
    assert.ok(payload.entries.every((entry) => entry.date <= payload.as_of));
    assert.ok(payload.entries.every((entry) => !entry.title.startsWith("Award:")));
    assert.ok(payload.entries.every((entry) => entry.localities.length > 0));
    assert.ok(payload.entries.every((entry) => !/[<>]/.test(entry.excerpt)));
    const congressExcerpt = payload.entries.find(
      (entry) => entry.id === "2024-07-30-3rd-Joint-Congress-on-Evolutionary-Biology",
    ).excerpt;
    assert.match(congressExcerpt, /^Title slide from the Montreal presentation/);
    assert.match(congressExcerpt, /YouTube here\.$/);
    const keynoteExcerpt = payload.entries.find(
      (entry) => entry.id === "2025-10-10-gsa-pardee-symposium-keynote",
    ).excerpt;
    assert.match(keynoteExcerpt, /^Jacob Berv delivered a keynote talk/);
    assert.doesNotMatch(keynoteExcerpt, /\bon$/);
    assert.match(keynoteExcerpt, /with his\.\.\.$/);
  } finally {
    rmSync(first, { recursive: true, force: true });
    rmSync(second, { recursive: true, force: true });
  }
});

test("the talk map uses pinned, theme-aware, page-scoped assets", () => {
  const page = readFileSync(path.join(repositoryRoot, "_pages/talkmap.html"), "utf8");
  const markup = readFileSync(path.join(repositoryRoot, "_includes/talkmap.html"), "utf8");
  const runtime = readFileSync(path.join(repositoryRoot, "assets/js/talkmap.js"), "utf8");
  const styles = readFileSync(path.join(repositoryRoot, "_sass/layout/_talkmap.scss"), "utf8");
  const redirect = readFileSync(path.join(repositoryRoot, "talkmap/map.html"), "utf8");

  assert.match(page, /d3@7\.9\.0/);
  assert.match(page, /topojson-client@3\.1\.0/);
  assert.match(markup, /world-atlas@2\.0\.2/);
  assert.match(markup, /data\/talkmap\/talk_events\.json/);
  assert.match(markup, /class="talkmap-controls" role="group" aria-label="Talk map filters"/);
  assert.equal((markup.match(/class="talkmap-control-group" role="group"/g) || []).length, 2);
  assert.match(markup, /<svg[^>]+role="group"/);
  assert.doesNotMatch(markup, /<svg[^>]+role="img"/);
  assert.doesNotMatch(page, /<iframe|Leaflet|talkmap\.ipynb/i);
  assert.match(runtime, /site:themechange/);
  assert.match(runtime, /--viz-/);
  assert.match(runtime, /role|status/);
  assert.match(runtime, /Number\.isFinite\(event\.clientX\)/);
  assert.match(runtime, /event\.currentTarget\.getBoundingClientRect/);
  assert.match(styles, /--site-|--viz-/);
  assert.match(redirect, /url=\/talkmap\.html/);
  assert.doesNotMatch(redirect, /leaflet|markercluster|org-locations/i);
});

test("the obsolete demo talk-map data is removed", () => {
  assert.throws(
    () => readFileSync(path.join(repositoryRoot, "talkmap/org-locations.js"), "utf8"),
    /ENOENT/,
  );
});

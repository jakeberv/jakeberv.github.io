#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const publicationsScript = path.join(repoRoot, "markdown_generator/publications.py");
const talksScript = path.join(repoRoot, "markdown_generator/talks.py");
const publicationValidator = path.join(repoRoot, "scripts/qa/validate-publication-tags.mjs");
const methodValidator = path.join(repoRoot, "scripts/qa/validate-publication-method-tags.mjs");

const publicationHeaders = [
  "pub_date",
  "title",
  "venue",
  "citation",
  "url_slug",
  "type",
  "tags",
  "authors",
  "abstract",
  "method_families",
  "method_tags",
  "method_tag_confidence",
  "excerpt",
  "paper_url",
  "link",
  "slides_url",
  "bibtex_url",
  "doi",
  "github",
  "featured",
  "student_authors",
  "category",
];

const validPublication = {
  pub_date: "2026-07-10",
  title: "Birds, trees & a \"quoted\" result",
  venue: "Journal of Tests",
  citation: "Doe, J. & Berv, J. S. (2026). <i>A test</i>.",
  url_slug: "Doe_Berv_2026",
  type: "article",
  tags: "birds|phylogenomics|macroevolution",
  authors: "Doe, J.|Berv, J. S.",
  abstract: "A first line.\nA second line with an apostrophe.",
  method_families: "phylogenetic_inference",
  method_tags: "target_capture_phylogenomics|branch_support_bootstrap",
  method_tag_confidence: "high",
  excerpt: "A short & useful summary.",
  paper_url: "https://example.test/paper.pdf",
  link: "https://doi.org/10.1000/example",
  slides_url: "https://example.test/slides.pdf",
  bibtex_url: "https://example.test/citation.bib",
  doi: "10.1000/example",
  github: "https://github.com/example/repository",
  featured: "true",
  student_authors: "Doe, J.",
  category: "peer-reviewed",
};

const talkHeaders = [
  "title",
  "type",
  "url_slug",
  "venue",
  "date",
  "location",
  "talk_url",
  "description",
];

function csvCell(value, delimiter) {
  const text = String(value ?? "");
  if (text.includes(delimiter) || text.includes("\n") || text.includes('"')) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function writeTable(filePath, headers, rows, { bom = false } = {}) {
  const delimiter = path.extname(filePath) === ".csv" ? "," : "\t";
  const lines = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))]
    .map((values) => values.map((value) => csvCell(value, delimiter)).join(delimiter));
  fs.writeFileSync(filePath, `${bom ? "\ufeff" : ""}${lines.join("\n")}\n`, "utf8");
}

function run(command, args, cwd = repoRoot) {
  return spawnSync(command, args, { cwd, encoding: "utf8" });
}

function runGenerator(script, args, cwd = repoRoot) {
  return run("python3", [script, ...args], cwd);
}

function temporaryDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "phase8-generator-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test("publication CSV and TSV inputs generate identical site-compatible Markdown", (t) => {
  const temp = temporaryDirectory(t);
  const csv = path.join(temp, "publications.csv");
  const tsv = path.join(temp, "publications.tsv");
  const csvOutput = path.join(temp, "csv-output");
  const tsvOutput = path.join(temp, "tsv-output");
  writeTable(csv, publicationHeaders, [validPublication], { bom: true });
  writeTable(tsv, [...publicationHeaders].reverse(), [validPublication]);

  const csvResult = runGenerator(publicationsScript, ["generate", csv, "--output-dir", csvOutput]);
  const tsvResult = runGenerator(publicationsScript, ["generate", tsv, "--output-dir", tsvOutput]);
  assert.equal(csvResult.status, 0, csvResult.stderr || csvResult.stdout);
  assert.equal(tsvResult.status, 0, tsvResult.stderr || tsvResult.stdout);

  const filename = "2026-07-10-Doe_Berv_2026.md";
  const csvMarkdown = fs.readFileSync(path.join(csvOutput, filename), "utf8");
  const tsvMarkdown = fs.readFileSync(path.join(tsvOutput, filename), "utf8");
  assert.equal(csvMarkdown, tsvMarkdown);
  assert.match(csvMarkdown, /^---\ntitle: "Birds, trees & a \\"quoted\\" result"$/m);
  assert.match(csvMarkdown, /^collection: publications$/m);
  assert.match(csvMarkdown, /^permalink: \/publication\/2026-07-10-Doe_Berv_2026$/m);
  assert.match(csvMarkdown, /^paperurl: "https:\/\/example\.test\/paper\.pdf"$/m);
  assert.match(csvMarkdown, /^slidesurl: "https:\/\/example\.test\/slides\.pdf"$/m);
  assert.match(csvMarkdown, /^bibtexurl: "https:\/\/example\.test\/citation\.bib"$/m);
  assert.match(csvMarkdown, /^category: "peer-reviewed"$/m);
  assert.match(csvMarkdown, /^featured: true$/m);
  assert.match(csvMarkdown, /^tags:\n  - "birds"\n  - "phylogenomics"\n  - "macroevolution"$/m);
  assert.match(csvMarkdown, /^abstract: \|\n  A first line\.\n  A second line with an apostrophe\.$/m);
  assert.doesNotMatch(csvMarkdown, /&amp;|&quot;|&apos;/);
  assert.ok(csvMarkdown.endsWith("\n"));
});

test("publication check validates without leaving output and works outside the repository", (t) => {
  const temp = temporaryDirectory(t);
  const input = path.join(temp, "publications.csv");
  writeTable(input, publicationHeaders, [validPublication]);

  const result = runGenerator(publicationsScript, ["check", input], temp);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /validated 1 publication/i);
  assert.match(result.stdout, /2026-07-10-Doe_Berv_2026\.md/);
  assert.deepEqual(fs.readdirSync(temp).sort(), ["publications.csv"]);
});

test("publication breadcrumbs align their collection URL and label", () => {
  const breadcrumbs = fs.readFileSync(path.join(repoRoot, "_includes/breadcrumbs.html"), "utf8");
  assert.match(breadcrumbs, /assign breadcrumb_label = 'Publications'/);
  assert.match(breadcrumbs, /itemprop="name">\{\{ breadcrumb_label \}\}/);
});

test("publication defaults are explicit when optional columns are omitted", (t) => {
  const temp = temporaryDirectory(t);
  const input = path.join(temp, "publications.tsv");
  const output = path.join(temp, "output");
  const requiredHeaders = publicationHeaders.filter((header) =>
    [
      "pub_date",
      "title",
      "venue",
      "citation",
      "url_slug",
      "type",
      "tags",
      "authors",
      "abstract",
      "method_families",
      "method_tags",
      "method_tag_confidence",
    ].includes(header),
  );
  writeTable(input, requiredHeaders, [validPublication]);

  const result = runGenerator(publicationsScript, ["generate", input, "--output-dir", output]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const markdown = fs.readFileSync(path.join(output, "2026-07-10-Doe_Berv_2026.md"), "utf8");
  assert.match(markdown, /^category: "manuscripts"$/m);
  assert.match(markdown, /^featured: false$/m);
});

test("CRLF input is normalized to deterministic LF output", (t) => {
  const temp = temporaryDirectory(t);
  const input = path.join(temp, "publications.csv");
  const output = path.join(temp, "output");
  writeTable(input, publicationHeaders, [validPublication]);
  const withCrlf = fs.readFileSync(input, "utf8").replaceAll("\n", "\r\n");
  fs.writeFileSync(input, withCrlf, "utf8");

  const result = runGenerator(publicationsScript, ["generate", input, "--output-dir", output]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const markdown = fs.readFileSync(path.join(output, "2026-07-10-Doe_Berv_2026.md"), "utf8");
  assert.doesNotMatch(markdown, /\r/);
});

test("publication generation is deterministic and collisions require overwrite", (t) => {
  const temp = temporaryDirectory(t);
  const input = path.join(temp, "publications.tsv");
  const output = path.join(temp, "output");
  writeTable(input, publicationHeaders, [validPublication]);

  const first = runGenerator(publicationsScript, ["generate", input, "--output-dir", output]);
  assert.equal(first.status, 0, first.stderr || first.stdout);
  const target = path.join(output, "2026-07-10-Doe_Berv_2026.md");
  const expected = fs.readFileSync(target, "utf8");
  if (process.platform !== "win32") {
    assert.equal(fs.statSync(target).mode & 0o777, 0o666 & ~process.umask());
    fs.chmodSync(target, 0o640);
  }
  fs.writeFileSync(path.join(output, "unrelated.md"), "keep me\n");

  const collision = runGenerator(publicationsScript, ["generate", input, "--output-dir", output]);
  assert.equal(collision.status, 2);
  assert.match(collision.stderr, /--overwrite/);
  assert.equal(fs.readFileSync(target, "utf8"), expected);

  const overwrite = runGenerator(publicationsScript, [
    "generate",
    input,
    "--output-dir",
    output,
    "--overwrite",
  ]);
  assert.equal(overwrite.status, 0, overwrite.stderr || overwrite.stdout);
  assert.equal(fs.readFileSync(target, "utf8"), expected);
  if (process.platform !== "win32") {
    assert.equal(fs.statSync(target).mode & 0o777, 0o640);
  }
  assert.equal(fs.readFileSync(path.join(output, "unrelated.md"), "utf8"), "keep me\n");
});

test("non-overwrite publication is atomic when a target appears after preflight", (t) => {
  const temp = temporaryDirectory(t);
  const moduleDirectory = path.join(repoRoot, "markdown_generator");
  const program = `
import pathlib
import sys
sys.path.insert(0, ${JSON.stringify(moduleDirectory)})
import generator_core
from generator_core import Document, InputValidationError, write_documents

output = pathlib.Path(sys.argv[1])
output.mkdir()
target = output / "race.md"
real_link = generator_core.os.link

def racing_link(source, destination):
    pathlib.Path(destination).write_text("concurrent\\n", encoding="utf-8")
    return real_link(source, destination)

generator_core.os.link = racing_link
try:
    write_documents([Document("race.md", "generated\\n", 2)], output, overwrite=False)
except InputValidationError:
    if target.read_text(encoding="utf-8") == "concurrent\\n":
        raise SystemExit(0)
raise SystemExit(3)
`;

  const result = run("python3", ["-c", program, path.join(temp, "output")]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(fs.readdirSync(path.join(temp, "output")), ["race.md"]);
});

test("non-overwrite publication explains unsupported atomic hard links", (t) => {
  const temp = temporaryDirectory(t);
  const moduleDirectory = path.join(repoRoot, "markdown_generator");
  const program = `
import errno
import pathlib
import sys
sys.path.insert(0, ${JSON.stringify(moduleDirectory)})
import generator_core
from generator_core import Document, write_documents

output = pathlib.Path(sys.argv[1])
generator_core.os.link = lambda source, destination: (_ for _ in ()).throw(
    OSError(errno.EOPNOTSUPP, "Operation not supported")
)
write_documents([Document("unsupported.md", "generated\\n", 2)], output, overwrite=False)
`;

  const result = run("python3", ["-c", program, path.join(temp, "output")]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unsupported\.md/);
  assert.match(result.stderr, /atomic hard link/i);
  assert.match(result.stderr, /operation not supported/i);
  assert.deepEqual(fs.readdirSync(path.join(temp, "output")), []);
});

test("publication validation reports all row errors and writes nothing", (t) => {
  const temp = temporaryDirectory(t);
  const input = path.join(temp, "invalid.csv");
  const output = path.join(temp, "output");
  const invalidRows = [
    { ...validPublication, pub_date: "2026-02-30", url_slug: "../escape", title: "" },
    { ...validPublication, pub_date: "2026-02-30", url_slug: "../escape", type: "unknown" },
  ];
  writeTable(input, publicationHeaders, invalidRows);

  const result = runGenerator(publicationsScript, ["generate", input, "--output-dir", output]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /row 2/i);
  assert.match(result.stderr, /row 3/i);
  assert.match(result.stderr, /title/i);
  assert.match(result.stderr, /date/i);
  assert.match(result.stderr, /slug/i);
  assert.equal(fs.existsSync(output), false);
});

test("publication headers, booleans, and taxonomy values are strict", (t) => {
  const temp = temporaryDirectory(t);
  const unknownHeaderInput = path.join(temp, "unknown.tsv");
  writeTable(unknownHeaderInput, [...publicationHeaders, "surprise"], [validPublication]);
  const headerResult = runGenerator(publicationsScript, ["check", unknownHeaderInput]);
  assert.equal(headerResult.status, 2);
  assert.match(headerResult.stderr, /unknown header.*surprise/i);

  const invalidValuesInput = path.join(temp, "invalid-values.tsv");
  writeTable(invalidValuesInput, publicationHeaders, [
    { ...validPublication, featured: "sometimes", tags: "not-a-canonical-tag", method_tag_confidence: "certain" },
  ]);
  const valuesResult = runGenerator(publicationsScript, ["check", invalidValuesInput]);
  assert.equal(valuesResult.status, 2);
  assert.match(valuesResult.stderr, /featured/i);
  assert.match(valuesResult.stderr, /not-a-canonical-tag|method_tag_confidence|certain/i);

  const duplicateHeaderInput = path.join(temp, "duplicate-header.tsv");
  fs.writeFileSync(duplicateHeaderInput, "title\ttitle\nfirst\tsecond\n", "utf8");
  const duplicateHeaderResult = runGenerator(publicationsScript, ["check", duplicateHeaderInput]);
  assert.equal(duplicateHeaderResult.status, 2);
  assert.match(duplicateHeaderResult.stderr, /duplicate header.*title/i);
});

test("malformed input and missing output arguments fail without writes", (t) => {
  const temp = temporaryDirectory(t);
  const malformed = path.join(temp, "malformed.csv");
  const output = path.join(temp, "output");
  fs.writeFileSync(malformed, `${publicationHeaders.join(",")}\n"unterminated\n`, "utf8");

  const malformedResult = runGenerator(publicationsScript, [
    "generate",
    malformed,
    "--output-dir",
    output,
  ]);
  assert.equal(malformedResult.status, 2);
  assert.match(malformedResult.stderr, /malformed delimited input/i);
  assert.equal(fs.existsSync(output), false);

  const missingOutput = runGenerator(publicationsScript, ["generate", malformed]);
  assert.equal(missingOutput.status, 2);
  assert.match(missingOutput.stderr, /--output-dir/);
  assert.equal(fs.existsSync(output), false);
});

test("invalid UTF-8 is a correctable input error", (t) => {
  const temp = temporaryDirectory(t);
  const input = path.join(temp, "invalid-encoding.csv");
  const output = path.join(temp, "output");
  fs.writeFileSync(input, Buffer.from([0xff, 0xfe, 0xfd]));

  const result = runGenerator(publicationsScript, ["generate", input, "--output-dir", output]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /UTF-8/i);
  assert.equal(fs.existsSync(output), false);
});

test("custom publication directories are accepted by both taxonomy validators", (t) => {
  const temp = temporaryDirectory(t);
  const input = path.join(temp, "publications.tsv");
  const output = path.join(temp, "output");
  writeTable(input, publicationHeaders, [validPublication]);
  const generated = runGenerator(publicationsScript, ["generate", input, "--output-dir", output]);
  assert.equal(generated.status, 0, generated.stderr || generated.stdout);

  const tags = run("node", [publicationValidator, "--publications-dir", output], temp);
  const methods = run("node", [methodValidator, "--publications-dir", output], temp);
  assert.equal(tags.status, 0, tags.stderr || tags.stdout);
  assert.equal(methods.status, 0, methods.stderr || methods.stdout);
  assert.match(tags.stdout, /files_checked=1/);
  assert.match(methods.stdout, /files_checked=1/);
});

test("taxonomy validators reject option tokens as publication directory values", () => {
  const tags = run("node", [publicationValidator, "--publications-dir", "--unexpected"]);
  const methods = run("node", [
    methodValidator,
    "--publications-dir",
    "--allow-untagged",
  ]);

  assert.equal(tags.status, 2);
  assert.match(tags.stderr, /Unknown or incomplete argument: --publications-dir/);
  assert.equal(methods.status, 2);
  assert.match(methods.stderr, /Unknown or incomplete argument: --publications-dir/);
});

test("the method validator rejects conflicting untagged policies", () => {
  const result = run("node", [
    methodValidator,
    "--allow-untagged",
    "--fail-on-untagged",
  ]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /cannot be used together/i);
});

test("publication validators accept CRLF front matter", (t) => {
  const temp = temporaryDirectory(t);
  const input = path.join(temp, "publications.tsv");
  const output = path.join(temp, "output");
  writeTable(input, publicationHeaders, [validPublication]);
  const generated = runGenerator(publicationsScript, ["generate", input, "--output-dir", output]);
  assert.equal(generated.status, 0, generated.stderr || generated.stdout);

  const target = path.join(output, "2026-07-10-Doe_Berv_2026.md");
  fs.writeFileSync(target, fs.readFileSync(target, "utf8").replaceAll("\n", "\r\n"), "utf8");

  const tags = run("node", [publicationValidator, "--publications-dir", output]);
  const methods = run("node", [methodValidator, "--publications-dir", output]);
  assert.equal(tags.status, 0, tags.stderr || tags.stdout);
  assert.equal(methods.status, 0, methods.stderr || methods.stdout);
});

test("publication checks reject unknown topic and method taxonomy values", (t) => {
  const temp = temporaryDirectory(t);
  const input = path.join(temp, "publications.tsv");
  writeTable(input, publicationHeaders, [
    {
      ...validPublication,
      tags: "not-a-canonical-tag",
      method_tags: "not_a_canonical_method",
    },
  ]);

  const result = runGenerator(publicationsScript, ["check", input]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /validate-publication-tags\.mjs/);
  assert.match(result.stderr, /unknown tag=not-a-canonical-tag/);
  assert.match(result.stderr, /validate-publication-method-tags\.mjs/);
  assert.match(result.stderr, /unknown method_tag=not_a_canonical_method/);
  assert.ok(
    result.stderr.trim().split(/\r?\n/).every((line) => line.startsWith("error: ")),
    result.stderr,
  );
});

test("talk generator always emits dates and compatible type fields", (t) => {
  const temp = temporaryDirectory(t);
  const csv = path.join(temp, "talks.csv");
  const tsv = path.join(temp, "talks.tsv");
  const csvOutput = path.join(temp, "csv-output");
  const tsvOutput = path.join(temp, "tsv-output");
  const talk = {
    title: "A talk with no location",
    type: "",
    url_slug: "future-talk",
    venue: "Test Seminar",
    date: "2026-07-11",
    location: "",
    talk_url: "https://example.test/talk",
    description: "Markdown **description** & notes.",
  };
  writeTable(csv, talkHeaders, [talk], { bom: true });
  writeTable(tsv, [...talkHeaders].reverse(), [talk]);

  const checked = runGenerator(talksScript, ["check", csv], temp);
  const generatedCsv = runGenerator(talksScript, ["generate", csv, "--output-dir", csvOutput], temp);
  const generatedTsv = runGenerator(talksScript, ["generate", tsv, "--output-dir", tsvOutput], temp);
  assert.equal(checked.status, 0, checked.stderr || checked.stdout);
  assert.equal(generatedCsv.status, 0, generatedCsv.stderr || generatedCsv.stdout);
  assert.equal(generatedTsv.status, 0, generatedTsv.stderr || generatedTsv.stdout);

  const filename = "2026-07-11-future-talk.md";
  const markdown = fs.readFileSync(path.join(csvOutput, filename), "utf8");
  assert.equal(markdown, fs.readFileSync(path.join(tsvOutput, filename), "utf8"));
  assert.match(markdown, /^date: 2026-07-11$/m);
  assert.match(markdown, /^type: "Talk"$/m);
  assert.match(markdown, /^talk_type: "Talk"$/m);
  assert.match(markdown, /^permalink: \/talks\/2026-07-11-future-talk$/m);
  assert.doesNotMatch(markdown, /^location:/m);
  assert.doesNotMatch(markdown, /False/);
});

test("talk validation rejects duplicate targets without creating output", (t) => {
  const temp = temporaryDirectory(t);
  const input = path.join(temp, "talks.tsv");
  const output = path.join(temp, "output");
  const talk = {
    title: "A talk",
    type: "Talk",
    url_slug: "duplicate",
    venue: "Venue",
    date: "2026-07-11",
    location: "",
    talk_url: "",
    description: "Description",
  };
  writeTable(input, talkHeaders, [talk, { ...talk, title: "Another talk" }]);

  const result = runGenerator(talksScript, ["generate", input, "--output-dir", output]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /duplicate target/i);
  assert.equal(fs.existsSync(output), false);
});

test("target names are unique across case-insensitive filesystems", (t) => {
  const temp = temporaryDirectory(t);
  const input = path.join(temp, "talks.tsv");
  const rows = [
    {
      title: "Uppercase target",
      type: "Talk",
      url_slug: "Case-Sensitive",
      venue: "Venue",
      date: "2026-07-11",
      location: "",
      talk_url: "",
      description: "Description",
    },
    {
      title: "Lowercase target",
      type: "Talk",
      url_slug: "case-sensitive",
      venue: "Venue",
      date: "2026-07-11",
      location: "",
      talk_url: "",
      description: "Description",
    },
  ];
  writeTable(input, talkHeaders, rows);

  const result = runGenerator(talksScript, ["check", input]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /duplicate target/i);
});

test("the supported CLIs are dependency-free and build-only", () => {
  const publications = fs.readFileSync(publicationsScript, "utf8");
  const talks = fs.readFileSync(talksScript, "utf8");
  const config = fs.readFileSync(path.join(repoRoot, "_config.yml"), "utf8");
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));

  assert.doesNotMatch(publications, /\bimport pandas\b|\bfrom pandas\b/);
  assert.doesNotMatch(talks, /\bimport pandas\b|\bfrom pandas\b/);
  assert.match(config, /^\s*- markdown_generator\s*$/m);
  assert.equal(packageJson.scripts["check:generators"], "node --test scripts/qa/content-generators.test.mjs");
  assert.match(packageJson.scripts.test, /scripts\/qa\/content-generators\.test\.mjs/);
});

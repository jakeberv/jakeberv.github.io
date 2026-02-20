#!/usr/bin/env node

import fs from "fs";
import path from "path";

const PUBLICATIONS_DIR = "_publications";
const PUBLICATION_TAXONOMY_PATH = "_data/publication_tags.yml";
const METHOD_TAXONOMY_PATH = "_data/research_method_tags.yml";
const EXPECTED_STATS_PATH = "_data/publications_interdisciplinarity_stats.json";

const WRITE_MODE = process.argv.includes("--write");
const JSON_MODE = process.argv.includes("--json");

function parseFrontMatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  return match ? match[1] : null;
}

function cleanYamlScalar(value) {
  return value.trim().replace(/^["']|["']$/g, "").trim();
}

function extractList(frontMatter, key) {
  const inlineRe = new RegExp(`^${key}:\\s*\\[(.*)\\]\\s*$`, "m");
  const inline = frontMatter.match(inlineRe);
  if (inline) {
    return inline[1]
      .split(",")
      .map((item) => cleanYamlScalar(item))
      .filter(Boolean);
  }

  const lines = frontMatter.split("\n");
  const start = lines.findIndex((line) => new RegExp(`^${key}:\\s*$`).test(line));
  if (start === -1) return null;

  const values = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^[A-Za-z0-9_-]+:\s*/.test(line)) break;
    const match = line.match(/^\s*-\s*(.+)\s*$/);
    if (match) {
      values.push(cleanYamlScalar(match[1]));
      continue;
    }
    if (line.trim() === "") continue;
    break;
  }
  return values;
}

function dedupe(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function parsePublicationTagToGroup(raw) {
  const lines = raw.split("\n");
  const tagToGroup = new Map();
  let section = null;
  let currentTagSlug = null;

  for (const line of lines) {
    if (/^tags:\s*$/.test(line)) {
      section = "tags";
      currentTagSlug = null;
      continue;
    }

    if (/^[A-Za-z0-9_-]+:\s*$/.test(line) && !line.startsWith(" ")) {
      section = null;
      currentTagSlug = null;
      continue;
    }

    if (section !== "tags") continue;

    const slugMatch = line.match(/^\s*-\s*slug:\s*([a-z0-9-]+)\s*$/);
    if (slugMatch) {
      currentTagSlug = slugMatch[1];
      continue;
    }

    const groupMatch = line.match(/^\s*group:\s*([a-z0-9_-]+)\s*$/);
    if (groupMatch && currentTagSlug) {
      tagToGroup.set(currentTagSlug, groupMatch[1]);
    }
  }

  return tagToGroup;
}

function parseMethodTagToFamily(raw) {
  const lines = raw.split("\n");
  const tagToFamily = new Map();
  let section = null;
  let currentTagId = null;

  for (const line of lines) {
    if (/^tags:\s*$/.test(line)) {
      section = "tags";
      currentTagId = null;
      continue;
    }

    if (/^[A-Za-z0-9_-]+:\s*$/.test(line) && !line.startsWith(" ")) {
      section = null;
      currentTagId = null;
      continue;
    }

    if (section !== "tags") continue;

    const idMatch = line.match(/^\s*-\s*id:\s*([A-Za-z0-9_-]+)\s*$/);
    if (idMatch) {
      currentTagId = idMatch[1];
      continue;
    }

    const familyMatch = line.match(/^\s*method_family:\s*([A-Za-z0-9_-]+)\s*$/);
    if (familyMatch && currentTagId) {
      tagToFamily.set(currentTagId, familyMatch[1]);
    }
  }

  return tagToFamily;
}

function computeBraidStats() {
  if (!fs.existsSync(PUBLICATIONS_DIR)) {
    throw new Error(`Missing publications directory: ${PUBLICATIONS_DIR}`);
  }
  if (!fs.existsSync(PUBLICATION_TAXONOMY_PATH)) {
    throw new Error(`Missing publication taxonomy: ${PUBLICATION_TAXONOMY_PATH}`);
  }
  if (!fs.existsSync(METHOD_TAXONOMY_PATH)) {
    throw new Error(`Missing method taxonomy: ${METHOD_TAXONOMY_PATH}`);
  }

  const tagToGroup = parsePublicationTagToGroup(fs.readFileSync(PUBLICATION_TAXONOMY_PATH, "utf8"));
  const tagToFamily = parseMethodTagToFamily(fs.readFileSync(METHOD_TAXONOMY_PATH, "utf8"));
  if (tagToGroup.size === 0 || tagToFamily.size === 0) {
    throw new Error("Taxonomy parse failed: expected non-empty publication tag groups and method tag families.");
  }

  const files = fs.readdirSync(PUBLICATIONS_DIR).filter((name) => name.endsWith(".md")).sort();
  const normalized = [];

  for (const file of files) {
    const fullPath = path.join(PUBLICATIONS_DIR, file);
    const raw = fs.readFileSync(fullPath, "utf8");
    const frontMatter = parseFrontMatter(raw);
    if (!frontMatter) continue;

    const publicationTags = extractList(frontMatter, "tags");
    const methodTags = extractList(frontMatter, "method_tags");
    if (!publicationTags || !methodTags) continue;

    const pubGroups = dedupe(publicationTags.map((slug) => tagToGroup.get(slug)).filter(Boolean));
    const validMethodTags = dedupe(methodTags).filter((tagId) => tagToFamily.has(tagId));
    if (!pubGroups.length || !validMethodTags.length) continue;

    const families = dedupe(validMethodTags.map((tagId) => tagToFamily.get(tagId)).filter(Boolean));
    normalized.push({
      pubGroups,
      families,
      methodTagCount: validMethodTags.length,
    });
  }

  if (!normalized.length) {
    return {
      tagged_outputs: 0,
      method_families_represented: 0,
      avg_method_tags_per_output: 0,
      avg_theme_groups_per_output: 0,
    };
  }

  const families = new Set();
  normalized.forEach((paper) => {
    paper.families.forEach((familyId) => families.add(familyId));
  });

  return {
    tagged_outputs: normalized.length,
    method_families_represented: families.size,
    avg_method_tags_per_output: Number(avg(normalized.map((paper) => paper.methodTagCount)).toFixed(2)),
    avg_theme_groups_per_output: Number(avg(normalized.map((paper) => paper.pubGroups.length)).toFixed(2)),
  };
}

function readExpectedStats() {
  if (!fs.existsSync(EXPECTED_STATS_PATH)) return null;
  const raw = fs.readFileSync(EXPECTED_STATS_PATH, "utf8");
  return JSON.parse(raw);
}

function compareStats(expected, actual) {
  const fields = [
    "tagged_outputs",
    "method_families_represented",
    "avg_method_tags_per_output",
    "avg_theme_groups_per_output",
  ];

  const mismatches = [];
  for (const field of fields) {
    if (!(field in expected)) {
      mismatches.push(`${field}: missing in expected stats file`);
      continue;
    }

    const expectedValue = Number(expected[field]);
    const actualValue = Number(actual[field]);
    const isAverage = field.startsWith("avg_");

    if (!Number.isFinite(expectedValue)) {
      mismatches.push(`${field}: expected value is not numeric (${expected[field]})`);
      continue;
    }

    if (isAverage) {
      if (Math.abs(expectedValue - actualValue) > 1e-9) {
        mismatches.push(`${field}: expected=${expectedValue.toFixed(2)} actual=${actualValue.toFixed(2)}`);
      }
    } else if (expectedValue !== actualValue) {
      mismatches.push(`${field}: expected=${expectedValue} actual=${actualValue}`);
    }
  }
  return mismatches;
}

function main() {
  const actual = computeBraidStats();

  if (WRITE_MODE) {
    fs.writeFileSync(EXPECTED_STATS_PATH, JSON.stringify(actual, null, 2) + "\n");
    console.log(`wrote=${EXPECTED_STATS_PATH}`);
    console.log("status=ok");
    return;
  }

  const expected = readExpectedStats();
  if (!expected) {
    console.error(`Missing expected stats file: ${EXPECTED_STATS_PATH}`);
    console.error("Run this to generate it:");
    console.error("  node scripts/qa/validate-publications-interdisciplinarity-stats.mjs --write");
    process.exit(1);
  }

  const mismatches = compareStats(expected, actual);
  console.log(`tagged_outputs=${actual.tagged_outputs}`);
  console.log(`method_families_represented=${actual.method_families_represented}`);
  console.log(`avg_method_tags_per_output=${actual.avg_method_tags_per_output.toFixed(2)}`);
  console.log(`avg_theme_groups_per_output=${actual.avg_theme_groups_per_output.toFixed(2)}`);

  if (JSON_MODE) {
    console.log(JSON.stringify(actual, null, 2));
  }

  if (mismatches.length > 0) {
    console.error("status=fail");
    for (const mismatch of mismatches) {
      console.error(`mismatch: ${mismatch}`);
    }
    console.error("Regenerate expected stats with:");
    console.error("  node scripts/qa/validate-publications-interdisciplinarity-stats.mjs --write");
    process.exit(1);
  }

  console.log("status=ok");
}

main();

#!/usr/bin/env node

import fs from "fs";
import path from "path";

const PUBLICATIONS_DIR = "_publications";
const TAXONOMY_PATH = "_data/publication_tags.yml";

function parseFrontMatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  return match ? match[1] : null;
}

function cleanYamlScalar(value) {
  return value.trim().replace(/^["']|["']$/g, "").trim();
}

function parseTaxonomy(raw) {
  const lines = raw.split("\n");
  const typeValues = new Set();
  const tagValues = new Set();
  let section = null;

  for (const line of lines) {
    if (/^type_values:\s*$/.test(line)) {
      section = "type_values";
      continue;
    }
    if (/^tags:\s*$/.test(line)) {
      section = "tags";
      continue;
    }
    if (/^[A-Za-z0-9_-]+:\s*$/.test(line)) {
      section = null;
    }

    if (section === "type_values") {
      const m = line.match(/^\s*-\s*([a-z0-9-]+)\s*$/);
      if (m) typeValues.add(m[1]);
    } else if (section === "tags") {
      const m = line.match(/^\s*-\s*slug:\s*([a-z0-9-]+)\s*$/);
      if (m) tagValues.add(m[1]);
    }
  }

  return { typeValues, tagValues };
}

function extractType(frontMatter) {
  const match = frontMatter.match(/^type:\s*(.+)\s*$/m);
  if (!match) return null;
  return cleanYamlScalar(match[1]);
}

function extractTags(frontMatter) {
  const inlineMatch = frontMatter.match(/^tags:\s*\[(.*)\]\s*$/m);
  if (inlineMatch) {
    return inlineMatch[1]
      .split(",")
      .map((item) => cleanYamlScalar(item))
      .filter(Boolean);
  }

  const lines = frontMatter.split("\n");
  const start = lines.findIndex((line) => /^tags:\s*$/.test(line));
  if (start === -1) return null;

  const tags = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^[A-Za-z0-9_-]+:\s*/.test(line)) break;
    const m = line.match(/^\s*-\s*(.+)\s*$/);
    if (!m) {
      if (line.trim() === "") continue;
      break;
    }
    tags.push(cleanYamlScalar(m[1]));
  }

  return tags;
}

function main() {
  if (!fs.existsSync(TAXONOMY_PATH)) {
    console.error(`Missing taxonomy file: ${TAXONOMY_PATH}`);
    process.exit(2);
  }
  if (!fs.existsSync(PUBLICATIONS_DIR)) {
    console.error(`Missing publications directory: ${PUBLICATIONS_DIR}`);
    process.exit(2);
  }

  const taxonomyRaw = fs.readFileSync(TAXONOMY_PATH, "utf8");
  const { typeValues, tagValues } = parseTaxonomy(taxonomyRaw);
  if (typeValues.size === 0 || tagValues.size === 0) {
    console.error("Taxonomy parse failed: missing type_values or tags.");
    process.exit(2);
  }

  const files = fs
    .readdirSync(PUBLICATIONS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const failures = [];
  const usedTags = new Set();

  for (const file of files) {
    const fullPath = path.join(PUBLICATIONS_DIR, file);
    const raw = fs.readFileSync(fullPath, "utf8");
    const fm = parseFrontMatter(raw);

    if (!fm) {
      failures.push({ file, errors: ["missing front matter"] });
      continue;
    }

    const typeValue = extractType(fm);
    const tags = extractTags(fm);
    const errors = [];

    if (!typeValue) {
      errors.push("missing type");
    } else if (!typeValues.has(typeValue)) {
      errors.push(`invalid type=${typeValue}`);
    }

    if (!tags) {
      errors.push("missing tags");
    } else if (tags.length === 0) {
      errors.push("empty tags list");
    } else {
      const seen = new Set();
      for (const tag of tags) {
        if (seen.has(tag)) {
          errors.push(`duplicate tag=${tag}`);
          continue;
        }
        seen.add(tag);
        if (!/^[a-z0-9-]+$/.test(tag)) {
          errors.push(`invalid slug format=${tag}`);
        }
        if (typeValues.has(tag)) {
          errors.push(`tag repeats type namespace=${tag}`);
        }
        if (!tagValues.has(tag)) {
          errors.push(`unknown tag=${tag}`);
        } else {
          usedTags.add(tag);
        }
      }
    }

    if (errors.length > 0) failures.push({ file, errors });
  }

  console.log(`files_checked=${files.length}`);
  console.log(`canonical_type_values=${typeValues.size}`);
  console.log(`canonical_tags=${tagValues.size}`);
  console.log(`tags_used_in_publications=${usedTags.size}`);

  if (failures.length > 0) {
    console.log(`failures=${failures.length}`);
    for (const failure of failures) {
      console.log(`${failure.file}\t${failure.errors.join("; ")}`);
    }
    process.exit(1);
  }

  console.log("status=ok");
}

main();

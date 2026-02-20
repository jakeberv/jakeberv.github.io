#!/usr/bin/env node

import fs from "fs";
import path from "path";

const PUBLICATIONS_DIR = "_publications";
const TAXONOMY_PATH = "_data/research_method_tags.yml";
const ALLOWED_CONFIDENCE = new Set(["high", "medium", "low"]);
const FAIL_ON_UNTAGGED = process.argv.includes("--fail-on-untagged");
const ALLOW_UNTAGGED = process.argv.includes("--allow-untagged");
const ENFORCEMENT_START_DATE = process.env.METHOD_TAG_ENFORCEMENT_START || "2026-02-19";

function parseFrontMatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  return match ? match[1] : null;
}

function cleanYamlScalar(value) {
  return value.trim().replace(/^["']|["']$/g, "").trim();
}

function extractScalar(frontMatter, key) {
  const re = new RegExp(`^${key}:\\s*(.+)\\s*$`, "m");
  const match = frontMatter.match(re);
  if (!match) return null;
  return cleanYamlScalar(match[1]);
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
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
    const m = line.match(/^\s*-\s*(.+)\s*$/);
    if (m) {
      values.push(cleanYamlScalar(m[1]));
      continue;
    }
    if (line.trim() === "") continue;
    break;
  }
  return values;
}

function parseInlineList(raw) {
  return raw
    .split(",")
    .map((item) => cleanYamlScalar(item))
    .filter(Boolean);
}

function parseTaxonomy(raw) {
  const lines = raw.split("\n");
  const familyIds = new Set();
  const tagToFamily = new Map();
  const tagRequiresAny = new Map();
  const familyRequiresAny = new Map();

  let section = null;
  let currentFamilyId = null;
  let currentTagId = null;

  for (const line of lines) {
    if (/^method_families:\s*$/.test(line)) {
      section = "method_families";
      currentFamilyId = null;
      currentTagId = null;
      continue;
    }
    if (/^tags:\s*$/.test(line)) {
      section = "tags";
      currentFamilyId = null;
      currentTagId = null;
      continue;
    }
    if (/^[A-Za-z0-9_]+:\s*$/.test(line) && !line.startsWith(" ")) {
      section = null;
      currentFamilyId = null;
      currentTagId = null;
      continue;
    }

    if (section === "method_families") {
      const familyMatch = line.match(/^\s*-\s*id:\s*([A-Za-z0-9_-]+)\s*$/);
      if (familyMatch) {
        currentFamilyId = familyMatch[1];
        familyIds.add(currentFamilyId);
        continue;
      }
      const familyRequiresMatch = line.match(/^\s*requires_any_tags:\s*\[(.*)\]\s*$/);
      if (familyRequiresMatch && currentFamilyId) {
        familyRequiresAny.set(currentFamilyId, parseInlineList(familyRequiresMatch[1]));
      }
      continue;
    }

    if (section === "tags") {
      const tagMatch = line.match(/^\s*-\s*id:\s*([A-Za-z0-9_-]+)\s*$/);
      if (tagMatch) {
        currentTagId = tagMatch[1];
        tagRequiresAny.set(currentTagId, []);
        continue;
      }
      const familyMatch = line.match(/^\s*method_family:\s*([A-Za-z0-9_-]+)\s*$/);
      if (familyMatch && currentTagId) {
        tagToFamily.set(currentTagId, familyMatch[1]);
        continue;
      }
      const requiresAnyMatch = line.match(/^\s*requires_any:\s*\[(.*)\]\s*$/);
      if (requiresAnyMatch && currentTagId) {
        tagRequiresAny.set(currentTagId, parseInlineList(requiresAnyMatch[1]));
      }
    }
  }

  return { familyIds, tagToFamily, tagRequiresAny, familyRequiresAny };
}

function listWithCounts(items) {
  return [...items.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}:${v}`)
    .join(", ");
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
  const { familyIds, tagToFamily, tagRequiresAny, familyRequiresAny } = parseTaxonomy(taxonomyRaw);
  if (familyIds.size === 0 || tagToFamily.size === 0) {
    console.error("Taxonomy parse failed: missing method_families and/or tags.");
    process.exit(2);
  }

  const files = fs
    .readdirSync(PUBLICATIONS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const failures = [];
  const untagged = [];
  const untaggedRequired = [];
  let taggedCount = 0;
  const confidenceCounts = new Map();

  for (const file of files) {
    const fullPath = path.join(PUBLICATIONS_DIR, file);
    const raw = fs.readFileSync(fullPath, "utf8");
    const fm = parseFrontMatter(raw);

    if (!fm) {
      failures.push({ file, errors: ["missing front matter"] });
      continue;
    }

    const methodFamilies = extractList(fm, "method_families");
    const methodTags = extractList(fm, "method_tags");
    const confidence = extractScalar(fm, "method_tag_confidence");
    const pubDate = extractScalar(fm, "date");
    const hasAnyMethodFields = methodFamilies !== null || methodTags !== null || confidence !== null;

    if (!hasAnyMethodFields) {
      untagged.push(file);

      if (ALLOW_UNTAGGED) {
        continue;
      }

      if (FAIL_ON_UNTAGGED) {
        untaggedRequired.push(file);
        continue;
      }

      if (!pubDate || !isIsoDate(pubDate)) {
        failures.push({
          file,
          errors: ["missing method fields and invalid/missing date for policy check (expected YYYY-MM-DD)"],
        });
        continue;
      }

      if (pubDate >= ENFORCEMENT_START_DATE) {
        untaggedRequired.push(file);
      }
      continue;
    }

    const errors = [];

    if (!methodFamilies) {
      errors.push("missing method_families");
    } else if (methodFamilies.length === 0) {
      errors.push("empty method_families");
    }

    if (!methodTags) {
      errors.push("missing method_tags");
    } else if (methodTags.length === 0) {
      errors.push("empty method_tags");
    }

    if (!confidence) {
      errors.push("missing method_tag_confidence");
    } else if (!ALLOWED_CONFIDENCE.has(confidence)) {
      errors.push(`invalid method_tag_confidence=${confidence}`);
    }

    const familySet = new Set();
    if (methodFamilies) {
      for (const familyId of methodFamilies) {
        if (familySet.has(familyId)) {
          errors.push(`duplicate method_family=${familyId}`);
          continue;
        }
        familySet.add(familyId);
        if (!familyIds.has(familyId)) {
          errors.push(`unknown method_family=${familyId}`);
        }
      }
    }

    const tagSet = new Set();
    const representedFamilySet = new Set();
    if (methodTags) {
      for (const tagId of methodTags) {
        if (tagSet.has(tagId)) {
          errors.push(`duplicate method_tag=${tagId}`);
          continue;
        }
        tagSet.add(tagId);

        const expectedFamily = tagToFamily.get(tagId);
        if (!expectedFamily) {
          errors.push(`unknown method_tag=${tagId}`);
          continue;
        }
        representedFamilySet.add(expectedFamily);
        if (!familySet.has(expectedFamily)) {
          errors.push(`method_tag=${tagId} requires method_family=${expectedFamily}`);
        }
      }
    }

    for (const familyId of familySet) {
      if (!representedFamilySet.has(familyId)) {
        errors.push(`method_family=${familyId} has no matching method_tags`);
      }
      const requiresAnyTags = familyRequiresAny.get(familyId) || [];
      if (requiresAnyTags.length > 0 && !requiresAnyTags.some((tagId) => tagSet.has(tagId))) {
        errors.push(`method_family=${familyId} requires one of tags=[${requiresAnyTags.join(",")}]`);
      }
    }

    for (const tagId of tagSet) {
      const requiresAnyTags = tagRequiresAny.get(tagId) || [];
      if (requiresAnyTags.length > 0 && !requiresAnyTags.some((requiredTag) => tagSet.has(requiredTag))) {
        errors.push(`method_tag=${tagId} requires co-tag one of [${requiresAnyTags.join(",")}]`);
      }
    }

    if (errors.length > 0) {
      failures.push({ file, errors });
      continue;
    }

    taggedCount += 1;
    confidenceCounts.set(confidence, (confidenceCounts.get(confidence) || 0) + 1);
  }

  console.log(`files_checked=${files.length}`);
  console.log(`tagged_publications=${taggedCount}`);
  console.log(`untagged_publications=${untagged.length}`);
  console.log(`untagged_required_publications=${untaggedRequired.length}`);
  console.log(`canonical_method_families=${familyIds.size}`);
  console.log(`canonical_method_tags=${tagToFamily.size}`);
  console.log(`enforcement_start_date=${ENFORCEMENT_START_DATE}`);
  console.log(`enforcement_mode=${ALLOW_UNTAGGED ? "allow_untagged" : FAIL_ON_UNTAGGED ? "strict_all_untagged" : "forward_policy"}`);
  console.log(`confidence_distribution=${listWithCounts(confidenceCounts) || "none"}`);

  if (untagged.length > 0) {
    console.log("untagged_files=");
    for (const file of untagged) console.log(`  - ${file}`);
  }

  if (failures.length > 0) {
    console.log(`failures=${failures.length}`);
    for (const failure of failures) {
      console.log(`${failure.file}\t${failure.errors.join("; ")}`);
    }
    process.exit(1);
  }

  if (!ALLOW_UNTAGGED && untaggedRequired.length > 0) {
    console.log("required_untagged_files=");
    for (const file of untaggedRequired) console.log(`  - ${file}`);
    console.log("status=fail_on_required_untagged");
    process.exit(1);
  }

  console.log("status=ok");
}

main();

#!/usr/bin/env node

import fs from "fs";
import path from "path";

const PUBLICATIONS_DIR = "_publications";
const TAXONOMY_PATH = "_data/research_method_tags.yml";
const AS_JSON = process.argv.includes("--json");

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

function parseTaxonomy(raw) {
  const lines = raw.split("\n");
  const familyLabels = new Map();
  const tagLabels = new Map();
  const tagToFamily = new Map();

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
      const familyIdMatch = line.match(/^\s*-\s*id:\s*([A-Za-z0-9_-]+)\s*$/);
      if (familyIdMatch) {
        currentFamilyId = familyIdMatch[1];
        familyLabels.set(currentFamilyId, currentFamilyId);
        continue;
      }
      const familyLabelMatch = line.match(/^\s*label:\s*(.+)\s*$/);
      if (familyLabelMatch && currentFamilyId) {
        familyLabels.set(currentFamilyId, cleanYamlScalar(familyLabelMatch[1]));
      }
      continue;
    }

    if (section === "tags") {
      const tagIdMatch = line.match(/^\s*-\s*id:\s*([A-Za-z0-9_-]+)\s*$/);
      if (tagIdMatch) {
        currentTagId = tagIdMatch[1];
        tagLabels.set(currentTagId, currentTagId);
        continue;
      }
      const tagLabelMatch = line.match(/^\s*label:\s*(.+)\s*$/);
      if (tagLabelMatch && currentTagId) {
        tagLabels.set(currentTagId, cleanYamlScalar(tagLabelMatch[1]));
        continue;
      }
      const familyMatch = line.match(/^\s*method_family:\s*([A-Za-z0-9_-]+)\s*$/);
      if (familyMatch && currentTagId) {
        tagToFamily.set(currentTagId, familyMatch[1]);
      }
    }
  }

  return { familyLabels, tagLabels, tagToFamily };
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function avg(numbers) {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

function sortedMapEntries(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function formatMap(map, limit = null) {
  const items = sortedMapEntries(map);
  const sliced = limit ? items.slice(0, limit) : items;
  return sliced.map(([k, v]) => `${k}:${v}`).join(", ");
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
  const { familyLabels, tagLabels, tagToFamily } = parseTaxonomy(taxonomyRaw);
  if (familyLabels.size === 0 || tagToFamily.size === 0) {
    console.error("Taxonomy parse failed: missing method_families and/or tags.");
    process.exit(2);
  }

  const files = fs
    .readdirSync(PUBLICATIONS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const confidenceCounts = new Map();
  const familyPaperCounts = new Map();
  const tagPaperCounts = new Map();
  const tagsUsedByFamily = new Map();
  const methodFieldsIncomplete = [];
  const malformedFrontMatter = [];
  const untaggedFiles = [];
  const unknownFamilyIds = new Set();
  const unknownTagIds = new Set();
  const taggedMethodCounts = [];
  const taggedFamilyCounts = [];

  for (const file of files) {
    const fullPath = path.join(PUBLICATIONS_DIR, file);
    const raw = fs.readFileSync(fullPath, "utf8");
    const fm = parseFrontMatter(raw);
    if (!fm) {
      malformedFrontMatter.push(file);
      continue;
    }

    const methodFamilies = extractList(fm, "method_families");
    const methodTags = extractList(fm, "method_tags");
    const confidence = extractScalar(fm, "method_tag_confidence");
    const hasAnyMethodFields = methodFamilies !== null || methodTags !== null || confidence !== null;

    if (!hasAnyMethodFields) {
      untaggedFiles.push(file);
      continue;
    }

    const missingFields = [];
    if (methodFamilies === null) missingFields.push("method_families");
    if (methodTags === null) missingFields.push("method_tags");
    if (confidence === null) missingFields.push("method_tag_confidence");
    if (missingFields.length > 0) {
      methodFieldsIncomplete.push({ file, missing: missingFields });
    }

    if (confidence) increment(confidenceCounts, confidence);

    const familySet = new Set((methodFamilies || []).filter(Boolean));
    const tagSet = new Set((methodTags || []).filter(Boolean));

    taggedFamilyCounts.push(familySet.size);
    taggedMethodCounts.push(tagSet.size);

    for (const familyId of familySet) {
      if (!familyLabels.has(familyId)) {
        unknownFamilyIds.add(familyId);
        continue;
      }
      increment(familyPaperCounts, familyId);
    }

    for (const tagId of tagSet) {
      const familyId = tagToFamily.get(tagId);
      if (!familyId) {
        unknownTagIds.add(tagId);
        continue;
      }
      increment(tagPaperCounts, tagId);
      if (!tagsUsedByFamily.has(familyId)) tagsUsedByFamily.set(familyId, new Set());
      tagsUsedByFamily.get(familyId).add(tagId);
    }
  }

  const canonicalFamilyIds = [...familyLabels.keys()];
  const canonicalTagIds = [...tagToFamily.keys()];
  const usedFamilyIds = new Set(familyPaperCounts.keys());
  const usedTagIds = new Set(tagPaperCounts.keys());
  const unusedFamilies = canonicalFamilyIds.filter((id) => !usedFamilyIds.has(id));
  const unusedTags = canonicalTagIds.filter((id) => !usedTagIds.has(id));

  const familyTagTotals = new Map();
  for (const [tagId, familyId] of tagToFamily.entries()) {
    increment(familyTagTotals, familyId);
    if (!tagsUsedByFamily.has(familyId)) tagsUsedByFamily.set(familyId, new Set());
  }

  const familyCoverage = canonicalFamilyIds
    .map((familyId) => {
      const usedInFamily = tagsUsedByFamily.get(familyId) || new Set();
      return {
        family_id: familyId,
        family_label: familyLabels.get(familyId),
        papers: familyPaperCounts.get(familyId) || 0,
        tags_used: usedInFamily.size,
        tags_total: familyTagTotals.get(familyId) || 0,
      };
    })
    .sort((a, b) => b.papers - a.papers || a.family_id.localeCompare(b.family_id));

  const filesWithAnyMethodData =
    files.length - untaggedFiles.length - malformedFrontMatter.length;
  const summary = {
    files_total: files.length,
    malformed_front_matter: malformedFrontMatter.length,
    files_with_any_method_fields: filesWithAnyMethodData,
    files_without_method_fields: untaggedFiles.length,
    files_with_incomplete_method_fields: methodFieldsIncomplete.length,
    canonical_method_families: canonicalFamilyIds.length,
    canonical_method_tags: canonicalTagIds.length,
    used_method_families: usedFamilyIds.size,
    used_method_tags: usedTagIds.size,
    used_method_families_pct:
      canonicalFamilyIds.length === 0 ? 0 : (usedFamilyIds.size / canonicalFamilyIds.length) * 100,
    used_method_tags_pct:
      canonicalTagIds.length === 0 ? 0 : (usedTagIds.size / canonicalTagIds.length) * 100,
    avg_method_families_per_tagged_file: avg(taggedFamilyCounts),
    avg_method_tags_per_tagged_file: avg(taggedMethodCounts),
  };

  if (AS_JSON) {
    const payload = {
      summary,
      confidence_distribution: sortedMapEntries(confidenceCounts).map(([id, count]) => ({
        id,
        count,
      })),
      top_method_families: sortedMapEntries(familyPaperCounts).map(([id, papers]) => ({
        id,
        label: familyLabels.get(id) || id,
        papers,
      })),
      top_method_tags: sortedMapEntries(tagPaperCounts).map(([id, papers]) => ({
        id,
        label: tagLabels.get(id) || id,
        family_id: tagToFamily.get(id) || "",
        papers,
      })),
      family_coverage: familyCoverage,
      unused_method_families: unusedFamilies,
      unused_method_tags: unusedTags,
      unknown_method_families: [...unknownFamilyIds].sort(),
      unknown_method_tags: [...unknownTagIds].sort(),
      files_missing_front_matter: malformedFrontMatter,
      files_without_method_fields: untaggedFiles,
      files_with_incomplete_method_fields: methodFieldsIncomplete,
    };
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`files_total=${summary.files_total}`);
  console.log(`malformed_front_matter=${summary.malformed_front_matter}`);
  console.log(`files_with_any_method_fields=${summary.files_with_any_method_fields}`);
  console.log(`files_without_method_fields=${summary.files_without_method_fields}`);
  console.log(`files_with_incomplete_method_fields=${summary.files_with_incomplete_method_fields}`);
  console.log(`canonical_method_families=${summary.canonical_method_families}`);
  console.log(`canonical_method_tags=${summary.canonical_method_tags}`);
  console.log(
    `used_method_families=${summary.used_method_families} (${summary.used_method_families_pct.toFixed(1)}%)`
  );
  console.log(
    `used_method_tags=${summary.used_method_tags} (${summary.used_method_tags_pct.toFixed(1)}%)`
  );
  console.log(
    `avg_method_families_per_tagged_file=${summary.avg_method_families_per_tagged_file.toFixed(2)}`
  );
  console.log(
    `avg_method_tags_per_tagged_file=${summary.avg_method_tags_per_tagged_file.toFixed(2)}`
  );
  console.log(`confidence_distribution=${formatMap(confidenceCounts) || "none"}`);
  console.log(`top_method_families=${formatMap(familyPaperCounts, 12) || "none"}`);
  console.log(`top_method_tags=${formatMap(tagPaperCounts, 20) || "none"}`);

  if (unusedFamilies.length > 0) {
    console.log("unused_method_families=");
    for (const id of unusedFamilies) {
      console.log(`  - ${id}`);
    }
  }

  if (unusedTags.length > 0) {
    console.log("unused_method_tags=");
    for (const id of unusedTags) {
      console.log(`  - ${id}`);
    }
  }

  if (methodFieldsIncomplete.length > 0) {
    console.log("incomplete_method_fields=");
    for (const item of methodFieldsIncomplete) {
      console.log(`  - ${item.file}: missing ${item.missing.join(", ")}`);
    }
  }

  if (untaggedFiles.length > 0) {
    console.log("files_without_method_fields_list=");
    for (const file of untaggedFiles) {
      console.log(`  - ${file}`);
    }
  }

  if (malformedFrontMatter.length > 0) {
    console.log("files_missing_front_matter=");
    for (const file of malformedFrontMatter) {
      console.log(`  - ${file}`);
    }
  }

  if (unknownFamilyIds.size > 0) {
    console.log("unknown_method_family_ids=");
    for (const id of [...unknownFamilyIds].sort()) {
      console.log(`  - ${id}`);
    }
  }

  if (unknownTagIds.size > 0) {
    console.log("unknown_method_tag_ids=");
    for (const id of [...unknownTagIds].sort()) {
      console.log(`  - ${id}`);
    }
  }

  console.log("family_tag_coverage=");
  for (const row of familyCoverage) {
    console.log(
      `  - ${row.family_id}: papers=${row.papers}, tags_used=${row.tags_used}/${row.tags_total}`
    );
  }
}

main();

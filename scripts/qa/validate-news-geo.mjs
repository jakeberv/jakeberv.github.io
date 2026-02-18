#!/usr/bin/env node

import fs from "fs";
import path from "path";

const NEWS_DIR = "_news";
const ALLOWED_SCOPES = new Set(["event", "virtual", "global"]);

function parseFrontMatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  return match ? match[1] : null;
}

function extractGeoBlock(frontMatter) {
  const lines = frontMatter.split("\n");
  const geoStart = lines.findIndex((line) => line.trim() === "geo:");
  if (geoStart === -1) return null;

  const block = [lines[geoStart]];
  for (let i = geoStart + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^[A-Za-z0-9_-]+:\s*/.test(line)) break;
    block.push(line);
  }
  return block;
}

function validateGeoBlock(block) {
  const errors = [];
  const joined = block.join("\n");

  const versionMatch = joined.match(/^  version:\s*(\d+)\s*$/m);
  if (!versionMatch) {
    errors.push("missing geo.version");
  } else if (Number(versionMatch[1]) !== 1) {
    errors.push(`unsupported geo.version=${versionMatch[1]}`);
  }

  const scopeMatch = joined.match(/^  scope:\s*([a-z_]+)\s*$/m);
  if (!scopeMatch) {
    errors.push("missing geo.scope");
  } else if (!ALLOWED_SCOPES.has(scopeMatch[1])) {
    errors.push(`invalid geo.scope=${scopeMatch[1]}`);
  }

  if (!/^  countries:\s*$/m.test(joined)) {
    errors.push("missing geo.countries");
  }

  const hasLocalitiesEmpty = /^  localities:\s*\[\]\s*$/m.test(joined);
  const hasLocalitiesBlock = /^  localities:\s*$/m.test(joined);
  if (!hasLocalitiesEmpty && !hasLocalitiesBlock) {
    errors.push("missing geo.localities");
  }

  const countryCodes = [];
  for (const line of block) {
    const codeMatch = line.match(/^    - code:\s*([A-Z]{2})\s*$/);
    if (codeMatch) countryCodes.push(codeMatch[1]);
  }

  const regionLines = block.filter((line) =>
    /^\s+region_m49:\s*["']?\d{3}["']?\s*$/.test(line)
  );

  if (scopeMatch && scopeMatch[1] !== "global" && countryCodes.length === 0) {
    errors.push("no countries for non-global scope");
  }

  if (countryCodes.length > 0 && regionLines.length < countryCodes.length) {
    errors.push("missing region_m49 on one or more countries");
  }

  let localitiesCount = 0;
  if (hasLocalitiesBlock) {
    const localitiesStart = block.findIndex(
      (line) => line.trim() === "localities:"
    );
    if (localitiesStart === -1) {
      errors.push("invalid localities block");
    } else {
      const localitiesLines = block.slice(localitiesStart + 1);
      const nameCount = localitiesLines.filter((line) =>
        /^    - name:\s*".*"\s*$/.test(line)
      ).length;
      const countryCount = localitiesLines.filter((line) =>
        /^      country_code:\s*[A-Z]{2}\s*$/.test(line)
      ).length;
      const latCount = localitiesLines.filter((line) =>
        /^      lat:\s*-?\d+(\.\d+)?\s*$/.test(line)
      ).length;
      const lonCount = localitiesLines.filter((line) =>
        /^      lon:\s*-?\d+(\.\d+)?\s*$/.test(line)
      ).length;

      localitiesCount = nameCount;
      if (nameCount === 0) {
        errors.push("localities block has no entries");
      }
      if (
        countryCount !== nameCount ||
        latCount !== nameCount ||
        lonCount !== nameCount
      ) {
        errors.push("one or more localities missing required fields");
      }
    }
  }

  return {
    errors,
    countryCodes,
    scope: scopeMatch ? scopeMatch[1] : null,
    localitiesCount,
    localitiesEmpty: hasLocalitiesEmpty,
  };
}

function main() {
  const files = fs
    .readdirSync(NEWS_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort();

  const failures = [];
  const scopeCounts = {};
  const countryCounts = {};
  let localitiesTotal = 0;
  let localitiesEmptyEntries = 0;

  for (const file of files) {
    const fullPath = path.join(NEWS_DIR, file);
    const raw = fs.readFileSync(fullPath, "utf8");
    const fm = parseFrontMatter(raw);

    if (!fm) {
      failures.push({ file, errors: ["missing front matter"] });
      continue;
    }

    const geoBlock = extractGeoBlock(fm);
    if (!geoBlock) {
      failures.push({ file, errors: ["missing geo block"] });
      continue;
    }

    const { errors, countryCodes, scope, localitiesCount, localitiesEmpty } =
      validateGeoBlock(geoBlock);
    if (errors.length > 0) {
      failures.push({ file, errors });
      continue;
    }

    scopeCounts[scope] = (scopeCounts[scope] || 0) + 1;
    for (const code of countryCodes) {
      countryCounts[code] = (countryCounts[code] || 0) + 1;
    }
    localitiesTotal += localitiesCount;
    if (localitiesEmpty) {
      localitiesEmptyEntries += 1;
    }
  }

  console.log(`files_checked=${files.length}`);
  console.log(
    `scopes=${Object.entries(scopeCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k}:${v}`)
      .join(",")}`
  );
  console.log(
    `countries=${Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${v}`)
      .join(",")}`
  );
  console.log(`localities_total=${localitiesTotal}`);
  console.log(`localities_empty_entries=${localitiesEmptyEntries}`);

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

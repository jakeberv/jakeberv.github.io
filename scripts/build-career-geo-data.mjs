#!/usr/bin/env node

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const NEWS_DIR = path.join(ROOT, "_news");
const OUT_DIR = path.join(ROOT, "data", "career_geo");
const OUT_FILE = path.join(OUT_DIR, "career_footprint.json");
const EXCERPT_MARKER = "<!--news-excerpt-->";
const ALLOWED_SCOPES = new Set(["event", "virtual", "global"]);

let regionDisplayNames = null;
if (typeof Intl !== "undefined" && Intl.DisplayNames) {
  regionDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });
}

function parseFrontMatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  return { frontMatter: match[1], body: match[2] || "" };
}

function parseScalar(frontMatter, key) {
  const re = new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m");
  const match = frontMatter.match(re);
  if (!match) return null;
  return stripQuotes(match[1].trim());
}

function stripQuotes(value) {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
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

function parseGeoBlock(geoBlockLines) {
  const joined = geoBlockLines.join("\n");
  const scopeMatch = joined.match(/^  scope:\s*([a-z_]+)\s*$/m);
  const rawScope = scopeMatch && ALLOWED_SCOPES.has(scopeMatch[1]) ? scopeMatch[1] : "event";
  const scope = rawScope === "global" ? "virtual" : rawScope;

  const countries = [];
  const localities = [];

  let inCountries = false;
  let inLocalities = false;
  let currentCountry = null;
  let currentLocality = null;

  for (const line of geoBlockLines) {
    if (line.trim() === "countries:") {
      inCountries = true;
      inLocalities = false;
      currentCountry = null;
      continue;
    }

    if (/^  localities:\s*\[\]\s*$/.test(line)) {
      inCountries = false;
      inLocalities = false;
      currentCountry = null;
      currentLocality = null;
      continue;
    }

    if (line.trim() === "localities:") {
      inCountries = false;
      inLocalities = true;
      currentCountry = null;
      currentLocality = null;
      continue;
    }

    if (inCountries) {
      const codeMatch = line.match(/^    - code:\s*([A-Z]{2})\s*$/);
      if (codeMatch) {
        currentCountry = {
          code: codeMatch[1],
          name: countryName(codeMatch[1]),
          region_m49: null,
          weight: 1,
        };
        countries.push(currentCountry);
        continue;
      }

      if (!currentCountry) continue;

      const regionMatch = line.match(/^      region_m49:\s*["']?(\d{3})["']?\s*$/);
      if (regionMatch) {
        currentCountry.region_m49 = regionMatch[1];
        continue;
      }

      const weightMatch = line.match(/^      weight:\s*([0-9]+(?:\.[0-9]+)?)\s*$/);
      if (weightMatch) {
        currentCountry.weight = Number(weightMatch[1]);
      }
      continue;
    }

    if (inLocalities) {
      const nameMatch = line.match(/^    - name:\s*(?:"([^"]*)"|'([^']*)'|(.*\S))\s*$/);
      if (nameMatch) {
        const rawName = (nameMatch[1] ?? nameMatch[2] ?? nameMatch[3] ?? "").trim();
        currentLocality = {
          name: rawName,
          country_code: null,
          lat: null,
          lon: null,
          weight: 1,
        };
        localities.push(currentLocality);
        continue;
      }

      if (!currentLocality) continue;

      const countryMatch = line.match(/^      country_code:\s*([A-Z]{2})\s*$/);
      if (countryMatch) {
        currentLocality.country_code = countryMatch[1];
        continue;
      }

      const latMatch = line.match(/^      lat:\s*(-?[0-9]+(?:\.[0-9]+)?)\s*$/);
      if (latMatch) {
        currentLocality.lat = Number(latMatch[1]);
        continue;
      }

      const lonMatch = line.match(/^      lon:\s*(-?[0-9]+(?:\.[0-9]+)?)\s*$/);
      if (lonMatch) {
        currentLocality.lon = Number(lonMatch[1]);
        continue;
      }

      const weightMatch = line.match(/^      weight:\s*([0-9]+(?:\.[0-9]+)?)\s*$/);
      if (weightMatch) {
        currentLocality.weight = Number(weightMatch[1]);
      }
    }
  }

  return {
    scope,
    countries: countries
      .filter((row) => row.code && row.region_m49)
      .map((row) => ({
        code: row.code,
        name: row.name,
        region_m49: String(row.region_m49).padStart(3, "0"),
        weight: Number(row.weight || 1),
      })),
    localities: localities
      .filter(
        (row) =>
          row.name &&
          row.country_code &&
          Number.isFinite(row.lat) &&
          Number.isFinite(row.lon)
      )
      .map((row) => ({
        name: row.name,
        country_code: row.country_code,
        lat: Number(row.lat),
        lon: Number(row.lon),
        weight: Number(row.weight || 1),
      })),
  };
}

function countryName(code) {
  if (!regionDisplayNames) return code;
  return regionDisplayNames.of(code) || code;
}

function normalizeDate(rawDate, fallbackFromFilename) {
  const fromField = rawDate ? String(rawDate) : "";
  const fromFieldMatch = fromField.match(/^(\d{4}-\d{2}-\d{2})/);
  if (fromFieldMatch) return fromFieldMatch[1];

  const fromFilenameMatch = fallbackFromFilename.match(/^(\d{4}-\d{2}-\d{2})/);
  if (fromFilenameMatch) return fromFilenameMatch[1];

  return "1900-01-01";
}

function cleanText(value) {
  return String(value)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[_*`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildExcerpt(body) {
  if (!body) return "";
  const markerIndex = body.indexOf(EXCERPT_MARKER);
  const source = markerIndex >= 0 ? body.slice(markerIndex + EXCERPT_MARKER.length) : body;
  const paragraph = source
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!paragraph) return "";
  const clean = cleanText(paragraph);
  return clean.length > 240 ? `${clean.slice(0, 237)}...` : clean;
}

function main() {
  if (!fs.existsSync(NEWS_DIR)) {
    throw new Error(`Missing news directory: ${NEWS_DIR}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const files = fs
    .readdirSync(NEWS_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort();

  const entries = [];
  for (const file of files) {
    const fullPath = path.join(NEWS_DIR, file);
    const raw = fs.readFileSync(fullPath, "utf8");
    const parsed = parseFrontMatter(raw);
    if (!parsed) continue;

    const geoBlock = extractGeoBlock(parsed.frontMatter);
    if (!geoBlock) continue;

    const geo = parseGeoBlock(geoBlock);
    const id = file.replace(/\.md$/, "");
    const title = parseScalar(parsed.frontMatter, "title") || id;
    const date = normalizeDate(parseScalar(parsed.frontMatter, "date"), file);
    if (date > today) continue;
    const year = Number(date.slice(0, 4));

    entries.push({
      id,
      title,
      url: `/news/${id}/`,
      date,
      year: Number.isFinite(year) ? year : 1900,
      scope: geo.scope,
      countries: geo.countries,
      localities: geo.localities,
      excerpt: buildExcerpt(parsed.body),
    });
  }

  entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id.localeCompare(b.id)));

  const payload = {
    generated_at: new Date().toISOString(),
    source: "_news geo front matter",
    entry_count: entries.length,
    entries,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`wrote=${path.relative(ROOT, OUT_FILE)}`);
  console.log(`entries=${entries.length}`);
}

main();

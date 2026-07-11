#!/usr/bin/env node

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const NEWS_DIR = path.join(ROOT, "_news");
const OUT_DIR = path.join(ROOT, "data", "career_geo");
const OUT_FILE = path.join(OUT_DIR, "career_footprint.json");
const TALKMAP_OUT_FILE = path.join(ROOT, "data", "talkmap", "talk_events.json");
const EXCERPT_MARKER = "<!--news-excerpt-->";
const ALLOWED_SCOPES = new Set(["event", "virtual", "global"]);
const TALK_TAGS = new Set([
  "conference_talk",
  "invited_talk",
  "guest_lecture",
  "keynote",
  "workshop_led",
  "outreach",
]);

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

function parseList(frontMatter, key) {
  const lines = frontMatter.split("\n");
  const start = lines.findIndex((line) => line.trim() === `${key}:`);
  if (start === -1) return [];
  const values = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^[A-Za-z0-9_-]+:\s*/.test(line)) break;
    const match = line.match(/^\s+-\s+(.+?)\s*$/);
    if (match) values.push(stripQuotes(match[1].trim()));
  }
  return values;
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
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/(?:&#39;|&apos;)/gi, "'")
    .replace(/[_*`#>]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function stripHtml(value) {
  return String(value)
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ");
}

function buildExcerpt(body) {
  if (!body) return "";
  const markerIndex = body.indexOf(EXCERPT_MARKER);
  const source = markerIndex >= 0 ? body.slice(markerIndex + EXCERPT_MARKER.length) : body;
  const lines = stripHtml(source)
    .split("\n")
    .map((line) => cleanText(line));
  const paragraphLines = [];
  for (const line of lines) {
    if (line.length > 0) {
      paragraphLines.push(line);
    } else if (paragraphLines.length > 0) {
      break;
    }
  }
  const paragraph = cleanText(paragraphLines.join(" "));
  if (paragraph.length === 0) return "";
  if (paragraph.length <= 240) return paragraph;
  const prefix = paragraph.slice(0, 237);
  const wordBoundary = prefix.lastIndexOf(" ");
  return `${prefix.slice(0, wordBoundary > 0 ? wordBoundary : prefix.length)}...`;
}

function parseArguments(argv) {
  const options = {
    asOf: new Date().toISOString().slice(0, 10),
    fixedAsOf: false,
    careerOutput: OUT_FILE,
    talkmapOutput: TALKMAP_OUT_FILE,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (!["--as-of", "--career-output", "--talkmap-output"].includes(argument)) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    if (!value) throw new Error(`Missing value for ${argument}`);
    if (argument === "--as-of") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
        throw new Error(`Invalid --as-of date: ${value}`);
      }
      options.asOf = value;
      options.fixedAsOf = true;
    } else if (argument === "--career-output") {
      options.careerOutput = path.resolve(value);
    } else {
      options.talkmapOutput = path.resolve(value);
    }
    index += 1;
  }
  return options;
}

function writeJson(target, payload) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);
}

function main() {
  if (!fs.existsSync(NEWS_DIR)) {
    throw new Error(`Missing news directory: ${NEWS_DIR}`);
  }

  const options = parseArguments(process.argv.slice(2));
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
    if (date > options.asOf) continue;
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
      tags: parseList(parsed.frontMatter, "tags"),
    });
  }

  entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id.localeCompare(b.id)));

  const careerEntries = entries.map(({ tags, ...entry }) => entry);
  const careerPayload = {
    generated_at: options.fixedAsOf ? `${options.asOf}T00:00:00.000Z` : new Date().toISOString(),
    source: "_news geo front matter",
    entry_count: careerEntries.length,
    entries: careerEntries,
  };

  const talkEntries = entries
    .filter((entry) => entry.localities.length > 0)
    .filter((entry) => !entry.title.startsWith("Award:"))
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      url: entry.url,
      date: entry.date,
      year: entry.year,
      scope: entry.scope,
      speaking_tags: entry.tags.filter((tag) => TALK_TAGS.has(tag)),
      localities: entry.localities,
      excerpt: entry.excerpt,
    }))
    .filter((entry) => entry.speaking_tags.length > 0);

  const talkmapPayload = {
    as_of: options.asOf,
    source: "_news geo front matter",
    event_count: talkEntries.length,
    entries: talkEntries,
  };

  writeJson(options.careerOutput, careerPayload);
  writeJson(options.talkmapOutput, talkmapPayload);

  console.log(`wrote=${path.relative(ROOT, options.careerOutput)}`);
  console.log(`career_entries=${careerEntries.length}`);
  console.log(`wrote=${path.relative(ROOT, options.talkmapOutput)}`);
  console.log(`talk_events=${talkEntries.length}`);
}

main();

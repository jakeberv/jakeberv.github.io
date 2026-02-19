(function impactDashboardBootstrap() {
const root = document.getElementById("impactDashboardApp");
if (!root) return;

const DATA_PATH = root.dataset.dashboardUrl || "/data/impact/impact_dashboard.json";
const RECON_PATH = root.dataset.reconciliationUrl || "/data/impact/impact_reconciliation.json";
const REACH_MENTIONS_PATH = root.dataset.reachMentionsUrl || "/data/impact/reach/time_adjusted_mentions_reach.json";
const REACH_METADATA_PATH = root.dataset.reachMetadataUrl || "/data/impact/reach/reach_metadata.json";
const WORLD_TOPO_URLS = [
  root.dataset.worldUrl || "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
  root.dataset.worldUrlFallback || "https://unpkg.com/world-atlas@2/countries-110m.json",
];

const CHANNEL_OPTIONS = [
  { key: "all", label: "All channels" },
  { key: "news_only", label: "News only" },
  { key: "media_reference", label: "Media" },
  { key: "social", label: "Social" },
  { key: "other", label: "Other" },
];

const GRANULARITY_OPTIONS = [
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
];

const TIMELINE_MODE_OPTIONS = [
  { key: "scholarly_vs_press", label: "Scholarly vs Press" },
  { key: "press_pulse", label: "Press pulse" },
];

const MAP_MODE_OPTIONS = [
  { key: "citations", label: "Citing authors (WOS)" },
  { key: "mentions", label: "Mention countries" },
];

const COVERAGE_TAB_OPTIONS = [
  { key: "major_outlets", label: "Major outlets" },
  { key: "recent", label: "Recent news" },
];

const PREVIEW_OPTIONS = [
  { key: "mentions", label: "Mentions" },
  { key: "news", label: "News" },
  { key: "social", label: "Social" },
  { key: "outlets", label: "Outlets" },
  { key: "stories", label: "Stories" },
  { key: "reconciliation", label: "Reconciliation" },
];

const SOCIAL_TYPES = new Set(["X Post", "Bluesky post", "Facebook post", "Reddit post", "Google+ post"]);
const MEDIA_REFERENCE_TYPES = new Set(["News story", "Blog post", "Video", "Podcast episode", "Wikipedia page", "Q&A post"]);
const EXCLUDED_REACH_DOMAINS = new Set(["ct.moreover.com", "feedproxy.google.com", "news.google.com"]);
const MAJOR_OUTLET_TOP_QUANTILE = 0.2;
const OUTLET_PANEL_TOP_N = 12;
const IMPRESSION_MODEL = {
  visits_at_rank_1: 500_000_000,
  rank_exponent: 0.62,
  share_low: 0.0002,
  share_mid: 0.0005,
  share_high: 0.001,
};

const COLORS = {
  social: "rgba(43, 111, 169, 0.84)",
  news: "rgba(200, 89, 74, 0.84)",
  reference: "rgba(182, 141, 52, 0.9)",
  commentary: "rgba(95, 114, 137, 0.88)",
  citations: "#bf6f00",
  citationsBar: "rgba(57, 140, 210, 0.42)",
  citationsBarEdge: "rgba(40, 103, 178, 0.82)",
  mentionsTotal: "#3f536c",
  donut: ["#2b6fa9", "#c8594a", "#b68d34", "#5f7289"],
  bubble: "rgba(57, 140, 210, 0.35)",
  bubbleHover: "rgba(40, 103, 178, 0.78)",
  geoBar: "#167f76",
};

const MIX_BUCKETS = [
  { key: "social", label: "Social", color: COLORS.social, donut: COLORS.donut[0] },
  { key: "news", label: "News", color: COLORS.news, donut: COLORS.donut[1] },
  { key: "reference", label: "Reference", color: COLORS.reference, donut: COLORS.donut[2] },
  { key: "commentary", label: "Commentary", color: COLORS.commentary, donut: COLORS.donut[3] },
];

const state = {
  channel: "all",
  publication: "all",
  timelineMode: "scholarly_vs_press",
  granularity: "month",
  yearRange: [2018, new Date().getFullYear()],
  mapMode: "citations",
  activeCoverageTab: "major_outlets",
  preview: "mentions",
  previewSearch: "",
};

const charts = {
  timeline: null,
  donut: null,
  map: null,
  reachMatrix: null,
  impressionsEstimate: null,
};

let rawDashboard = null;
let reconciliation = null;
let reachMentionsRaw = [];
let reachMetadataRaw = {};
let dataModel = null;
let worldCountries = null;
let renderToken = 0;

function q(selector) {
  return root.querySelector(selector);
}

const el = {
  idbSubtitle: q("#idbSubtitle"),
  buildMeta: q("#buildMeta"),

  channelSelect: q("#channelSelect"),
  publicationSelect: q("#publicationSelect"),
  granularitySelect: q("#granularitySelect"),
  yearMin: q("#yearMin"),
  yearMax: q("#yearMax"),
  yearRangeLabel: q("#yearRangeLabel"),

  trustChips: q("#trustChips"),
  kpiRow: q("#kpiRow"),

  timelineChart: q("#timelineChart"),
  timelineModeButtons: q("#timelineModeButtons"),
  timelineLead: q("#timelineLead"),
  timelineHint: q("#timelineHint"),

  donutChart: q("#donutChart"),
  donutTrends: q("#donutTrends"),

  mapModeButtons: q("#mapModeButtons"),
  mapChart: q("#mapChart"),
  mapHint: q("#mapHint"),
  reachMatrixChart: q("#reachMatrixChart"),
  reachMatrixHint: q("#reachMatrixHint"),
  impressionsEstimateChart: q("#impressionsEstimateChart"),
  impressionsEstimateHint: q("#impressionsEstimateHint"),

  coverageTabs: q("#coverageTabs"),
  coverageList: q("#coverageList"),

  previewButtons: q("#previewButtons"),
  previewSearch: q("#previewSearch"),
  downloadLinks: q("#downloadLinks"),
  previewThead: q("#previewThead"),
  previewTbody: q("#previewTbody"),
  previewHint: q("#previewHint"),

  diagCounts: q("#diagCounts"),
  diagScholar: q("#diagScholar"),
  diagAltmetric: q("#diagAltmetric"),
};

function assertRequiredDom() {
  const missing = Object.entries(el)
    .filter(([, node]) => !node)
    .map(([key]) => key);
  if (missing.length) {
    throw new Error(`Dashboard layout mismatch. Missing DOM elements: ${missing.join(", ")}`);
  }
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fmtNumber(value) {
  return new Intl.NumberFormat("en-US").format(toNumber(value));
}

function fmtCompactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(toNumber(value));
}

function safeText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clipped(text, max = 90) {
  const t = String(text ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 3).trimEnd()}...`;
}

function parseDate(value) {
  if (!value) return null;
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function dateIsoDay(value) {
  const dt = parseDate(value);
  if (!dt) return "";
  return dt.toISOString().slice(0, 10);
}

function toDisplayDate(iso) {
  if (!iso) return "n/a";
  const dt = parseDate(iso);
  if (!dt) return "n/a";
  return dt.toISOString().slice(0, 10);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isExcludedReachDomain(domain) {
  const d = String(domain || "").trim().toLowerCase();
  if (!d) return false;
  return EXCLUDED_REACH_DOMAINS.has(d);
}

function normalizeOutletIdentity(outlet, domain) {
  const raw = String(outlet || "").trim();
  const text = normalizeText(raw);

  if (text.includes("yahoo")) return { key: "outlet:yahoo_news", label: "Yahoo! News" };
  if (text === "msn" || text.includes(" msn ") || text.startsWith("msn ")) return { key: "outlet:msn", label: "MSN" };
  if (text.includes("google news")) return { key: "outlet:google_news", label: "Google News" };
  if (text.includes("science daily")) return { key: "outlet:science_daily", label: "Science Daily" };
  if (text.includes("phys org") || text.includes("physorg")) return { key: "outlet:phys_org", label: "Phys.org" };
  if (text.includes("eurekalert")) return { key: "outlet:eurekalert", label: "EurekAlert!" };

  if (raw && text && text !== "unknown") {
    return { key: `outlet:${text}`, label: raw };
  }

  const normalizedDomain = String(domain || "").trim().toLowerCase();
  if (normalizedDomain) {
    return { key: `domain:${normalizedDomain}`, label: normalizedDomain };
  }

  return { key: "outlet:unknown", label: "Unknown" };
}

function extractDomain(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  try {
    const host = new URL(s).hostname.toLowerCase();
    return host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function mentionCategory(mentionType, superCategory) {
  if (superCategory === "social" || superCategory === "media_reference" || superCategory === "other") {
    return superCategory;
  }
  if (SOCIAL_TYPES.has(mentionType)) return "social";
  if (MEDIA_REFERENCE_TYPES.has(mentionType)) return "media_reference";
  return "other";
}

function mentionMixBucket(mention) {
  const type = String(mention?.mention_type || "").trim();
  const superCategory = String(mention?.super_category || "").trim();

  if (SOCIAL_TYPES.has(type) || superCategory === "social") return "social";
  if (type === "News story") return "news";
  if (type === "Wikipedia page") return "reference";
  if (type === "Blog post" || type === "Video" || type === "Podcast episode" || type === "Q&A post") {
    return "commentary";
  }
  if (superCategory === "media_reference" || superCategory === "other") return "commentary";
  return "commentary";
}

function emptyMixTotals() {
  return { social: 0, news: 0, reference: 0, commentary: 0 };
}

function mentionWeight(mention) {
  const type = String(mention.mention_type || "").trim();
  const outlet = String(mention.outlet || "").trim().toLowerCase();
  if (type === "News story") return 1.0;
  if (type === "Blog post") return 0.6;
  if (type === "Video" || type === "Podcast episode" || type === "Q&A post") return 0.5;
  if (type === "Wikipedia page") return 0.25;
  if (mention.super_category === "social") return 0.2;
  if (!type || type === "Other" || outlet === "unknown") return 0.15;
  return 0.35;
}

function toYearMonth(dt) {
  const m = `${dt.getUTCMonth() + 1}`.padStart(2, "0");
  return `${dt.getUTCFullYear()}-${m}`;
}

function toYearQuarter(dt) {
  const q = Math.floor(dt.getUTCMonth() / 3) + 1;
  return `${dt.getUTCFullYear()}-Q${q}`;
}

function yearFromLabel(label) {
  const m = String(label || "").match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

function sortPeriodLabels(labels, granularity) {
  const copy = [...labels];
  if (granularity === "month") {
    copy.sort();
    return copy;
  }
  if (granularity === "quarter") {
    copy.sort((a, b) => {
      const ay = yearFromLabel(a) || 0;
      const by = yearFromLabel(b) || 0;
      if (ay !== by) return ay - by;
      const aq = toNumber(String(a).split("Q")[1]);
      const bq = toNumber(String(b).split("Q")[1]);
      return aq - bq;
    });
    return copy;
  }
  copy.sort((a, b) => (yearFromLabel(a) || 0) - (yearFromLabel(b) || 0));
  return copy;
}

function looksNoisyTitle(title) {
  const t = String(title || "").trim();
  if (!t) return true;
  const questionMarks = (t.match(/\?/g) || []).length;
  const replacementChars = (t.match(/�/g) || []).length;
  return replacementChars > 0 || questionMarks >= 6;
}

function normalizeMentionRow(row) {
  const mentionType = String(row.mention_type || row.type || "").trim();
  const superCategory = mentionCategory(mentionType, String(row.super_category || "").trim());
  const dateText = dateIsoDay(row.mention_date || row.date || "");
  const dateObj = dateText ? new Date(`${dateText}T00:00:00Z`) : null;

  const year = row.year ? Number(row.year) : (dateObj ? dateObj.getUTCFullYear() : null);
  const yearMonth = row.year_month || (dateObj ? toYearMonth(dateObj) : "");
  const yearQuarter = row.year_quarter || (dateObj ? toYearQuarter(dateObj) : "");

  const url = String(row.mention_url || row.url || "").trim();
  const domain = String(row.domain || "").trim() || extractDomain(url);

  return {
    mention_id: String(row.mention_id || row.external_id || "").trim(),
    external_id: String(row.external_id || "").trim(),
    mention_title: String(row.mention_title || row.title || "").trim(),
    mention_type: mentionType,
    super_category: superCategory,
    mention_date: dateText,
    year: Number.isFinite(year) ? year : null,
    year_month: String(yearMonth || "").trim(),
    year_quarter: String(yearQuarter || "").trim(),
    has_date: Boolean(dateText),
    outlet: String(row.outlet || row.outlet_or_author || domain || "Unknown").trim() || "Unknown",
    outlet_or_author: String(row.outlet_or_author || "").trim(),
    country: String(row.country || "").trim(),
    mention_url: url,
    domain,
    canonical_publication_id: String(row.canonical_publication_id || row.pub_id || "").trim(),
    canonical_publication_title: String(row.canonical_publication_title || "").trim(),
    story_cluster_key: String(row.story_cluster_key || "").trim(),
    sentiment: String(row.sentiment || "").trim(),
    attention_score: toNumber(row.attention_score),
  };
}

function normalizeReachMentionRow(row) {
  return {
    mention_id: String(row.mention_id || "").trim(),
    mention_date: dateIsoDay(row.mention_date || ""),
    domain: String(row.domain || "").trim().toLowerCase(),
    outlet: String(row.outlet || "").trim(),
    canonical_publication_id: String(row.canonical_publication_id || "").trim(),
    tranco_rank_at_date: toNumber(row.tranco_rank_at_date),
    reach_score_at_date: toNumber(row.reach_score_at_date),
    snapshot_offset_days: toNumber(row.snapshot_offset_days),
  };
}

function buildSeriesFromMentions(mentions, granularity) {
  const byLabel = new Map();
  for (const m of mentions) {
    if (!m.has_date || !m.year) continue;
    const label =
      granularity === "month"
        ? m.year_month
        : granularity === "quarter"
          ? m.year_quarter
          : String(m.year);
    if (!label) continue;
    if (!byLabel.has(label)) {
      byLabel.set(label, { label, social: 0, media_reference: 0, other: 0, total: 0 });
    }
    const rec = byLabel.get(label);
    rec[m.super_category] = toNumber(rec[m.super_category]) + 1;
    rec.total += 1;
  }

  const labels = sortPeriodLabels([...byLabel.keys()], granularity);
  return labels.map((label) => byLabel.get(label));
}

function rowsFromSeriesInput(input, granularity) {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input.map((row) => {
      const label =
        granularity === "month"
          ? row.year_month || row.label || ""
          : granularity === "quarter"
            ? row.year_quarter || row.label || ""
            : row.year || row.label || "";
      const social = toNumber(row.social);
      const media = toNumber(row.media_reference || row.media);
      const other = toNumber(row.other);
      const total = toNumber(row.total || social + media + other);
      return {
        label: String(label),
        social,
        media_reference: media,
        other,
        total,
      };
    });
  }

  if (typeof input === "object") {
    return Object.entries(input).map(([label, total]) => ({
      label: String(label),
      social: 0,
      media_reference: 0,
      other: 0,
      total: toNumber(total),
    }));
  }

  return [];
}

function mergeSeriesWithMentions(inputRows, derivedRows, granularity) {
  const out = new Map();
  for (const row of inputRows) {
    out.set(row.label, { ...row });
  }

  const derivedByLabel = new Map(derivedRows.map((r) => [r.label, r]));
  for (const [label, row] of out.entries()) {
    const d = derivedByLabel.get(label);
    if (!d) continue;

    const hasChannels = toNumber(row.social) + toNumber(row.media_reference) + toNumber(row.other) > 0;
    if (!hasChannels) {
      row.social = d.social;
      row.media_reference = d.media_reference;
      row.other = d.other;
    }
    if (!row.total) {
      row.total = d.total;
    }
  }

  for (const d of derivedRows) {
    if (!out.has(d.label)) {
      out.set(d.label, { ...d });
    }
  }

  const labels = sortPeriodLabels([...out.keys()], granularity);
  return labels.map((label) => out.get(label));
}

function normalizeCitesPerYear(rawSeries) {
  const map = new Map();

  if (Array.isArray(rawSeries)) {
    for (const row of rawSeries) {
      const year = toNumber(row.year || row.label || row.key);
      if (!year) continue;
      const value = toNumber(row.citations || row.value || row.total || row.count);
      map.set(String(year), value);
    }
    return map;
  }

  if (rawSeries && typeof rawSeries === "object") {
    for (const [year, value] of Object.entries(rawSeries)) {
      const y = toNumber(year);
      if (!y) continue;
      map.set(String(y), toNumber(value));
    }
  }

  return map;
}

function normalizeDonutTotals(rawAllTypes, rawAllTypesList, mentions, channelBreakdown) {
  if (rawAllTypes && !Array.isArray(rawAllTypes) && typeof rawAllTypes === "object") {
    const social = toNumber(rawAllTypes.social);
    const media = toNumber(rawAllTypes.media_reference || rawAllTypes.media);
    const other = toNumber(rawAllTypes.other);
    return { social, media_reference: media, other };
  }

  const candidateList =
    (Array.isArray(rawAllTypes) && rawAllTypes) ||
    (Array.isArray(rawAllTypesList) && rawAllTypesList) ||
    null;

  if (candidateList) {
    const totals = { social: 0, media_reference: 0, other: 0 };
    for (const row of candidateList) {
      const name = String(row.name || row.type || "").trim();
      const value = toNumber(row.value || row.count || row.mentions || 0);
      const cat = mentionCategory(name, "");
      totals[cat] += value;
    }
    return totals;
  }

  if (channelBreakdown && typeof channelBreakdown === "object") {
    return {
      social: toNumber(channelBreakdown.social),
      media_reference: toNumber(channelBreakdown.media_reference || channelBreakdown.media),
      other: toNumber(channelBreakdown.other),
    };
  }

  const totals = { social: 0, media_reference: 0, other: 0 };
  for (const m of mentions) {
    totals[m.super_category] += 1;
  }
  return totals;
}

function aggregateCountries(mentions) {
  const map = new Map();
  for (const m of mentions) {
    const country = String(m.country || "").trim();
    if (!country) continue;
    map.set(country, (map.get(country) || 0) + 1);
  }
  return [...map.entries()]
    .map(([country, mentionsCount]) => ({ country, mentions: mentionsCount }))
    .sort((a, b) => b.mentions - a.mentions);
}

function normalizeAltCountries(rawCountries, mentions) {
  if (Array.isArray(rawCountries) && rawCountries.length) {
    return rawCountries
      .map((row) => ({
        country: String(row.country || row.name || "").trim(),
        mentions: toNumber(row.mentions || row.value || 0),
      }))
      .filter((row) => row.country)
      .sort((a, b) => b.mentions - a.mentions);
  }
  return aggregateCountries(mentions);
}

function normalizeCitationPoints(rawPoints) {
  if (!Array.isArray(rawPoints)) return [];
  return rawPoints
    .map((row) => ({
      lat: Number(row.lat ?? row.latitude),
      lon: Number(row.lon ?? row.longitude),
      value: toNumber(row.publicationCount ?? row.publication_count ?? row.value ?? 1),
      label: String(row.address || row.label || "").trim(),
    }))
    .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lon) && row.value > 0);
}

function computeYearBounds(seriesByGranularity, citesPerYear, mentions) {
  const years = new Set();

  for (const rows of Object.values(seriesByGranularity)) {
    for (const row of rows) {
      const y = yearFromLabel(row.label);
      if (y) years.add(y);
    }
  }

  for (const y of citesPerYear.keys()) {
    years.add(toNumber(y));
  }

  for (const m of mentions) {
    if (m.year) years.add(m.year);
  }

  if (!years.size) {
    const now = new Date().getFullYear();
    return { minYear: now - 8, maxYear: now };
  }

  const ordered = [...years].sort((a, b) => a - b);
  return { minYear: ordered[0], maxYear: ordered[ordered.length - 1] };
}

function normalizeCanonicalPublications(rawPubs) {
  if (!Array.isArray(rawPubs)) return [];
  return rawPubs.map((p, idx) => ({
    canonical_publication_id: String(p.canonical_publication_id || p.id || `pub_${idx + 1}`).trim(),
    canonical_title: String(p.canonical_title || p.title || "Untitled").trim(),
    canonical_doi: String(p.canonical_doi || p.doi || "").trim(),
    canonical_permalink: String(p.canonical_permalink || p.permalink || "").trim(),
    canonical_year: toNumber(p.canonical_year || p.year) || null,
    canonical_venue: String(p.canonical_venue || p.venue || "").trim(),
    mentions: toNumber(p.mentions),
    scholar_citations: toNumber(p.scholar_citations || p.citations),
    altmetric_tracking_state: String(p.altmetric_tracking_state || "").trim(),
    is_external_only: Boolean(p.is_external_only),
  }));
}

function normalizeHighlights(takeaways) {
  if (!takeaways || typeof takeaways !== "object") return [];
  if (Array.isArray(takeaways.highlights)) {
    return takeaways.highlights.map((x) => String(x)).filter(Boolean);
  }
  if (typeof takeaways.highlights === "string" && takeaways.highlights.trim()) {
    return [takeaways.highlights.trim()];
  }
  if (typeof takeaways.highlights_text === "string" && takeaways.highlights_text.trim()) {
    return [takeaways.highlights_text.trim()];
  }
  return [];
}

function normalizeData(raw, reachMentionsInput = [], reachMetadataInput = {}) {
  const mentions = (raw.mentions || []).map(normalizeMentionRow);
  const canonicalPublications = normalizeCanonicalPublications(raw.canonical_publications || []);
  const canonicalById = new Map(canonicalPublications.map((p) => [p.canonical_publication_id, p]));
  const reachMentions = (Array.isArray(reachMentionsInput) ? reachMentionsInput : [])
    .map(normalizeReachMentionRow)
    .filter((row) => row.mention_id);
  const reachMentionById = new Map();
  for (const row of reachMentions) {
    if (!reachMentionById.has(row.mention_id)) {
      reachMentionById.set(row.mention_id, row);
    }
  }
  const reachSummary =
    reachMetadataInput && typeof reachMetadataInput === "object" && reachMetadataInput.time_adjusted
      ? reachMetadataInput.time_adjusted
      : {};

  const rawSeries = raw.citation_series || {};
  const derivedMonth = buildSeriesFromMentions(mentions, "month");
  const derivedQuarter = buildSeriesFromMentions(mentions, "quarter");
  const derivedYear = buildSeriesFromMentions(mentions, "year");

  const monthRows = mergeSeriesWithMentions(rowsFromSeriesInput(rawSeries.mentions_by_month, "month"), derivedMonth, "month");
  const quarterRows = mergeSeriesWithMentions(
    rowsFromSeriesInput(rawSeries.mentions_by_quarter, "quarter"),
    derivedQuarter,
    "quarter"
  );
  const yearRows = mergeSeriesWithMentions(rowsFromSeriesInput(rawSeries.mentions_by_year, "year"), derivedYear, "year");

  const citesPerYear = normalizeCitesPerYear(rawSeries.cites_per_year);

  const donutTotals = normalizeDonutTotals(
    raw?.donut_series?.all_types,
    raw?.donut_series?.all_types_list,
    mentions,
    raw?.derived_insights?.channel_breakdown
  );

  const altCountries = normalizeAltCountries(raw?.altmetric_geography?.countries, mentions);
  const citationPoints = normalizeCitationPoints(raw?.citation_geography?.points || []);

  const yearBounds = computeYearBounds(
    {
      month: monthRows,
      quarter: quarterRows,
      year: yearRows,
    },
    citesPerYear,
    mentions
  );

  const topPubsGlobal = canonicalPublications
    .filter((p) => !p.is_external_only)
    .sort((a, b) => b.mentions - a.mentions || b.scholar_citations - a.scholar_citations)
    .slice(0, 20);

  return {
    generated_at_utc: raw.generated_at_utc || "",
    description: String(raw.description || "Citations, media coverage, and global reach.").trim(),
    metrics: raw.metrics || {},
    reconciliation_counts: raw.reconciliation_counts || {},
    dataset_catalog: raw.dataset_catalog || [],
    derived_insights: raw.derived_insights || {},
    defaultHighlights: normalizeHighlights(raw?.derived_insights?.takeaways),

    mentions,
    canonicalPublications,
    canonicalById,
    reachMentionById,
    reachMentionsTotal: reachMentions.length,
    reachSummary,

    series: {
      month: monthRows,
      quarter: quarterRows,
      year: yearRows,
    },
    citesPerYear,
    donutTotals,
    altCountries,
    citationPoints,

    yearBounds,
    topPubsGlobal,
  };
}

function renderButtonGroup(container, options, activeKey, onClick, attrs = {}) {
  container.innerHTML = options
    .map((opt) => {
      const active = opt.key === activeKey;
      const role = attrs.role ? ` role="${safeText(attrs.role)}"` : "";
      const selected = attrs.ariaSelected ? ` aria-selected="${active ? "true" : "false"}"` : "";
      const ariaControls = opt.ariaControls ? ` aria-controls="${safeText(opt.ariaControls)}"` : "";
      return `<button class="idb-tab ${active ? "active" : ""}" data-key="${safeText(opt.key)}"${role}${selected}${ariaControls}>${safeText(
        opt.label
      )}</button>`;
    })
    .join("");

  for (const btn of container.querySelectorAll("button")) {
    btn.addEventListener("click", () => onClick(btn.dataset.key));
  }
}

function setActiveButtonGroupKey(container, key) {
  if (!container) return;
  for (const btn of container.querySelectorAll("button")) {
    const active = btn.dataset.key === key;
    btn.classList.toggle("active", active);
    if (btn.hasAttribute("aria-selected")) {
      btn.setAttribute("aria-selected", active ? "true" : "false");
    }
  }
}

function isDefaultYearRange() {
  return state.yearRange[0] === dataModel.yearBounds.minYear && state.yearRange[1] === dataModel.yearBounds.maxYear;
}

function isMentionInYearRange(mention) {
  if (!mention.year) {
    return isDefaultYearRange();
  }
  return mention.year >= state.yearRange[0] && mention.year <= state.yearRange[1];
}

function filterMentions({ applyChannel = true } = {}) {
  return dataModel.mentions.filter((m) => {
    if (state.publication !== "all" && m.canonical_publication_id !== state.publication) return false;
    if (applyChannel) {
      if (state.channel === "news_only" && m.mention_type !== "News story") return false;
      if (
        state.channel !== "all" &&
        state.channel !== "news_only" &&
        m.super_category !== state.channel
      ) {
        return false;
      }
    }
    if (!isMentionInYearRange(m)) return false;
    return true;
  });
}

function buildTimelineRowsFromMentions(mentions) {
  const byLabel = new Map();
  for (const m of mentions) {
    if (!m.has_date || !m.year) continue;
    const label =
      state.granularity === "month"
        ? m.year_month
        : state.granularity === "quarter"
          ? m.year_quarter
          : String(m.year);
    if (!label) continue;

    if (!byLabel.has(label)) {
      byLabel.set(label, { label, social: 0, news: 0, reference: 0, commentary: 0, total: 0 });
    }
    const rec = byLabel.get(label);
    const bucket = mentionMixBucket(m);
    rec[bucket] += 1;
    rec.total += 1;
  }

  const labels = sortPeriodLabels([...byLabel.keys()], state.granularity);
  return labels.map((label) => byLabel.get(label));
}

function filteredPrecomputedRows() {
  const rows = dataModel.series[state.granularity] || [];
  return rows
    .map((row) => {
      const social = toNumber(row.social);
      const news = toNumber(row.news || row.media_reference || row.media);
      const reference = toNumber(row.reference);
      const commentary = toNumber(row.commentary || row.other);
      return {
        label: row.label,
        social,
        news,
        reference,
        commentary,
        total: toNumber(row.total || social + news + reference + commentary),
      };
    })
    .filter((row) => {
      const y = yearFromLabel(row.label);
      return y && y >= state.yearRange[0] && y <= state.yearRange[1];
    });
}

function aggregateOutlets(mentions) {
  const map = new Map();
  for (const m of mentions) {
    const outlet = (m.outlet || "Unknown").trim() || "Unknown";
    if (!map.has(outlet)) {
      map.set(outlet, {
        outlet,
        mentions: 0,
        publication_ids: new Set(),
        latest_date: "",
        weighted_mentions: 0,
        news_mentions: 0,
      });
    }
    const rec = map.get(outlet);
    rec.mentions += 1;
    rec.weighted_mentions += mentionWeight(m);
    if (m.mention_type === "News story") rec.news_mentions += 1;
    if (m.canonical_publication_id) rec.publication_ids.add(m.canonical_publication_id);
    if (m.mention_date && (!rec.latest_date || m.mention_date > rec.latest_date)) rec.latest_date = m.mention_date;
  }

  return [...map.values()]
    .map((r) => ({
      outlet: r.outlet,
      mentions: r.mentions,
      publication_spread: r.publication_ids.size,
      latest_date: r.latest_date,
      weighted_mentions: Math.round(r.weighted_mentions * 100) / 100,
      news_mentions: r.news_mentions,
      composite_score: Math.round((r.weighted_mentions + 0.6 * r.publication_spread) * 100) / 100,
    }))
    .sort((a, b) => b.composite_score - a.composite_score || b.mentions - a.mentions);
}

function upperBound(sortedValues, value) {
  let lo = 0;
  let hi = sortedValues.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sortedValues[mid] <= value) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

function percentileFromSorted(sortedValues, value) {
  if (!sortedValues.length) return 0;
  return upperBound(sortedValues, value) / sortedValues.length;
}

function buildMajorOutletRows(newsMentions) {
  if (!dataModel?.reachMentionById?.size) return [];

  const rankedMentions = [];
  for (const mention of newsMentions) {
    const reach = dataModel.reachMentionById.get(mention.mention_id);
    if (!reach) continue;

    const domain = String(reach.domain || mention.domain || "").trim().toLowerCase();
    if (!domain || isExcludedReachDomain(domain)) continue;

    const rank = toNumber(reach.tranco_rank_at_date);
    const score = toNumber(reach.reach_score_at_date);
    if (rank <= 0 || score <= 0) continue;

    const mentionDate = mention.mention_date || reach.mention_date || "";
    const mentionDt = parseDate(mentionDate);
    const mentionDay = mentionDate ? String(mentionDate).slice(0, 10) : (mentionDt ? mentionDt.toISOString().slice(0, 10) : "undated");
    const mentionYear = mention.year || (mentionDt ? mentionDt.getUTCFullYear() : null);
    const titleNorm = normalizeText(mention.mention_title || mention.title || "");
    const pubTitleNorm = normalizeText(mention.canonical_publication_title || "");
    const storyKey = titleNorm ? `${titleNorm}|${mentionDay}` : `${domain}|${mentionDay}|${pubTitleNorm || "untitled"}`;
    const outletIdentity = normalizeOutletIdentity(reach.outlet || mention.outlet, domain);

    rankedMentions.push({
      mention_id: mention.mention_id,
      mention_date: mentionDate,
      mention_dt: mentionDt,
      mention_year: Number.isFinite(mentionYear) ? mentionYear : null,
      story_key: storyKey,
      outlet_key: outletIdentity.key,
      outlet: outletIdentity.label,
      domain,
      canonical_publication_id: mention.canonical_publication_id,
      reach_score_at_date: score,
    });
  }

  if (!rankedMentions.length) return [];

  const sortedReachScores = rankedMentions.map((m) => m.reach_score_at_date).sort((a, b) => a - b);
  const p99Index = Math.max(0, Math.min(sortedReachScores.length - 1, Math.ceil(sortedReachScores.length * 0.99) - 1));
  const reachCap = sortedReachScores[p99Index];
  for (const row of rankedMentions) {
    row.reach_score_winsorized = Math.min(row.reach_score_at_date, reachCap);
  }

  const storyOutletSet = new Map();
  const storyEarliest = new Map();
  for (const row of rankedMentions) {
    if (!storyOutletSet.has(row.story_key)) {
      storyOutletSet.set(row.story_key, new Set());
    }
    storyOutletSet.get(row.story_key).add(row.outlet_key);

    if (row.mention_dt) {
      const prev = storyEarliest.get(row.story_key);
      if (!prev || row.mention_dt < prev) {
        storyEarliest.set(row.story_key, row.mention_dt);
      }
    }
  }

  const byOutlet = new Map();
  for (const row of rankedMentions) {
    if (!byOutlet.has(row.outlet_key)) {
      byOutlet.set(row.outlet_key, {
        outlet_key: row.outlet_key,
        outlet: row.outlet,
        mentions: 0,
        ranked_mentions: 0,
        reaches: [],
        reaches_winsorized: [],
        stories: new Set(),
        publication_ids: new Set(),
        years: new Set(),
        domains: new Map(),
        syndicated_mentions: 0,
        first_by_story: new Map(),
      });
    }

    const rec = byOutlet.get(row.outlet_key);
    rec.outlet = row.outlet;
    rec.mentions += 1;
    rec.ranked_mentions += 1;
    rec.reaches.push(row.reach_score_at_date);
    rec.reaches_winsorized.push(row.reach_score_winsorized);
    rec.stories.add(row.story_key);

    if (row.canonical_publication_id) {
      rec.publication_ids.add(row.canonical_publication_id);
    }
    if (row.mention_year) {
      rec.years.add(row.mention_year);
    }
    rec.domains.set(row.domain, (rec.domains.get(row.domain) || 0) + 1);

    if ((storyOutletSet.get(row.story_key)?.size || 0) >= 4) {
      rec.syndicated_mentions += 1;
    }

    let firstPoints = 0;
    const earliest = storyEarliest.get(row.story_key);
    if (earliest && row.mention_dt) {
      const daysSinceFirst = (row.mention_dt.getTime() - earliest.getTime()) / 86_400_000;
      if (daysSinceFirst <= 0.01) firstPoints = 1.0;
      else if (daysSinceFirst <= 1.0) firstPoints = 0.5;
    }
    const existing = rec.first_by_story.get(row.story_key) || 0;
    if (firstPoints > existing) {
      rec.first_by_story.set(row.story_key, firstPoints);
    }
  }

  const metricRows = [...byOutlet.values()].map((rec) => {
    const mentions = rec.mentions;
    const ranked = rec.ranked_mentions;
    const uniqueStories = rec.stories.size;
    const publicationBreadth = rec.publication_ids.size;
    const persistenceYears = rec.years.size;
    const extraMentions = Math.max(0, mentions - uniqueStories);
    const cappedVolume = uniqueStories + 0.25 * extraMentions;
    const logCappedVolume = Math.log1p(cappedVolume);
    const syndicatedShare = mentions ? rec.syndicated_mentions / mentions : 0;
    const rankCoverageRate = mentions ? ranked / mentions : 0;
    const firstReportRate = uniqueStories
      ? [...rec.first_by_story.values()].reduce((sum, value) => sum + value, 0) / uniqueStories
      : 0;
    const peakReach = rec.reaches.length ? Math.max(...rec.reaches) : 0;
    const peakReachWinsorized = rec.reaches_winsorized.length ? Math.max(...rec.reaches_winsorized) : 0;
    const meanReach = rec.reaches.length
      ? rec.reaches.reduce((sum, value) => sum + value, 0) / rec.reaches.length
      : 0;
    const meanReachWinsorized = rec.reaches_winsorized.length
      ? rec.reaches_winsorized.reduce((sum, value) => sum + value, 0) / rec.reaches_winsorized.length
      : 0;

    return {
      outlet_key: rec.outlet_key,
      outlet: rec.outlet,
      mentions,
      ranked_mentions: ranked,
      peak_reach: peakReach,
      peak_reach_winsorized: peakReachWinsorized,
      mean_reach: meanReach,
      mean_reach_winsorized: meanReachWinsorized,
      unique_stories: uniqueStories,
      publication_breadth: publicationBreadth,
      persistence_years: persistenceYears,
      log_capped_volume: logCappedVolume,
      first_report_rate: firstReportRate,
      syndicated_share: syndicatedShare,
      rank_coverage_rate: rankCoverageRate,
    };
  });

  const sortedPeak = metricRows.map((row) => row.peak_reach_winsorized).sort((a, b) => a - b);
  const sortedMean = metricRows.map((row) => row.mean_reach_winsorized).sort((a, b) => a - b);
  const sortedStories = metricRows.map((row) => row.unique_stories).sort((a, b) => a - b);
  const sortedBreadth = metricRows.map((row) => row.publication_breadth).sort((a, b) => a - b);
  const sortedVolume = metricRows.map((row) => row.log_capped_volume).sort((a, b) => a - b);
  const sortedYears = metricRows.map((row) => row.persistence_years).sort((a, b) => a - b);
  const sortedFirst = metricRows.map((row) => row.first_report_rate).sort((a, b) => a - b);

  for (const row of metricRows) {
    const peakPct = percentileFromSorted(sortedPeak, row.peak_reach_winsorized);
    const meanPct = percentileFromSorted(sortedMean, row.mean_reach_winsorized);
    const storyPct = percentileFromSorted(sortedStories, row.unique_stories);
    const breadthPct = percentileFromSorted(sortedBreadth, row.publication_breadth);
    const volumePct = percentileFromSorted(sortedVolume, row.log_capped_volume);
    const yearsPct = percentileFromSorted(sortedYears, row.persistence_years);
    const firstPct = percentileFromSorted(sortedFirst, row.first_report_rate);
    const syndicationPenalty = 0.1 * Math.pow(Math.max(0, row.syndicated_share - 0.5), 2);

    row.prominence_score =
      0.34 * peakPct +
      0.2 * meanPct +
      0.12 * storyPct +
      0.08 * breadthPct +
      0.04 * volumePct +
      0.12 * yearsPct +
      0.1 * firstPct -
      syndicationPenalty;

    row.confidence = 0.6 * (row.ranked_mentions / (row.ranked_mentions + 2)) + 0.4 * row.rank_coverage_rate;
  }

  metricRows.sort(
    (a, b) =>
      b.prominence_score - a.prominence_score ||
      b.confidence - a.confidence ||
      b.peak_reach_winsorized - a.peak_reach_winsorized ||
      b.mentions - a.mentions ||
      a.outlet.localeCompare(b.outlet)
  );

  const cutoff = Math.max(1, Math.ceil(metricRows.length * MAJOR_OUTLET_TOP_QUANTILE));
  return metricRows.slice(0, cutoff);
}

function buildReachOutletMatrixRows(newsMentions) {
  if (!dataModel?.reachMentionById?.size) return [];

  const byOutlet = new Map();
  for (const mention of newsMentions) {
    const reach = dataModel.reachMentionById.get(mention.mention_id);
    if (!reach) continue;

    const domain = String(reach.domain || mention.domain || "").trim().toLowerCase();
    if (!domain) continue;
    if (isExcludedReachDomain(domain)) continue;

    const outletIdentity = normalizeOutletIdentity(reach.outlet || mention.outlet, domain);
    if (!byOutlet.has(outletIdentity.key)) {
      byOutlet.set(outletIdentity.key, {
        outlet_key: outletIdentity.key,
        outlet: outletIdentity.label,
        mentions: 0,
        ranked_mentions: 0,
        reach_score_sum: 0,
        publication_ids: new Set(),
        domain_counts: new Map(),
        latest_date: "",
      });
    }

    const rec = byOutlet.get(outletIdentity.key);
    rec.outlet = outletIdentity.label;
    rec.mentions += 1;
    rec.domain_counts.set(domain, (rec.domain_counts.get(domain) || 0) + 1);

    if (mention.canonical_publication_id) {
      rec.publication_ids.add(mention.canonical_publication_id);
    }

    const score = toNumber(reach.reach_score_at_date);
    const rank = toNumber(reach.tranco_rank_at_date);
    if (rank > 0 && score > 0) {
      rec.ranked_mentions += 1;
      rec.reach_score_sum += score;
    }

    const mentionDate = mention.mention_date || reach.mention_date || "";
    if (mentionDate && (!rec.latest_date || mentionDate > rec.latest_date)) {
      rec.latest_date = mentionDate;
    }
  }

  return [...byOutlet.values()]
    .map((rec) => {
      let top_domain = "";
      let top_domain_mentions = 0;
      for (const [name, count] of rec.domain_counts.entries()) {
        if (count > top_domain_mentions) {
          top_domain = name;
          top_domain_mentions = count;
        }
      }

      const mean_reach_score = rec.ranked_mentions ? rec.reach_score_sum / rec.ranked_mentions : 0;
      const coverage_rate = rec.mentions ? rec.ranked_mentions / rec.mentions : 0;
      const publication_spread = rec.publication_ids.size;
      const impact_score = rec.mentions * (mean_reach_score / 100);

      return {
        outlet_key: rec.outlet_key,
        outlet: rec.outlet,
        mentions: rec.mentions,
        ranked_mentions: rec.ranked_mentions,
        coverage_rate,
        mean_reach_score: Math.round(mean_reach_score * 100) / 100,
        publication_spread,
        domain_count: rec.domain_counts.size,
        top_domain,
        top_domain_mentions,
        latest_date: rec.latest_date,
        impact_score: Math.round(impact_score * 100) / 100,
      };
    })
    .sort((a, b) => b.impact_score - a.impact_score || b.mentions - a.mentions || b.mean_reach_score - a.mean_reach_score);
}

function estimateMonthlyVisitsFromRank(rank) {
  const safeRank = Math.max(1, toNumber(rank));
  return IMPRESSION_MODEL.visits_at_rank_1 * Math.pow(safeRank, -IMPRESSION_MODEL.rank_exponent);
}

function buildOutletImpressionRows(newsMentions) {
  if (!dataModel?.reachMentionById?.size) return [];

  const byOutlet = new Map();
  for (const mention of newsMentions) {
    const reach = dataModel.reachMentionById.get(mention.mention_id);
    if (!reach) continue;

    const domain = String(reach.domain || mention.domain || "").trim().toLowerCase();
    if (!domain) continue;
    if (isExcludedReachDomain(domain)) continue;

    const outletIdentity = normalizeOutletIdentity(reach.outlet || mention.outlet, domain);
    if (!byOutlet.has(outletIdentity.key)) {
      byOutlet.set(outletIdentity.key, {
        outlet_key: outletIdentity.key,
        outlet: outletIdentity.label,
        mentions: 0,
        ranked_mentions: 0,
        low_impressions: 0,
        mid_impressions: 0,
        high_impressions: 0,
        publication_ids: new Set(),
        domain_counts: new Map(),
      });
    }

    const rec = byOutlet.get(outletIdentity.key);
    rec.outlet = outletIdentity.label;
    rec.mentions += 1;
    rec.domain_counts.set(domain, (rec.domain_counts.get(domain) || 0) + 1);
    if (mention.canonical_publication_id) {
      rec.publication_ids.add(mention.canonical_publication_id);
    }

    const rank = toNumber(reach.tranco_rank_at_date);
    if (rank <= 0) continue;
    const visits = estimateMonthlyVisitsFromRank(rank);
    rec.ranked_mentions += 1;
    rec.low_impressions += visits * IMPRESSION_MODEL.share_low;
    rec.mid_impressions += visits * IMPRESSION_MODEL.share_mid;
    rec.high_impressions += visits * IMPRESSION_MODEL.share_high;
  }

  return [...byOutlet.values()]
    .map((rec) => {
      let top_domain = "";
      let top_domain_mentions = 0;
      for (const [name, count] of rec.domain_counts.entries()) {
        if (count > top_domain_mentions) {
          top_domain = name;
          top_domain_mentions = count;
        }
      }
      return {
        outlet_key: rec.outlet_key,
        outlet: rec.outlet,
        mentions: rec.mentions,
        ranked_mentions: rec.ranked_mentions,
        publication_spread: rec.publication_ids.size,
        domain_count: rec.domain_counts.size,
        top_domain,
        top_domain_mentions,
        low_impressions: rec.low_impressions,
        mid_impressions: rec.mid_impressions,
        high_impressions: rec.high_impressions,
      };
    })
    .filter((row) => row.ranked_mentions > 0)
    .sort((a, b) => b.mid_impressions - a.mid_impressions);
}

function storyKey(mention) {
  if (mention.story_cluster_key) return mention.story_cluster_key;
  if (mention.mention_url) return mention.mention_url.split("?")[0];
  return `${normalizeText(mention.outlet)}|${normalizeText(mention.mention_title)}`;
}

function aggregateStories(mentions) {
  const map = new Map();
  for (const m of mentions) {
    const key = storyKey(m);
    if (!map.has(key)) {
      map.set(key, {
        story_key: key,
        title: m.mention_title || m.canonical_publication_title || "Untitled",
        url: m.mention_url || "",
        mentions: 0,
        publication_ids: new Set(),
        countries: new Set(),
        latest_date: "",
        weighted_mentions: 0,
        news_mentions: 0,
      });
    }
    const rec = map.get(key);
    rec.mentions += 1;
    rec.weighted_mentions += mentionWeight(m);
    if (m.mention_type === "News story") rec.news_mentions += 1;
    if (m.canonical_publication_id) rec.publication_ids.add(m.canonical_publication_id);
    if (m.country) rec.countries.add(m.country);
    if (m.mention_date && (!rec.latest_date || m.mention_date > rec.latest_date)) rec.latest_date = m.mention_date;
  }

  return [...map.values()]
    .map((r) => {
      const publication_spread = r.publication_ids.size;
      const country_spread = r.countries.size;
      const composite_score = r.weighted_mentions + 0.75 * publication_spread + 0.25 * country_spread;
      return {
        story_key: r.story_key,
        title: r.title,
        url: r.url,
        mentions: r.mentions,
        weighted_mentions: Math.round(r.weighted_mentions * 100) / 100,
        news_mentions: r.news_mentions,
        publication_spread,
        country_spread,
        latest_date: r.latest_date,
        composite_score,
      };
    })
    .sort((a, b) => b.composite_score - a.composite_score || b.mentions - a.mentions);
}

function aggregatePublications(mentions) {
  const byId = new Map();
  for (const m of mentions) {
    const id = m.canonical_publication_id;
    if (!id) continue;
    if (!byId.has(id)) {
      const ref = dataModel.canonicalById.get(id);
      byId.set(id, {
        canonical_publication_id: id,
        title: ref?.canonical_title || m.canonical_publication_title || id,
        permalink: ref?.canonical_permalink || "",
        mentions: 0,
        weighted_mentions: 0,
        news_mentions: 0,
        citations: toNumber(ref?.scholar_citations),
      });
    }
    const rec = byId.get(id);
    rec.mentions += 1;
    rec.weighted_mentions += mentionWeight(m);
    if (m.mention_type === "News story") rec.news_mentions += 1;
  }

  const rows = [...byId.values()]
    .map((row) => ({
      ...row,
      weighted_mentions: Math.round(row.weighted_mentions * 100) / 100,
      press_score: Math.round((row.weighted_mentions + 0.12 * row.citations) * 100) / 100,
    }))
    .sort((a, b) => b.press_score - a.press_score || b.mentions - a.mentions || b.citations - a.citations);
  if (rows.length) return rows;

  if (state.publication !== "all") {
    const ref = dataModel.canonicalById.get(state.publication);
    if (ref) {
      return [
        {
          canonical_publication_id: ref.canonical_publication_id,
          title: ref.canonical_title,
          permalink: ref.canonical_permalink,
          mentions: ref.mentions,
          citations: ref.scholar_citations,
        },
      ];
    }
  }

  return dataModel.topPubsGlobal.map((r) => ({
    canonical_publication_id: r.canonical_publication_id,
    title: r.canonical_title,
    permalink: r.canonical_permalink,
    mentions: r.mentions,
    weighted_mentions: r.mentions,
    press_score: r.mentions + 0.12 * toNumber(r.scholar_citations),
    citations: r.scholar_citations,
    news_mentions: 0,
  }));
}

function buildDonutTrendRows(modeALabels, modeARowByLabel) {
  const maxPoints = state.granularity === "month" ? 24 : state.granularity === "quarter" ? 16 : 12;
  const labels = modeALabels.slice(-maxPoints);

  return MIX_BUCKETS.map((bucket) => {
    const points = labels.map((label) => {
      const row = modeARowByLabel.get(label);
      const total = toNumber(row?.total);
      if (total <= 0) return 0;
      return (toNumber(row?.[bucket.key]) / total) * 100;
    });
    const first = points.length ? points[0] : 0;
    const last = points.length ? points[points.length - 1] : 0;
    return {
      key: bucket.key,
      label: bucket.label,
      color: bucket.donut,
      points,
      delta_pp: last - first,
    };
  });
}

function dedupeRecentMentions(mentions, limit = 30) {
  const sorted = [...mentions].sort((a, b) => (b.mention_date || "").localeCompare(a.mention_date || ""));
  const seen = new Set();
  const rows = [];

  for (const m of sorted) {
    const fallbackTitle = normalizeText(m.mention_title);
    const key =
      m.mention_url ||
      m.external_id ||
      m.mention_id ||
      `${fallbackTitle}|${normalizeText(m.domain || m.outlet)}|${m.mention_date || "undated"}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);

    if (looksNoisyTitle(m.mention_title)) continue;

    rows.push(m);
    if (rows.length >= limit) break;
  }

  return rows;
}

function deriveViewModel() {
  const filteredMentions = filterMentions();
  const scopeMentionsNoChannel = filterMentions({ applyChannel: false });

  let timelineRows = buildTimelineRowsFromMentions(filteredMentions);
  if (!timelineRows.length && state.publication === "all" && state.channel === "all") {
    timelineRows = filteredPrecomputedRows();
  }

  const labels = timelineRows.map((row) => row.label);
  if (!labels.length) {
    for (let y = state.yearRange[0]; y <= state.yearRange[1]; y++) {
      labels.push(String(y));
    }
  }

  const rowByLabel = new Map(timelineRows.map((row) => [row.label, row]));

  const modeARows = buildTimelineRowsFromMentions(scopeMentionsNoChannel);
  const modeALabels = modeARows.length ? modeARows.map((row) => row.label) : labels;
  const modeARowByLabel = new Map(modeARows.map((row) => [row.label, row]));
  const modeAStacked = MIX_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    color: bucket.color,
    data: modeALabels.map((label) => toNumber(modeARowByLabel.get(label)?.[bucket.key] || 0)),
  })).filter((ds) => ds.data.some((value) => value > 0));
  const modeATotalLine = modeALabels.map((label) => toNumber(modeARowByLabel.get(label)?.total || 0));
  const donutTrendRows = buildDonutTrendRows(modeALabels, modeARowByLabel);

  const yearLabels = [];
  for (let y = state.yearRange[0]; y <= state.yearRange[1]; y++) {
    yearLabels.push(String(y));
  }
  const newsByYear = new Map();
  for (const m of filteredMentions) {
    if (!m.has_date || !m.year || m.mention_type !== "News story") continue;
    const key = String(m.year);
    newsByYear.set(key, (newsByYear.get(key) || 0) + 1);
  }
  const modeBLabels = yearLabels;
  const modeBCitationBars = modeBLabels.map((year) => toNumber(dataModel.citesPerYear.get(year) || 0));
  const modeBNewsLine = modeBLabels.map((year) => toNumber(newsByYear.get(year) || 0));

  const channelTotals = emptyMixTotals();
  for (const m of scopeMentionsNoChannel) {
    channelTotals[mentionMixBucket(m)] += 1;
  }

  const publications = aggregatePublications(filteredMentions);
  const outlets = aggregateOutlets(filteredMentions);
  const stories = aggregateStories(filteredMentions);
  const newsMentions = filteredMentions.filter((m) => m.mention_type === "News story");
  const recent = dedupeRecentMentions(newsMentions.length ? newsMentions : filteredMentions, 40);
  const majorOutlets = buildMajorOutletRows(newsMentions);
  const newsOutlets = new Set(newsMentions.map((m) => m.outlet).filter(Boolean));
  const reachMatrixRowsRaw = buildReachOutletMatrixRows(newsMentions);
  const impressionRowsRaw = buildOutletImpressionRows(newsMentions);
  const reachMatrixRows = reachMatrixRowsRaw.slice(0, OUTLET_PANEL_TOP_N);
  const impressionRows = impressionRowsRaw.slice(0, OUTLET_PANEL_TOP_N);
  const reachMentionsMatchedAny = newsMentions.reduce((sum, mention) => {
    return sum + (dataModel.reachMentionById.has(mention.mention_id) ? 1 : 0);
  }, 0);
  const reachMentionsExcludedSyndication = newsMentions.reduce((sum, mention) => {
    const reach = dataModel.reachMentionById.get(mention.mention_id);
    if (!reach) return sum;
    const domain = String(reach.domain || mention.domain || "").trim().toLowerCase();
    return sum + (isExcludedReachDomain(domain) ? 1 : 0);
  }, 0);
  const reachMatrixMentionsUsed = reachMatrixRows.reduce((sum, row) => sum + toNumber(row.mentions), 0);
  const reachMatrixRankedMentions = reachMatrixRows.reduce((sum, row) => sum + toNumber(row.ranked_mentions), 0);
  const reachMatrixSummary = {
    outlets: reachMatrixRows.length,
    mentions_total: newsMentions.length,
    mentions_matched_any: reachMentionsMatchedAny,
    mentions_excluded_syndication: reachMentionsExcludedSyndication,
    mentions_used: reachMatrixMentionsUsed,
    mentions_ranked: reachMatrixRankedMentions,
    missing_mentions: Math.max(0, newsMentions.length - reachMentionsMatchedAny),
    ranked_coverage_rate: reachMatrixMentionsUsed ? reachMatrixRankedMentions / reachMatrixMentionsUsed : 0,
  };
  const impressionSummary = {
    outlets_ranked: impressionRows.length,
    total_mid_impressions: impressionRows.reduce((sum, row) => sum + toNumber(row.mid_impressions), 0),
    total_low_impressions: impressionRows.reduce((sum, row) => sum + toNumber(row.low_impressions), 0),
    total_high_impressions: impressionRows.reduce((sum, row) => sum + toNumber(row.high_impressions), 0),
  };

  const countriesMention = aggregateCountries(filteredMentions);
  const countriesForMap = countriesMention.length ? countriesMention : dataModel.altCountries;

  const selectedPub = state.publication === "all" ? null : dataModel.canonicalById.get(state.publication) || null;
  const citationsValue = selectedPub
    ? toNumber(selectedPub.scholar_citations)
    : toNumber(dataModel.metrics.scholar_total_citations);

  const kpis = [
    {
      id: "citations",
      number: fmtNumber(citationsValue),
      label: "Citations",
      meta: selectedPub ? "Selected publication" : "Google Scholar total",
    },
    {
      id: "h-index",
      number: fmtNumber(dataModel.metrics.scholar_h_index),
      label: "h-index",
      meta: "Google Scholar",
    },
    {
      id: "mentions",
      number: fmtNumber(filteredMentions.length),
      label: "Mentions",
      meta: "Altmetric filtered scope",
    },
    {
      id: "news-stories",
      number: fmtNumber(newsMentions.length),
      label: "News stories",
      meta: "Press scope",
    },
    {
      id: "news-outlets",
      number: fmtNumber(newsOutlets.size),
      label: "Outlets",
      meta: "News outlets in scope",
    },
  ];

  const chips = [
    `Updated ${toDisplayDate(dataModel.generated_at_utc)}`,
    `Dated mentions ${fmtNumber(dataModel.metrics.altmetric_dated_mentions)} / ${fmtNumber(dataModel.metrics.altmetric_mentions_total)}`,
    `WOS geo sample ${fmtNumber(dataModel.citationPoints.length)} points`,
  ];
  if (dataModel.reachSummary?.enabled) {
    const reachCoveragePct = Math.round(toNumber(dataModel.reachSummary.ranked_coverage_rate) * 100);
    const offsetDays = fmtNumber(toNumber(dataModel.reachSummary.median_abs_snapshot_offset_days));
    chips.push(`Reach coverage ${reachCoveragePct}% (median snapshot offset ${offsetDays}d)`);
  }

  if (state.channel !== "all") {
    const channelLabel = CHANNEL_OPTIONS.find((x) => x.key === state.channel)?.label || state.channel;
    chips.push(`Channel: ${channelLabel}`);
  }
  if (selectedPub) {
    chips.push(`Publication: ${clipped(selectedPub.canonical_title, 56)}`);
  }
  if (!isDefaultYearRange()) {
    chips.push(`Years: ${state.yearRange[0]}-${state.yearRange[1]}`);
  }

  const undatedInScope = filteredMentions.filter((m) => !m.has_date).length;
  const undatedPulseScope = scopeMentionsNoChannel.filter((m) => !m.has_date).length;
  const timelineHint =
    state.timelineMode === "scholarly_vs_press"
      ? `Dated news in scope: undated rows ${fmtNumber(undatedInScope)}.`
      : `All-channel mix in scope: undated rows ${fmtNumber(undatedPulseScope)}.`;

  const mapHint =
    state.mapMode === "citations"
      ? "Web of Science citing-author geography (2° bins)."
      : "Altmetric mention countries in current filter scope.";

  return {
    subtitle: dataModel.description,
    chips,
    kpis,

    timelineLabels: labels,
    timelineStacked: modeAStacked,
    modeALabels,
    modeATotalLine,
    timelineMode: state.timelineMode,
    modeBLabels,
    modeBCitationBars,
    modeBNewsLine,
    timelineRows,
    timelineHint,

    channelTotals,
    donutTrendRows,
    mapHint,
    mapCitationPoints: dataModel.citationPoints,
    mapMentionCountries: countriesForMap,
    reachMatrixRows,
    reachMatrixSummary,
    impressionRows,
    impressionSummary,

    publications,
    outlets,
    majorOutlets,
    stories,
    recent,
  };
}

function renderHeader(vm) {
  el.idbSubtitle.textContent = `${vm.subtitle} - updated ${toDisplayDate(dataModel.generated_at_utc)}`;
  el.buildMeta.textContent = `Build date: ${toDisplayDate(dataModel.generated_at_utc)}`;
}

function renderTrustChips(vm) {
  el.trustChips.innerHTML = vm.chips.map((chip) => `<span class="idb-chip">${safeText(chip)}</span>`).join("");
}

function renderControls() {
  el.channelSelect.value = state.channel;
  el.publicationSelect.value = state.publication;
  el.granularitySelect.value = state.granularity;
  el.yearMin.value = String(state.yearRange[0]);
  el.yearMax.value = String(state.yearRange[1]);
  el.yearRangeLabel.textContent = `Years (${state.yearRange[0]}-${state.yearRange[1]})`;

  renderButtonGroup(el.mapModeButtons, MAP_MODE_OPTIONS, state.mapMode, (key) => {
    if (key === state.mapMode) return;
    state.mapMode = key;
    setActiveButtonGroupKey(el.mapModeButtons, key);
    void renderMapPanelOnly();
  });

  renderButtonGroup(el.timelineModeButtons, TIMELINE_MODE_OPTIONS, state.timelineMode, (key) => {
    if (key === state.timelineMode) return;
    state.timelineMode = key;
    setActiveButtonGroupKey(el.timelineModeButtons, key);
    renderTimelinePanelOnly();
  });

  renderButtonGroup(
    el.coverageTabs,
    COVERAGE_TAB_OPTIONS,
    state.activeCoverageTab,
    (key) => {
      if (key === state.activeCoverageTab) return;
      state.activeCoverageTab = key;
      setActiveButtonGroupKey(el.coverageTabs, key);
      renderCoveragePanelOnly();
    },
    { role: "tab", ariaSelected: true }
  );

  renderButtonGroup(el.previewButtons, PREVIEW_OPTIONS, state.preview, (key) => {
    state.preview = key;
    renderPreviewTable();
  });
}

function renderKpis(vm) {
  el.kpiRow.innerHTML = vm.kpis
    .map(
      (k) => `<article class="idb-kpi"><div class="idb-kpi-head"><div class="idb-kpi-number">${safeText(
        k.number
      )}</div><div class="idb-kpi-label">${safeText(k.label)}</div></div><div class="idb-kpi-meta">${safeText(
        k.meta
      )}</div></article>`
    )
    .join("");
}

function renderTimeline(vm) {
  charts.timeline?.destroy();

  if (vm.timelineMode === "scholarly_vs_press") {
    charts.timeline = new Chart(el.timelineChart.getContext("2d"), {
      data: {
        labels: vm.modeBLabels,
        datasets: [
          {
            type: "bar",
            label: "Google Scholar citations/year",
            data: vm.modeBCitationBars,
            yAxisID: "y",
            backgroundColor: COLORS.citationsBar,
            borderColor: COLORS.citationsBarEdge,
            hoverBackgroundColor: "rgba(40, 103, 178, 0.56)",
            hoverBorderColor: COLORS.citationsBarEdge,
            borderWidth: 1,
            borderRadius: 2,
          },
          {
            type: "line",
            label: "News mentions/year",
            data: vm.modeBNewsLine,
            yAxisID: "y2",
            borderColor: COLORS.news,
            backgroundColor: COLORS.news,
            borderWidth: 2,
            pointRadius: 1.6,
            pointHoverRadius: 2.5,
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            ticks: {
              autoSkip: true,
              maxTicksLimit: 9,
              maxRotation: 0,
              minRotation: 0,
            },
          },
          y: { beginAtZero: true, title: { display: true, text: "Citations" } },
          y2: {
            beginAtZero: true,
            position: "right",
            title: { display: true, text: "News mentions" },
            grid: { drawOnChartArea: false },
          },
        },
        plugins: {
          legend: { position: "top" },
        },
      },
    });
    el.timelineLead.textContent = "Citations/year (bars) and news mentions/year (line).";
  } else {
    charts.timeline = new Chart(el.timelineChart.getContext("2d"), {
      data: {
        labels: vm.modeALabels,
        datasets: [
          ...vm.timelineStacked.map((d) => ({
            type: "bar",
            label: d.label,
            data: d.data,
            stack: "mentions",
            backgroundColor: d.color,
            borderWidth: 0,
            yAxisID: "y",
          })),
          {
            type: "line",
            label: "Total mentions",
            data: vm.modeATotalLine,
            yAxisID: "y",
            borderColor: COLORS.mentionsTotal,
            backgroundColor: COLORS.mentionsTotal,
            borderWidth: 2,
            pointRadius: 1.2,
            pointHoverRadius: 2.2,
            tension: 0.22,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            ticks: {
              autoSkip: state.granularity !== "month",
              maxTicksLimit: state.granularity === "month" ? undefined : 10,
              maxRotation: state.granularity === "month" ? 50 : 0,
              minRotation: state.granularity === "month" ? 50 : 0,
              callback(value, index) {
                if (state.granularity === "month" && index % 2 === 1) return "";
                return this.getLabelForValue(value);
              },
            },
          },
          y: { stacked: true, beginAtZero: true, title: { display: true, text: "Mentions" } },
        },
        plugins: {
          legend: { position: "top" },
        },
      },
    });
    el.timelineLead.textContent = "Channel mix over time with total mentions.";
  }

  el.timelineHint.textContent = vm.timelineHint;
}

function renderDonut(vm) {
  const segments = MIX_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    value: toNumber(vm.channelTotals[bucket.key]),
    color: bucket.donut,
  })).filter((seg) => seg.value > 0);

  // Keep chart renderable in edge cases where all segment totals are zero.
  const safeSegments = segments.length
    ? segments
    : [{ key: "none", label: "No data", value: 1, color: "#c9d5e6" }];

  charts.donut?.destroy();
  charts.donut = new Chart(el.donutChart.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: safeSegments.map((seg) => seg.label),
      datasets: [
        {
          data: safeSegments.map((seg) => seg.value),
          backgroundColor: safeSegments.map((seg) => seg.color),
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "right" },
      },
    },
  });

  renderDonutTrends(vm);
}

function sparklinePath(points, width, height) {
  if (!points.length) return "";
  if (points.length === 1) {
    const y = height - (Math.max(0, Math.min(100, toNumber(points[0]))) / 100) * height;
    return `M 0 ${y.toFixed(2)} L ${width.toFixed(2)} ${y.toFixed(2)}`;
  }

  const step = width / (points.length - 1);
  return points
    .map((point, index) => {
      const x = index * step;
      const clamped = Math.max(0, Math.min(100, toNumber(point)));
      const y = height - (clamped / 100) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function sparklineAreaPath(points, width, height) {
  if (!points.length) return "";
  if (points.length === 1) {
    const clamped = Math.max(0, Math.min(100, toNumber(points[0])));
    const y = height - (clamped / 100) * height;
    return `M 0 ${height.toFixed(2)} L 0 ${y.toFixed(2)} L ${width.toFixed(2)} ${y.toFixed(2)} L ${width.toFixed(2)} ${height.toFixed(
      2
    )} Z`;
  }

  const step = width / (points.length - 1);
  const curve = points
    .map((point, index) => {
      const x = index * step;
      const clamped = Math.max(0, Math.min(100, toNumber(point)));
      const y = height - (clamped / 100) * height;
      return `${index === 0 ? "L" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  return `M 0 ${height.toFixed(2)} ${curve} L ${width.toFixed(2)} ${height.toFixed(2)} Z`;
}

function renderDonutTrends(vm) {
  const rows = Array.isArray(vm.donutTrendRows) ? vm.donutTrendRows : [];
  if (!rows.length) {
    el.donutTrends.innerHTML = '<p class="idb-empty">No trend data.</p>';
    return;
  }

  const width = 140;
  const height = 18;
  el.donutTrends.innerHTML = rows
    .map((row) => {
      const path = sparklinePath(row.points, width, height);
      const areaPath = sparklineAreaPath(row.points, width, height);
      const delta = toNumber(row.delta_pp);
      const deltaClass = delta > 0.1 ? "up" : delta < -0.1 ? "down" : "flat";
      const deltaText = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}pp`;
      return `<div class="idb-donut-trend-row"><span class="idb-donut-trend-label">${safeText(
        row.label
      )}</span><svg class="idb-donut-trend-spark" viewBox="0 0 ${safeText(width)} ${safeText(
        height
      )}" preserveAspectRatio="none" aria-hidden="true"><path class="idb-donut-trend-track" d="M 0 ${safeText(
        (height / 2).toFixed(2)
      )} L ${safeText(width.toFixed(2))} ${safeText(
        (height / 2).toFixed(2)
      )}"></path><path class="idb-donut-trend-area" style="fill:${safeText(row.color)}" d="${safeText(
        areaPath
      )}"></path><path class="idb-donut-trend-line" style="stroke:${safeText(row.color)}" d="${safeText(
        path
      )}"></path></svg><span class="idb-donut-trend-delta ${safeText(deltaClass)}">${safeText(deltaText)}</span></div>`;
    })
    .join("");
}

function binCitationPoints(points, binDegrees = 2) {
  const byBin = new Map();
  for (const p of points) {
    const lat = Math.round(p.lat / binDegrees) * binDegrees;
    const lon = Math.round(p.lon / binDegrees) * binDegrees;
    const key = `${lat},${lon}`;
    byBin.set(key, (byBin.get(key) || 0) + p.value);
  }

  return [...byBin.entries()]
    .map(([key, value]) => {
      const [lat, lon] = key.split(",").map(Number);
      return { lat, lon, value };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 350);
}

async function ensureWorldCountries() {
  if (worldCountries) return worldCountries;

  let topo = null;
  let lastStatus = 0;
  for (const url of WORLD_TOPO_URLS) {
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) {
        lastStatus = res.status;
        continue;
      }
      topo = await res.json();
      break;
    } catch {
      // Try fallback URL.
    }
  }
  if (!topo) {
    throw new Error(`Failed to load world topojson${lastStatus ? `: ${lastStatus}` : ""}`);
  }

  if (window.topojson?.feature) {
    worldCountries = window.topojson.feature(topo, topo.objects.countries).features;
    return worldCountries;
  }
  if (window.ChartGeo?.topojson?.feature) {
    worldCountries = window.ChartGeo.topojson.feature(topo, topo.objects.countries).features;
    return worldCountries;
  }

  throw new Error("No topojson feature parser available.");
}

function normalizeCountryForMap(name) {
  const n = String(name || "").trim();
  const alias = {
    USA: "United States of America",
    "United States": "United States of America",
    UK: "United Kingdom",
    Russia: "Russian Federation",
    "Korea, South": "Republic of Korea",
    "South Korea": "Republic of Korea",
    Iran: "Islamic Republic of Iran",
    Venezuela: "Venezuela (Bolivarian Republic of)",
    Czechia: "Czech Republic",
  };
  return alias[n] || n;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function logNormalize(value, minPositive, maxPositive) {
  if (value <= 0) return 0;
  if (maxPositive <= minPositive) return 1;
  const lo = Math.log10(minPositive);
  const hi = Math.log10(maxPositive);
  const v = Math.log10(value);
  return Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
}

function mentionChoroplethColor(value, minPositive, maxPositive) {
  if (value <= 0) return "rgba(233, 239, 246, 0.92)";
  const t = logNormalize(value, minPositive, maxPositive);
  const low = [182, 212, 240];
  const high = [43, 111, 169];
  const r = Math.round(lerp(low[0], high[0], t));
  const g = Math.round(lerp(low[1], high[1], t));
  const b = Math.round(lerp(low[2], high[2], t));
  const a = lerp(0.54, 0.9, t);
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

function renderMapFallbackBar(countries, options = {}) {
  const { logX = false } = options;
  charts.map?.destroy();
  const rows = countries.slice(0, 12);
  charts.map = new Chart(el.mapChart.getContext("2d"), {
    type: "bar",
    data: {
      labels: rows.length ? rows.map((r) => r.country) : ["No data"],
      datasets: [
        {
          data: rows.length ? rows.map((r) => r.mentions) : [0],
          backgroundColor: COLORS.geoBar,
          label: "Mentions",
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: logX
          ? {
              type: "logarithmic",
              min: 1,
              ticks: {
                callback: (value) => fmtNumber(value),
              },
            }
          : { beginAtZero: true },
      },
    },
  });
}

async function renderMap(vm, token) {
  if (token !== renderToken) return;

  if (state.mapMode === "citations") {
    try {
      const countries = await ensureWorldCountries();
      if (token !== renderToken) return;

      const bubbles = binCitationPoints(vm.mapCitationPoints, 2).map((row) => ({
        x: row.lon,
        y: row.lat,
        r: Math.max(2, Math.sqrt(row.value) * 0.8),
        value: row.value,
      }));

      charts.map?.destroy();
      charts.map = new Chart(el.mapChart.getContext("2d"), {
        type: "bubbleMap",
        data: {
          datasets: [
            {
              label: "Citing authors (binned)",
              outline: countries,
              showOutline: true,
              outlineBackgroundColor: "#f5f7fa",
              backgroundColor: COLORS.bubble,
              hoverBackgroundColor: COLORS.bubbleHover,
              data: bubbles,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            projection: { axis: "x", projection: "equalEarth" },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${fmtNumber(ctx.raw.value)} citing publications`,
              },
            },
          },
        },
      });

      el.mapHint.textContent = vm.mapHint;
      return;
    } catch {
      // Fallback scatter view if map libs/topojson fail.
      const bubbles = binCitationPoints(vm.mapCitationPoints, 2);
      charts.map?.destroy();
      charts.map = new Chart(el.mapChart.getContext("2d"), {
        type: "bubble",
        data: {
          datasets: [
            {
              label: "Citing authors (fallback)",
              data: bubbles.map((b) => ({ x: b.lon, y: b.lat, r: Math.max(2, Math.sqrt(b.value) * 0.8), value: b.value })),
              backgroundColor: COLORS.bubble,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { min: -180, max: 180, title: { display: true, text: "Longitude" } },
            y: { min: -90, max: 90, title: { display: true, text: "Latitude" } },
          },
        },
      });
      el.mapHint.textContent = "Fallback scatter for citation geography.";
      return;
    }
  }

  try {
    const countries = await ensureWorldCountries();
    if (token !== renderToken) return;

    const valueMap = new Map(vm.mapMentionCountries.map((row) => [normalizeCountryForMap(row.country), row.mentions]));
    const choroplethData = countries.map((feature) => ({
      feature,
      value: toNumber(valueMap.get(feature.properties.name) || 0),
    }));
    const positiveValues = choroplethData.map((row) => toNumber(row.value)).filter((v) => v > 0);
    const minPositive = positiveValues.length ? Math.min(...positiveValues) : 1;
    const maxPositive = positiveValues.length ? Math.max(...positiveValues) : 1;

    charts.map?.destroy();
    charts.map = new Chart(el.mapChart.getContext("2d"), {
      type: "choropleth",
      data: {
        labels: countries.map((f) => f.properties.name),
        datasets: [
          {
            label: "Mentions by country",
            outline: countries,
            data: choroplethData,
            backgroundColor: (ctx) => mentionChoroplethColor(toNumber(ctx.raw?.value || 0), minPositive, maxPositive),
            borderColor: (ctx) =>
              toNumber(ctx.raw?.value || 0) > 0 ? "rgba(52, 90, 130, 0.55)" : "rgba(203, 215, 228, 0.58)",
            borderWidth: 0.6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          projection: { axis: "x", projection: "equalEarth" },
        },
      },
    });

    el.mapHint.textContent = vm.mapHint;
  } catch {
    renderMapFallbackBar(vm.mapMentionCountries, { logX: true });
    el.mapHint.textContent = "Fallback country bars (log scale).";
  }
}

function matrixColorForReach(score) {
  const t = Math.min(1, Math.max(0, toNumber(score) / 100));
  const low = [197, 218, 242];
  const high = [29, 99, 163];
  const r = Math.round(lerp(low[0], high[0], t));
  const g = Math.round(lerp(low[1], high[1], t));
  const b = Math.round(lerp(low[2], high[2], t));
  return `rgba(${r}, ${g}, ${b}, 0.78)`;
}

function matrixBorderColorForReach(score) {
  const t = Math.min(1, Math.max(0, toNumber(score) / 100));
  const low = [106, 130, 158];
  const high = [20, 77, 132];
  const r = Math.round(lerp(low[0], high[0], t));
  const g = Math.round(lerp(low[1], high[1], t));
  const b = Math.round(lerp(low[2], high[2], t));
  return `rgba(${r}, ${g}, ${b}, 0.95)`;
}

function renderReachMatrix(vm) {
  if (!el.reachMatrixChart || !el.reachMatrixHint) return;

  charts.reachMatrix?.destroy();

  const rows = (vm.reachMatrixRows || []).slice(0, OUTLET_PANEL_TOP_N);
  if (!rows.length) {
    const ctx = el.reachMatrixChart.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, el.reachMatrixChart.width, el.reachMatrixChart.height);
    }
    el.reachMatrixHint.textContent = "No reach-ranked news mentions are available in the current filter scope.";
    return;
  }

  const labels = rows.map((row) => clipped(row.outlet || "Unknown outlet", 42));
  const data = rows.map((row) => toNumber(row.impact_score));

  charts.reachMatrix = new Chart(el.reachMatrixChart.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Impact score",
          data,
          backgroundColor: rows.map((row) => matrixColorForReach(row.mean_reach_score)),
          borderColor: rows.map((row) => matrixBorderColorForReach(row.mean_reach_score)),
          borderWidth: 1,
          borderRadius: 5,
          barThickness: 18,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          beginAtZero: true,
          title: { display: true, text: "Impact score (mentions x reach/100)" },
          ticks: {
            callback(value) {
              return Number.isFinite(value) ? value.toFixed(1) : "";
            },
          },
        },
        y: {
          ticks: { autoSkip: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title(items) {
              const i = items?.[0]?.dataIndex ?? -1;
              const row = rows[i];
              return row ? clipped(row.outlet || "Outlet", 70) : "Outlet";
            },
            label(ctx) {
              const row = rows[ctx.dataIndex];
              if (!row) return "";
              return [
                `Impact score: ${row.impact_score.toFixed(2)}`,
                `Mentions: ${fmtNumber(row.mentions)}`,
                `Avg reach score: ${row.mean_reach_score.toFixed(1)}`,
                `Publication spread: ${fmtNumber(row.publication_spread)}`,
                `Domains observed: ${fmtNumber(row.domain_count)} (top: ${row.top_domain || "n/a"})`,
                `Rank coverage: ${Math.round(toNumber(row.coverage_rate) * 100)}%`,
              ];
            },
          },
        },
      },
    },
  });

  const summary = vm.reachMatrixSummary || {};
  const coveragePct = Math.round(toNumber(summary.ranked_coverage_rate) * 100);
  let hint = `Top ${fmtNumber(rows.length)} outlets by impact score. Reach matched for ${fmtNumber(summary.mentions_matched_any)} of ${fmtNumber(
    summary.mentions_total
  )} news mentions (${coveragePct}% chart coverage).`;
  if (toNumber(summary.missing_mentions) > 0) {
    hint += ` Missing reach rows: ${fmtNumber(summary.missing_mentions)}.`;
  }
  el.reachMatrixHint.textContent = hint;
}

function renderImpressionsPanel(vm) {
  if (!el.impressionsEstimateChart || !el.impressionsEstimateHint) return;

  charts.impressionsEstimate?.destroy();

  const rows = (vm.impressionRows || []).slice(0, OUTLET_PANEL_TOP_N);
  if (!rows.length) {
    const ctx = el.impressionsEstimateChart.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, el.impressionsEstimateChart.width, el.impressionsEstimateChart.height);
    }
    el.impressionsEstimateHint.textContent = "No impression estimates are available in this filter scope.";
    return;
  }

  const labels = rows.map((row) => clipped(row.outlet || "Unknown outlet", 36));
  const rangeData = rows.map((row, idx) => ({
    x: [toNumber(row.low_impressions), toNumber(row.high_impressions)],
    y: labels[idx],
    row,
  }));
  const lowCapData = rows.map((row, idx) => ({
    x: toNumber(row.low_impressions),
    y: labels[idx],
    row,
  }));
  const highCapData = rows.map((row, idx) => ({
    x: toNumber(row.high_impressions),
    y: labels[idx],
    row,
  }));
  const midData = rows.map((row, idx) => ({
    x: toNumber(row.mid_impressions),
    y: labels[idx],
    row,
  }));
  const positiveLows = rows.map((row) => toNumber(row.low_impressions)).filter((value) => value > 0);
  const positiveHighs = rows.map((row) => toNumber(row.high_impressions)).filter((value) => value > 0);
  const axisMinRaw = positiveLows.length ? Math.min(...positiveLows) : 1_000;
  const axisMaxRaw = positiveHighs.length ? Math.max(...positiveHighs) : 1_000_000;
  const axisMin = Math.max(1, Math.pow(10, Math.floor(Math.log10(axisMinRaw))));
  const axisMax = Math.max(axisMin * 10, Math.pow(10, Math.ceil(Math.log10(axisMaxRaw))));

  charts.impressionsEstimate = new Chart(el.impressionsEstimateChart.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Low-high range",
          data: rangeData,
          backgroundColor: "rgba(57, 140, 210, 0.18)",
          borderColor: "rgba(40, 103, 178, 0.85)",
          borderWidth: 2,
          borderRadius: 0,
          barThickness: 6,
        },
        {
          type: "scatter",
          label: "Low",
          data: lowCapData,
          showLine: false,
          pointRadius: 3.2,
          pointHoverRadius: 3.8,
          pointStyle: "rect",
          pointBackgroundColor: "rgba(40, 103, 178, 0.88)",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 0.8,
        },
        {
          type: "scatter",
          label: "High",
          data: highCapData,
          showLine: false,
          pointRadius: 3.2,
          pointHoverRadius: 3.8,
          pointStyle: "rect",
          pointBackgroundColor: "rgba(40, 103, 178, 0.88)",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 0.8,
        },
        {
          type: "line",
          label: "Mid",
          data: midData,
          showLine: false,
          pointRadius: 4,
          pointHoverRadius: 4.8,
          pointBackgroundColor: "rgba(20, 77, 132, 0.96)",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      interaction: { mode: "nearest", intersect: true },
      scales: {
        x: {
          type: "logarithmic",
          min: axisMin,
          max: axisMax,
          title: { display: true, text: "Potential impressions (modeled)" },
          ticks: {
            callback(value) {
              const n = toNumber(value);
              if (n <= 0) return "";
              const p = Math.log10(n);
              if (Math.abs(p - Math.round(p)) > 1e-6) return "";
              return fmtCompactNumber(n);
            },
          },
        },
        y: {
          ticks: { autoSkip: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title(items) {
              const row = items?.[0]?.raw?.row;
              return row ? clipped(row.outlet || "Outlet", 70) : "Outlet";
            },
            label(ctx) {
              const row = ctx.raw?.row;
              if (!row) return "";
              return [
                `Low-high: ${fmtCompactNumber(row.low_impressions)} - ${fmtCompactNumber(row.high_impressions)}`,
                `Mid: ${fmtCompactNumber(row.mid_impressions)}`,
                `Mentions: ${fmtNumber(row.mentions)} | Pubs: ${fmtNumber(row.publication_spread)}`,
              ];
            },
          },
        },
      },
    },
  });

  const summary = vm.impressionSummary || {};
  const totalLow = fmtCompactNumber(summary.total_low_impressions || 0);
  const totalMid = fmtCompactNumber(summary.total_mid_impressions || 0);
  const totalHigh = fmtCompactNumber(summary.total_high_impressions || 0);

  el.impressionsEstimateHint.textContent = `Top ${fmtNumber(rows.length)} outlets by modeled impressions. Chart total: ${totalLow} - ${totalHigh} (mid ${totalMid}).`;
}

function coverageRowsForTab(vm) {
  if (state.activeCoverageTab === "major_outlets") {
    return vm.majorOutlets.slice(0, 14).map((row) => ({
      title: row.outlet,
      subtitle: `Prominence ${row.prominence_score.toFixed(3)} • Confidence ${row.confidence.toFixed(2)} • Stories ${fmtNumber(
        row.unique_stories
      )} • Years ${fmtNumber(row.persistence_years)}`,
      count: row.mentions,
      url: "",
    }));
  }

  if (state.activeCoverageTab === "outlets") {
    return vm.outlets.slice(0, 14).map((row) => ({
      title: row.outlet,
      subtitle: `News ${fmtNumber(row.news_mentions)} • Spread ${fmtNumber(row.publication_spread)}`,
      count: row.mentions,
      url: "",
    }));
  }

  if (state.activeCoverageTab === "stories") {
    return vm.stories.slice(0, 14).map((row) => ({
      title: row.title,
      subtitle: `News ${fmtNumber(row.news_mentions)} • Spread ${fmtNumber(row.publication_spread)} pubs`,
      count: row.mentions,
      url: row.url,
    }));
  }

  if (state.activeCoverageTab === "recent") {
    return vm.recent.slice(0, 20).map((row) => ({
      title: row.mention_title || "Untitled mention",
      subtitle: `${row.outlet} - ${row.country || "Unknown"} - ${row.mention_date || "undated"}`,
      count: "",
      url: row.mention_url,
    }));
  }

  return vm.publications.slice(0, 14).map((row) => ({
    title: row.title,
    subtitle: `${fmtNumber(row.news_mentions || 0)} news • ${fmtNumber(row.citations)} citations`,
    count: row.mentions,
    url: row.permalink || "",
  }));
}

function renderCoverage(vm) {
  const rows = coverageRowsForTab(vm);

  if (!rows.length) {
    el.coverageList.innerHTML = '<li class="idb-empty">No rows in this filtered scope.</li>';
    return;
  }

  el.coverageList.innerHTML = rows
    .map((row) => {
      const title = clipped(row.title, 88);
      const count = row.count === "" ? "" : fmtNumber(row.count);
      const link = row.url
        ? `<a class="idb-row-title" href="${safeText(row.url)}" target="_blank" rel="noopener">${safeText(title)}</a>`
        : `<span class="idb-row-title">${safeText(title)}</span>`;
      return `<li class="idb-row"><div class="idb-row-main">${link}<div class="idb-row-sub">${safeText(
        row.subtitle || ""
      )}</div></div><span class="idb-row-count">${safeText(count)}</span></li>`;
    })
    .join("");
}

function previewRows(vm) {
  if (state.preview === "news") {
    return vm.recent
      .filter((m) => m.mention_type === "News story")
      .map((m) => ({
        date: m.mention_date || "",
        outlet: m.outlet,
        country: m.country || "",
        title: m.mention_title || "",
        url: m.mention_url || "",
      }));
  }

  if (state.preview === "social") {
    return filterMentions()
      .filter((m) => m.super_category === "social")
      .map((m) => ({
        date: m.mention_date || "",
        type: m.mention_type || "",
        outlet: m.outlet,
        title: m.mention_title || "",
        url: m.mention_url || "",
      }));
  }

  if (state.preview === "outlets") {
    return vm.outlets.map((r) => ({
      outlet: r.outlet,
      mentions: r.mentions,
      publication_spread: r.publication_spread,
      composite_score: r.composite_score,
      latest_date: r.latest_date || "",
    }));
  }

  if (state.preview === "stories") {
    return vm.stories.map((r) => ({
      title: r.title,
      mentions: r.mentions,
      publication_spread: r.publication_spread,
      country_spread: r.country_spread,
      latest_date: r.latest_date || "",
      url: r.url || "",
    }));
  }

  if (state.preview === "reconciliation") {
    return dataModel.canonicalPublications.map((r) => ({
      canonical_publication_id: r.canonical_publication_id,
      canonical_title: r.canonical_title,
      canonical_doi: r.canonical_doi || "",
      canonical_year: r.canonical_year || "",
      mentions: r.mentions,
      scholar_citations: r.scholar_citations,
      altmetric_tracking_state: r.altmetric_tracking_state || "",
      is_external_only: r.is_external_only,
    }));
  }

  return filterMentions().map((m) => ({
    mention_id: m.mention_id,
    canonical_publication_id: m.canonical_publication_id,
    canonical_publication_title: m.canonical_publication_title,
    mention_type: m.mention_type,
    super_category: m.super_category,
    mention_date: m.mention_date,
    outlet: m.outlet,
    country: m.country,
    mention_title: m.mention_title,
    mention_url: m.mention_url,
  }));
}

function renderDownloadLinks() {
  const catalog = dataModel.dataset_catalog || [];
  if (!catalog.length) {
    el.downloadLinks.innerHTML = '<span class="idb-empty">No export catalog found in this artifact.</span>';
    return;
  }

  el.downloadLinks.innerHTML = catalog
    .map(
      (d) =>
        `<span>${safeText(d.name)}: <a href="${safeText(d.csv_path)}" download>CSV</a> <a href="${safeText(
          d.json_path
        )}" download>JSON</a></span>`
    )
    .join(" • ");
}

function renderPreviewTable() {
  const vm = deriveViewModel();
  const allRows = previewRows(vm);
  const query = state.previewSearch.trim().toLowerCase();

  const filtered = query
    ? allRows.filter((row) => Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(query)))
    : allRows;

  const limited = filtered.slice(0, 120);

  const fields = [];
  const seen = new Set();
  for (const row of limited) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        fields.push(key);
      }
    }
  }

  el.previewThead.innerHTML = `<tr>${fields.map((f) => `<th>${safeText(f)}</th>`).join("")}</tr>`;
  el.previewTbody.innerHTML = limited
    .map((row) => {
      const tds = fields
        .map((f) => {
          const value = String(row[f] ?? "");
          if (f === "url" || f === "mention_url") {
            if (!value) return "<td></td>";
            return `<td><a href="${safeText(value)}" target="_blank" rel="noopener">link</a></td>`;
          }
          return `<td title="${safeText(value)}">${safeText(clipped(value, 130))}</td>`;
        })
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");

  el.previewHint.textContent = `Showing ${fmtNumber(limited.length)} of ${fmtNumber(filtered.length)} matching rows (${fmtNumber(
    allRows.length
  )} total).`;
}

function renderMethod() {
  const counts = rawDashboard.reconciliation_counts || {};
  el.diagCounts.innerHTML = Object.entries(counts)
    .map(([k, v]) => `<li><strong>${safeText(k)}</strong>: ${fmtNumber(v)}</li>`)
    .join("");

  const scholar = reconciliation?.scholar_unmatched || [];
  el.diagScholar.innerHTML = scholar.length
    ? scholar
        .slice(0, 16)
        .map((row) => `<li>${safeText(clipped(row.title || "Untitled", 120))}</li>`)
        .join("")
    : "<li>None</li>";

  const alt = reconciliation?.altmetric_unmatched || [];
  el.diagAltmetric.innerHTML = alt.length
    ? alt
        .slice(0, 16)
        .map((row) => `<li>${safeText(row.doi || "no-doi")} - ${safeText(clipped(row.title || "Untitled", 92))}</li>`)
        .join("")
    : "<li>None</li>";
}

function renderTimelinePanelOnly() {
  const vm = deriveViewModel();
  renderTimeline(vm);
}

async function renderMapPanelOnly() {
  renderToken += 1;
  const token = renderToken;
  const vm = deriveViewModel();
  await renderMap(vm, token);
}

function renderCoveragePanelOnly() {
  const vm = deriveViewModel();
  renderCoverage(vm);
}

async function renderAll() {
  renderToken += 1;
  const token = renderToken;

  renderControls();

  const vm = deriveViewModel();
  renderHeader(vm);
  renderTrustChips(vm);
  renderKpis(vm);
  renderTimeline(vm);
  renderReachMatrix(vm);
  renderImpressionsPanel(vm);
  renderCoverage(vm);
  renderDonut(vm);
  await renderMap(vm, token);
  if (token !== renderToken) return;
  renderPreviewTable();
}

function initControls() {
  el.channelSelect.innerHTML = CHANNEL_OPTIONS.map((o) => `<option value="${safeText(o.key)}">${safeText(o.label)}</option>`).join("");
  el.granularitySelect.innerHTML = GRANULARITY_OPTIONS.map((o) => `<option value="${safeText(o.key)}">${safeText(o.label)}</option>`).join(
    ""
  );

  const publications = [...dataModel.canonicalPublications].sort((a, b) => b.mentions - a.mentions);
  el.publicationSelect.innerHTML = [
    '<option value="all">All publications</option>',
    ...publications.map(
      (p) =>
        `<option value="${safeText(p.canonical_publication_id)}">${safeText(clipped(p.canonical_title, 88))} (${fmtNumber(p.mentions)})</option>`
    ),
  ].join("");

  const { minYear, maxYear } = dataModel.yearBounds;
  state.yearRange = [minYear, maxYear];

  el.yearMin.min = String(minYear);
  el.yearMin.max = String(maxYear);
  el.yearMax.min = String(minYear);
  el.yearMax.max = String(maxYear);
  el.yearMin.value = String(minYear);
  el.yearMax.value = String(maxYear);

  el.channelSelect.addEventListener("change", () => {
    state.channel = el.channelSelect.value;
    void renderAll();
  });

  el.publicationSelect.addEventListener("change", () => {
    state.publication = el.publicationSelect.value;
    void renderAll();
  });

  el.granularitySelect.addEventListener("change", () => {
    state.granularity = el.granularitySelect.value;
    void renderAll();
  });

  function syncYearRange() {
    const a = toNumber(el.yearMin.value);
    const b = toNumber(el.yearMax.value);
    state.yearRange = [Math.min(a, b), Math.max(a, b)];
    void renderAll();
  }
  el.yearMin.addEventListener("input", syncYearRange);
  el.yearMax.addEventListener("input", syncYearRange);

  el.previewSearch.addEventListener("input", () => {
    state.previewSearch = el.previewSearch.value;
    renderPreviewTable();
  });
}

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

async function loadJsonOptional(path, fallbackValue) {
  try {
    return await loadJson(path);
  } catch (err) {
    console.warn(`Optional dataset unavailable: ${path}`, err);
    return fallbackValue;
  }
}

async function boot() {
  assertRequiredDom();

  const [dashboardData, reconciliationData, reachMentionsData, reachMetadataData] = await Promise.all([
    loadJson(DATA_PATH),
    loadJson(RECON_PATH),
    loadJsonOptional(REACH_MENTIONS_PATH, []),
    loadJsonOptional(REACH_METADATA_PATH, {}),
  ]);

  rawDashboard = dashboardData;
  reconciliation = reconciliationData;
  reachMentionsRaw = Array.isArray(reachMentionsData) ? reachMentionsData : [];
  reachMetadataRaw = reachMetadataData && typeof reachMetadataData === "object" ? reachMetadataData : {};
  dataModel = normalizeData(rawDashboard, reachMentionsRaw, reachMetadataRaw);

  initControls();
  renderDownloadLinks();
  renderMethod();
  await renderAll();

  window.addEventListener("resize", () => {
    Object.values(charts).forEach((chart) => chart?.resize?.());
  });
}

boot().catch((err) => {
  console.error(err);
  root.innerHTML = `<pre style="padding:1rem;color:#900">${safeText(err.message || String(err))}</pre>`;
});
})();

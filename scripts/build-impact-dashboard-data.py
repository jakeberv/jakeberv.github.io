#!/usr/bin/env python3
"""Build deploy-time artifacts for the impact dashboard.

Inputs
- _publications/*.md (canonical publication registry)
- _data/scholar_metrics.json
- _data/map_data.json
- data/altmetric/raw/*.csv

Outputs (default: data/impact/)
- impact_dashboard.json
- impact_reconciliation.json
- exports/*.csv + exports/*.json (cleaned datasets)
"""

from __future__ import annotations

import argparse
import csv
import difflib
import io
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple
from urllib.parse import unquote, urlparse


SOCIAL_TYPES = {"X Post", "Bluesky post", "Facebook post", "Reddit post", "Google+ post"}
MEDIA_REFERENCE_TYPES = {"News story", "Blog post", "Video", "Podcast episode", "Wikipedia page", "Q&A post"}
TWITTER_SNOWFLAKE_EPOCH_MS = 1288834974657
X_STATUS_URL_PREFIX = "https://x.com/i/web/status/"
NON_RESEARCH_TITLE_PATTERNS = [
    re.compile(r"^acknowledg(?:e)?ment to reviewers"),
    re.compile(r"^peer review report for"),
    re.compile(r"^editorial"),
    re.compile(r"^corrigendum"),
    re.compile(r"^erratum"),
    re.compile(r"^correction to"),
]


# Lightweight normalization for common outlet aliases observed in exports.
OUTLET_ALIAS_MAP = {
    "yahoo news": "Yahoo! News",
    "yahoo! news": "Yahoo! News",
    "science daily": "Science Daily",
    "sciencedaily": "Science Daily",
    "eurekalert": "EurekAlert!",
    "eurekalert!": "EurekAlert!",
    "phys.org": "Phys.org",
    "the conversation": "The Conversation",
    "en.wikipedia.org": "Wikipedia (EN)",
    "es.wikipedia.org": "Wikipedia (ES)",
    "fr.wikipedia.org": "Wikipedia (FR)",
    "pt.wikipedia.org": "Wikipedia (PT)",
    "zh.wikipedia.org": "Wikipedia (ZH)",
}


def normalize_text(value: str) -> str:
    value = value or ""
    # Normalize punctuation that otherwise collapses tokens (e.g., K–Pg -> KPg).
    value = re.sub(r"[‐‑‒–—−/]", " ", value)
    value = re.sub(r"[’'`´]", " ", value)
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def canonicalize_scholar_title(value: str) -> str:
    text = clean_free_text(value)
    # Drop trailing parenthetical source suffixes often appended by Scholar records.
    text = re.sub(r"\.\s*\([^)]{8,}\)\s*$", "", text).strip()
    return text


def clean_free_text(value: str) -> str:
    text = (value or "").strip()
    if not text:
        return ""

    # Repair common UTF-8 -> latin1 mojibake fragments seen in some exports.
    if re.search(r"(?:Ã.|Â.|â..)", text):
        try:
            repaired = text.encode("latin-1").decode("utf-8")
            if repaired:
                text = repaired
        except UnicodeError:
            pass

    text = text.replace("\ufffd", "")
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def compact_title(value: str, limit: int = 92) -> str:
    text = clean_free_text(value)
    if len(text) <= limit:
        return text
    return f"{text[: max(0, limit - 3)].rstrip()}..."


def fmt_int(value: int) -> str:
    return f"{int(value):,}"


def pct(part: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return round((part / total) * 100.0, 1)


def normalize_doi(value: str) -> str:
    v = (value or "").strip().lower()
    if not v:
        return ""
    v = re.sub(r"^https?://(dx\.)?doi\.org/", "", v)
    v = re.sub(r"^doi:\s*", "", v)
    return v.strip()


def extract_doi_from_text(value: str) -> str:
    text = unquote((value or "").strip())
    if not text:
        return ""
    m = re.search(r"(10\.\d{4,9}/[-._;()/:A-Za-z0-9]+)", text, flags=re.IGNORECASE)
    if not m:
        return ""
    doi = m.group(1).rstrip(").,;")
    doi = normalize_doi(doi)
    doi = re.sub(r"\.pdf$", "", doi, flags=re.IGNORECASE)
    doi = re.sub(r"/(abstract|full|pdf)$", "", doi, flags=re.IGNORECASE)
    doi = re.sub(r"/\d+/(?:[^/]+\.pdf)$", "", doi, flags=re.IGNORECASE)

    parts = doi.split("/")
    if len(parts) >= 5 and parts[-2].isdigit():
        tail = parts[-1].lower()
        prev = parts[-3].lower()
        if tail == prev:
            parts = parts[:-2]
            doi = "/".join(parts)

    return normalize_doi(doi)


def parse_maybe_date(value: str) -> Optional[datetime]:
    s = (value or "").strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def read_altmetric_csv_rows(csv_path: Path) -> Tuple[List[Dict], str]:
    raw = csv_path.read_bytes()
    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            text = raw.decode(encoding)
            rows = list(csv.DictReader(io.StringIO(text)))
            return rows, encoding
        except UnicodeDecodeError:
            continue

    text = raw.decode("utf-8", errors="replace")
    rows = list(csv.DictReader(io.StringIO(text)))
    return rows, "utf-8-replace"


def parse_x_snowflake_date(external_id: str) -> Optional[datetime]:
    value = (external_id or "").strip()
    if not value or not value.isdigit():
        return None

    try:
        snowflake = int(value)
    except ValueError:
        return None

    try:
        timestamp_ms = (snowflake >> 22) + TWITTER_SNOWFLAKE_EPOCH_MS
        dt_utc = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)
    except (OverflowError, OSError, ValueError):
        return None

    year = dt_utc.year
    if year < 2006 or year > datetime.now(timezone.utc).year + 1:
        return None

    return dt_utc.replace(tzinfo=None)


def infer_mention_date(mention_type: str, external_id: str) -> Optional[datetime]:
    if mention_type == "X Post":
        return parse_x_snowflake_date(external_id)
    return None


def infer_mention_url(mention_type: str, external_id: str) -> str:
    if mention_type != "X Post":
        return ""
    value = (external_id or "").strip()
    if not value.isdigit():
        return ""
    return f"{X_STATUS_URL_PREFIX}{value}"


def month_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m")


def quarter_key(dt: datetime) -> str:
    q = ((dt.month - 1) // 3) + 1
    return f"{dt.year}-Q{q}"


def year_from_text(value: str) -> Optional[int]:
    m = re.search(r"\b(19|20)\d{2}\b", value or "")
    return int(m.group(0)) if m else None


def domain_from_url(url: str) -> str:
    raw = (url or "").strip()
    if not raw:
        return ""
    try:
        host = urlparse(raw).netloc.lower()
    except Exception:
        return ""
    host = re.sub(r"^www\.", "", host)
    return host


def strip_url_tracking(url: str) -> str:
    raw = (url or "").strip()
    if not raw:
        return ""
    p = urlparse(raw)
    if not p.scheme or not p.netloc:
        return raw
    return f"{p.scheme}://{p.netloc}{p.path}".rstrip("/")


def parse_front_matter(md_path: Path) -> Dict[str, str]:
    text = md_path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}

    fm_lines: List[str] = []
    for line in lines[1:]:
        if line.strip() == "---":
            break
        fm_lines.append(line)

    data: Dict[str, str] = {}
    for line in fm_lines:
        if not line or line.startswith("  - ") or line.startswith("-"):
            continue
        m = re.match(r"^([A-Za-z0-9_]+)\s*:\s*(.*)$", line)
        if not m:
            continue
        key, value = m.group(1), m.group(2)
        value = value.strip()
        if value.startswith("'") and value.endswith("'"):
            value = value[1:-1]
        elif value.startswith('"') and value.endswith('"'):
            value = value[1:-1]
        data[key] = value

    return data


@dataclass
class Publication:
    pub_id: str
    title: str
    title_norm: str
    doi: str
    permalink: str
    date: str
    year: Optional[int]
    venue: str
    pub_type: str


@dataclass
class CanonicalPublication:
    canonical_id: str
    canonical_title: str
    canonical_title_norm: str
    canonical_doi: str
    canonical_permalink: str
    canonical_year: Optional[int]
    canonical_venue: str
    source_pub_ids: List[str]
    source_dois: List[str]
    is_external_only: bool


def is_preprint_doi(doi: str) -> bool:
    return bool(doi and doi.startswith("10.1101/"))


def looks_like_preprint(venue: str, doi: str) -> bool:
    v = normalize_text(venue)
    return "biorxiv" in v or "preprint" in v or is_preprint_doi(doi)


def canonicalize_outlet(outlet_or_author: str, domain: str) -> str:
    outlet = (outlet_or_author or "").strip()
    if not outlet or re.fullmatch(r"\d+", outlet):
        outlet = domain or "Unknown"

    normalized = normalize_text(outlet)
    if normalized in OUTLET_ALIAS_MAP:
        return OUTLET_ALIAS_MAP[normalized]

    if domain and normalize_text(domain) in OUTLET_ALIAS_MAP:
        return OUTLET_ALIAS_MAP[normalize_text(domain)]

    if outlet:
        return outlet
    if domain:
        return domain
    return "Unknown"


def mention_super_category(mention_type: str) -> str:
    if mention_type in SOCIAL_TYPES:
        return "social"
    if mention_type in MEDIA_REFERENCE_TYPES:
        return "media_reference"
    return "other"


def normalize_country(value: str) -> str:
    v = (value or "").strip()
    if not v:
        return ""
    if v.lower() == "usa":
        return "United States"
    return v


def cluster_story_key(row: Dict) -> str:
    clean_url = strip_url_tracking(row.get("mention_url", ""))
    title_norm = normalize_text(row.get("mention_title", ""))
    domain = domain_from_url(row.get("mention_url", ""))
    if clean_url:
        return clean_url
    if title_norm:
        return f"{domain}|{title_norm}"
    return f"{domain}|{row.get('external_id', '')}"


def load_publications(publications_dir: Path) -> Tuple[List[Publication], Dict[str, Publication], Dict[str, Publication]]:
    pubs: List[Publication] = []
    pub_by_id: Dict[str, Publication] = {}
    doi_index: Dict[str, Publication] = {}

    for md in sorted(publications_dir.glob("*.md")):
        fm = parse_front_matter(md)
        if not fm:
            continue

        title = clean_free_text(fm.get("title", ""))
        doi = normalize_doi(fm.get("doi", "") or fm.get("link", ""))
        permalink = clean_free_text(fm.get("permalink", ""))
        date = clean_free_text(fm.get("date", ""))
        year = year_from_text(date)
        venue = clean_free_text(fm.get("venue", ""))
        pub_type = clean_free_text(fm.get("type", ""))

        pub_id = permalink.strip("/").replace("/", "__") if permalink else md.stem

        pub = Publication(
            pub_id=pub_id,
            title=title,
            title_norm=normalize_text(title),
            doi=doi,
            permalink=permalink,
            date=date,
            year=year,
            venue=venue,
            pub_type=pub_type,
        )

        pubs.append(pub)
        pub_by_id[pub_id] = pub
        if doi and doi not in doi_index:
            doi_index[doi] = pub

    return pubs, pub_by_id, doi_index


def load_scholar(scholar_json: Path) -> Dict:
    if not scholar_json.exists():
        return {}
    with scholar_json.open("r", encoding="utf-8") as f:
        return json.load(f)


def match_scholar_to_publications(scholar: Dict, pubs: List[Publication]) -> Tuple[Dict[str, Dict], List[Dict], List[Dict]]:
    pub_matches: Dict[str, Dict] = {}
    unmatched: List[Dict] = []
    ignored_non_research: List[Dict] = []

    pubs_by_title = defaultdict(list)
    pubs_by_doi: Dict[str, Publication] = {}
    for p in pubs:
        pubs_by_title[p.title_norm].append(p)
        if p.doi and p.doi not in pubs_by_doi:
            pubs_by_doi[p.doi] = p

    for item in scholar.get("publications", []) or []:
        s_title = canonicalize_scholar_title(item.get("title", ""))
        s_title_norm = normalize_text(s_title)
        s_year = year_from_text(str(item.get("year", "")))
        s_url = clean_free_text(item.get("url", ""))
        s_doi = normalize_doi(item.get("doi", "")) or extract_doi_from_text(s_url)
        s_citations = int(item.get("citations", 0) or 0)

        if s_citations <= 1 and any(p.search(s_title_norm) for p in NON_RESEARCH_TITLE_PATTERNS):
            ignored_non_research.append(
                {
                    "title": s_title,
                    "year": item.get("year", ""),
                    "citations": s_citations,
                    "venue": clean_free_text(item.get("venue", "")),
                    "url": s_url,
                    "reason": "non_research_output",
                }
            )
            continue

        candidates = pubs_by_title.get(s_title_norm, [])

        chosen: Optional[Publication] = None
        confidence = 0.0
        match_method = ""

        if s_doi and s_doi in pubs_by_doi:
            chosen = pubs_by_doi[s_doi]
            confidence = 1.0
            match_method = "exact_doi"

        if not chosen and len(candidates) == 1:
            chosen = candidates[0]
            confidence = 1.0
            match_method = "exact_title"
        elif not chosen and len(candidates) > 1 and s_year is not None:
            year_matches = [c for c in candidates if c.year == s_year]
            if len(year_matches) == 1:
                chosen = year_matches[0]
                confidence = 0.95
                match_method = "exact_title_year"

        if not chosen:
            best_score = 0.0
            best_pub = None
            s_tokens = set(s_title_norm.split())
            for p in pubs:
                p_tokens = set(p.title_norm.split())
                if not s_tokens or not p_tokens:
                    continue
                inter = len(s_tokens & p_tokens)
                union = len(s_tokens | p_tokens)
                score = inter / union
                if p.year and s_year and p.year != s_year:
                    score *= 0.8
                if score > best_score:
                    best_score = score
                    best_pub = p

            if best_pub and best_score >= 0.86:
                chosen = best_pub
                confidence = round(best_score, 3)
                match_method = "fuzzy_title"
            elif best_pub and best_score >= 0.80:
                s_tokens = set(s_title_norm.split())
                p_tokens = set(best_pub.title_norm.split())
                if s_tokens and p_tokens and (s_tokens.issubset(p_tokens) or p_tokens.issubset(s_tokens)):
                    chosen = best_pub
                    confidence = round(best_score, 3)
                    match_method = "fuzzy_subset"
            elif best_pub and best_score >= 0.64 and s_citations <= 1:
                s_tokens = set(s_title_norm.split())
                p_tokens = set(best_pub.title_norm.split())
                year_ok = (s_year is None) or (best_pub.year is None) or (abs(best_pub.year - s_year) <= 3)
                if year_ok and s_tokens and p_tokens and (s_tokens.issubset(p_tokens) or p_tokens.issubset(s_tokens)):
                    chosen = best_pub
                    confidence = round(best_score, 3)
                    match_method = "fuzzy_subset_lowcite"

            if not chosen:
                best_seq = 0.0
                best_seq_pub = None
                for p in pubs:
                    seq = difflib.SequenceMatcher(None, s_title_norm, p.title_norm).ratio()
                    if p.year and s_year and abs(p.year - s_year) > 5:
                        seq *= 0.85
                    if seq > best_seq:
                        best_seq = seq
                        best_seq_pub = p

                year_ok = (s_year is None) or (best_seq_pub is None) or (best_seq_pub.year is None) or (
                    abs(best_seq_pub.year - s_year) <= 3
                )
                if best_seq_pub and year_ok and best_seq >= 0.88:
                    chosen = best_seq_pub
                    confidence = round(best_seq, 3)
                    match_method = "fuzzy_seq_title"

        record = {
            "title": s_title,
            "year": item.get("year", ""),
            "citations": s_citations,
            "venue": clean_free_text(item.get("venue", "")),
            "url": s_url,
            "doi": s_doi,
        }

        if chosen:
            existing = pub_matches.get(chosen.pub_id)
            replace_existing = False
            if not existing:
                replace_existing = True
            else:
                prev_cites = int(existing.get("publication", {}).get("citations", 0) or 0)
                new_cites = int(record.get("citations", 0) or 0)
                if new_cites > prev_cites:
                    replace_existing = True
                elif new_cites == prev_cites and confidence > float(existing.get("confidence", 0.0) or 0.0):
                    replace_existing = True

            if replace_existing:
                pub_matches[chosen.pub_id] = {
                    "publication": record,
                    "confidence": confidence,
                    "match_method": match_method,
                }
        else:
            unmatched.append(record)

    deduped_unmatched: Dict[Tuple[str, str], Dict] = {}
    for row in unmatched:
        key = (normalize_text(row.get("title", "")), str(row.get("year", "")))
        prev = deduped_unmatched.get(key)
        if not prev:
            deduped_unmatched[key] = row
            continue

        prev_cites = int(prev.get("citations", 0) or 0)
        curr_cites = int(row.get("citations", 0) or 0)
        if curr_cites > prev_cites:
            deduped_unmatched[key] = row

    return pub_matches, list(deduped_unmatched.values()), ignored_non_research


def load_map_data(path: Path) -> List[Dict]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_altmetric(altmetric_dir: Path, doi_to_pub: Dict[str, Publication]) -> Tuple[List[Dict], Dict[str, Dict], List[Dict]]:
    mentions: List[Dict] = []
    per_file_summary: Dict[str, Dict] = {}
    unmatched_by_doi: List[Dict] = []

    for csv_path in sorted(altmetric_dir.glob("*.csv")):
        rows, source_encoding = read_altmetric_csv_rows(csv_path)

        if not rows:
            continue

        sample = rows[0]
        doi = normalize_doi(sample.get("DOI", ""))
        title = clean_free_text(sample.get("Research Output Title", ""))
        attention_score = int(float(sample.get("Altmetric Attention Score") or 0))

        matched_pub = doi_to_pub.get(doi)
        pub_id = matched_pub.pub_id if matched_pub else ""

        if not matched_pub:
            unmatched_by_doi.append(
                {
                    "doi": doi,
                    "title": title,
                    "source_file": csv_path.name,
                    "rows": len(rows),
                }
            )

        type_counts: Counter = Counter()
        dated_mentions = 0
        undated_mentions = 0

        for idx, r in enumerate(rows, start=1):
            mtype = clean_free_text(r.get("Mention Type", "")) or "Unknown"
            external_id = clean_free_text(r.get("External Mention ID", ""))
            mdate = parse_maybe_date(r.get("Mention Date", ""))
            if not mdate:
                mdate = infer_mention_date(mtype, external_id)
            has_date = mdate is not None
            if has_date:
                dated_mentions += 1
            else:
                undated_mentions += 1
            type_counts[mtype] += 1

            mention_url_raw = clean_free_text(r.get("Mention URL", ""))
            inferred_mention_url = infer_mention_url(mtype, external_id) if not mention_url_raw else ""
            mention_url = mention_url_raw or inferred_mention_url
            details_page_url = clean_free_text(r.get("Details Page URL", ""))

            # Keep domain clustering tied to direct mention URLs only (real or inferred X status URL).
            mention_link = mention_url or details_page_url
            if mention_url_raw:
                mention_link_source = "mention_url"
            elif inferred_mention_url:
                mention_link_source = "inferred_x_status"
            elif details_page_url:
                mention_link_source = "altmetric_details_url"
            else:
                mention_link_source = ""

            domain = domain_from_url(mention_url)

            mention = {
                "mention_id": f"{csv_path.stem}__{idx}",
                "source_file": csv_path.name,
                "doi": doi,
                "pub_id": pub_id,
                "title": title,
                "mention_type": mtype,
                "super_category": mention_super_category(mtype),
                "mention_date": mdate.isoformat() if mdate else "",
                "year_month": month_key(mdate) if mdate else "",
                "year_quarter": quarter_key(mdate) if mdate else "",
                "year": str(mdate.year) if mdate else "",
                "has_date": has_date,
                "outlet_or_author": clean_free_text(r.get("Outlet or Author", "")),
                "mention_title": clean_free_text(r.get("Mention Title", "")),
                "country": normalize_country(clean_free_text(r.get("Country", ""))),
                "mention_url": mention_url,
                "mention_url_raw": mention_url_raw,
                "inferred_mention_url": inferred_mention_url,
                "details_page_url": details_page_url,
                "mention_link": mention_link,
                "mention_link_source": mention_link_source,
                "external_id": external_id,
                "sentiment": clean_free_text(r.get("Sentiment Analysis", "")),
                "attention_score": attention_score,
                "domain": domain,
            }
            mention["outlet"] = canonicalize_outlet(mention["outlet_or_author"], domain)
            mention["story_cluster_key"] = cluster_story_key(mention)

            mentions.append(mention)

        per_file_summary[csv_path.name] = {
            "doi": doi,
            "title": title,
            "title_norm": normalize_text(title),
            "pub_id": pub_id,
            "attention_score": attention_score,
            "mentions": len(rows),
            "dated_mentions": dated_mentions,
            "undated_mentions": undated_mentions,
            "source_encoding": source_encoding,
            "mention_type_counts": dict(type_counts),
        }

    return mentions, per_file_summary, unmatched_by_doi


def choose_canonical_pub(pub_candidates: List[Publication], altmetric_dois: List[str], altmetric_title: str) -> Tuple[str, str, Optional[int], str, str]:
    # Prefer non-preprint publication MD records when available.
    chosen_pub: Optional[Publication] = None

    non_preprints = [p for p in pub_candidates if not looks_like_preprint(p.venue, p.doi)]
    if non_preprints:
        chosen_pub = sorted(non_preprints, key=lambda p: ((p.year or 9999), p.title))[0]
    elif pub_candidates:
        chosen_pub = sorted(pub_candidates, key=lambda p: ((p.year or 9999), p.title))[0]

    if chosen_pub:
        canonical_title = chosen_pub.title
        canonical_doi = chosen_pub.doi
        canonical_year = chosen_pub.year
        canonical_venue = chosen_pub.venue
        canonical_permalink = chosen_pub.permalink

        # If chosen DOI is preprint and a non-preprint DOI exists in sources, upgrade DOI display.
        if is_preprint_doi(canonical_doi):
            for d in altmetric_dois:
                if d and not is_preprint_doi(d):
                    canonical_doi = d
                    break
        return canonical_title, canonical_doi, canonical_year, canonical_venue, canonical_permalink

    # External-only fallback.
    canonical_title = altmetric_title
    canonical_doi = ""
    for d in altmetric_dois:
        if d:
            canonical_doi = d
            if not is_preprint_doi(d):
                break

    return canonical_title, canonical_doi, None, "", ""


def canonical_record_rank(rec: CanonicalPublication) -> Tuple[int, int, int, int, int]:
    return (
        1 if rec.source_pub_ids else 0,
        1 if rec.canonical_permalink else 0,
        1 if rec.canonical_year else 0,
        0 if is_preprint_doi(rec.canonical_doi) else 1,
        len(rec.canonical_title or ""),
    )


def merge_canonical_group(records: List[CanonicalPublication]) -> CanonicalPublication:
    chosen = max(records, key=canonical_record_rank)
    source_pub_ids = sorted({pid for rec in records for pid in rec.source_pub_ids if pid})
    source_dois = sorted(
        {
            normalize_doi(d)
            for rec in records
            for d in ([rec.canonical_doi] + list(rec.source_dois))
            if normalize_doi(d)
        }
    )

    canonical_doi = normalize_doi(chosen.canonical_doi)
    if not canonical_doi:
        non_preprints = [d for d in source_dois if not is_preprint_doi(d)]
        canonical_doi = non_preprints[0] if non_preprints else (source_dois[0] if source_dois else "")

    return CanonicalPublication(
        canonical_id=chosen.canonical_id,
        canonical_title=chosen.canonical_title,
        canonical_title_norm=normalize_text(chosen.canonical_title),
        canonical_doi=canonical_doi,
        canonical_permalink=chosen.canonical_permalink,
        canonical_year=chosen.canonical_year,
        canonical_venue=chosen.canonical_venue,
        source_pub_ids=source_pub_ids,
        source_dois=source_dois,
        is_external_only=(len(source_pub_ids) == 0),
    )


def merge_canonical_records_by_doi(records: List[CanonicalPublication]) -> List[CanonicalPublication]:
    grouped: Dict[str, List[CanonicalPublication]] = defaultdict(list)
    passthrough_idx = 0

    for rec in records:
        key = normalize_doi(rec.canonical_doi)
        if not key:
            non_preprint = [normalize_doi(d) for d in rec.source_dois if d and not is_preprint_doi(normalize_doi(d))]
            key = non_preprint[0] if non_preprint else ""

        if not key:
            passthrough_idx += 1
            key = f"__no_doi__{passthrough_idx}"
        grouped[key].append(rec)

    merged: List[CanonicalPublication] = []
    for group in grouped.values():
        if len(group) == 1:
            rec = group[0]
            rec.source_dois = sorted({normalize_doi(d) for d in rec.source_dois if normalize_doi(d)})
            rec.canonical_doi = normalize_doi(rec.canonical_doi)
            merged.append(rec)
        else:
            merged.append(merge_canonical_group(group))

    return merged


def build_canonical_publications(
    pubs: List[Publication],
    per_file_summary: Dict[str, Dict],
) -> Tuple[List[CanonicalPublication], Dict[str, str], Dict[str, str]]:
    pubs_by_title: Dict[str, List[Publication]] = defaultdict(list)
    for p in pubs:
        if p.title_norm:
            pubs_by_title[p.title_norm].append(p)

    altmetric_by_title: Dict[str, List[Dict]] = defaultdict(list)
    for row in per_file_summary.values():
        t_norm = row.get("title_norm", "")
        if t_norm:
            altmetric_by_title[t_norm].append(row)

    title_keys = sorted(set(pubs_by_title.keys()) | set(altmetric_by_title.keys()))

    canonical_records: List[CanonicalPublication] = []

    for idx, title_norm in enumerate(title_keys, start=1):
        pub_candidates = pubs_by_title.get(title_norm, [])
        alt_rows = altmetric_by_title.get(title_norm, [])

        source_pub_ids = sorted({p.pub_id for p in pub_candidates})
        source_dois = sorted({d for d in [p.doi for p in pub_candidates] if d} | {r.get("doi", "") for r in alt_rows if r.get("doi")})

        altmetric_title = ""
        if alt_rows:
            altmetric_title = max(alt_rows, key=lambda r: r.get("mentions", 0)).get("title", "")

        canonical_title, canonical_doi, canonical_year, canonical_venue, canonical_permalink = choose_canonical_pub(
            pub_candidates,
            source_dois,
            altmetric_title,
        )

        if not canonical_title:
            canonical_title = altmetric_title or (pub_candidates[0].title if pub_candidates else f"Untitled {idx}")

        canonical_id = f"pub_{idx:03d}"
        rec = CanonicalPublication(
            canonical_id=canonical_id,
            canonical_title=canonical_title,
            canonical_title_norm=title_norm,
            canonical_doi=canonical_doi,
            canonical_permalink=canonical_permalink,
            canonical_year=canonical_year,
            canonical_venue=canonical_venue,
            source_pub_ids=source_pub_ids,
            source_dois=source_dois,
            is_external_only=(len(source_pub_ids) == 0),
        )
        canonical_records.append(rec)

    canonical_records = merge_canonical_records_by_doi(canonical_records)
    canonical_records.sort(key=lambda r: (r.canonical_title_norm, r.canonical_year or 9999, r.canonical_title))

    pub_to_canonical: Dict[str, str] = {}
    doi_to_canonical: Dict[str, str] = {}
    for idx, rec in enumerate(canonical_records, start=1):
        rec.canonical_id = f"pub_{idx:03d}"
        for pub_id in rec.source_pub_ids:
            pub_to_canonical[pub_id] = rec.canonical_id
        for doi in rec.source_dois:
            d = normalize_doi(doi)
            if d:
                doi_to_canonical[d] = rec.canonical_id

    return canonical_records, pub_to_canonical, doi_to_canonical


def attach_canonical_to_mentions(
    mentions: List[Dict],
    canonical_by_id: Dict[str, CanonicalPublication],
    pub_to_canonical: Dict[str, str],
    doi_to_canonical: Dict[str, str],
) -> None:
    for m in mentions:
        canonical_id = ""
        if m.get("pub_id"):
            canonical_id = pub_to_canonical.get(m["pub_id"], "")
        if not canonical_id and m.get("doi"):
            canonical_id = doi_to_canonical.get(m["doi"], "")

        m["canonical_publication_id"] = canonical_id

        if canonical_id and canonical_id in canonical_by_id:
            c = canonical_by_id[canonical_id]
            m["canonical_publication_title"] = c.canonical_title
            m["canonical_doi"] = c.canonical_doi
            m["merged_from_doi"] = m.get("doi", "") if m.get("doi", "") != c.canonical_doi else ""
        else:
            m["canonical_publication_title"] = m.get("title", "")
            m["canonical_doi"] = m.get("doi", "")
            m["merged_from_doi"] = ""


def score_story_clusters(mentions: List[Dict]) -> List[Dict]:
    story_clusters: Dict[str, Dict] = {}

    for m in mentions:
        key = m.get("story_cluster_key") or f"fallback|{m.get('mention_id') or 'x'}"
        rec = story_clusters.get(key)
        if not rec:
            rec = {
                "story_key": key,
                "domain": m.get("domain", ""),
                "title": m.get("mention_title", "") or m.get("title", ""),
                "url": strip_url_tracking(m.get("mention_url", "")),
                "mention_type": m.get("mention_type", ""),
                "mentions": 0,
                "publication_ids": set(),
                "countries": set(),
                "latest_date": "",
            }
            story_clusters[key] = rec

        rec["mentions"] += 1
        if m.get("canonical_publication_id"):
            rec["publication_ids"].add(m["canonical_publication_id"])
        if m.get("country"):
            rec["countries"].add(m["country"])
        if m.get("mention_date") and (not rec["latest_date"] or m["mention_date"] > rec["latest_date"]):
            rec["latest_date"] = m["mention_date"]

    rows: List[Dict] = []
    for rec in story_clusters.values():
        spread = len(rec["publication_ids"])
        country_spread = len(rec["countries"])
        score = rec["mentions"] + 0.75 * spread + 0.25 * country_spread
        rows.append(
            {
                "story_key": rec["story_key"],
                "title": rec["title"],
                "url": rec["url"],
                "domain": rec["domain"],
                "mention_type": rec["mention_type"],
                "mentions": rec["mentions"],
                "publication_spread": spread,
                "country_spread": country_spread,
                "latest_date": rec["latest_date"],
                "composite_score": round(score, 3),
            }
        )

    rows.sort(key=lambda x: (x["composite_score"], x["mentions"]), reverse=True)
    return rows


def score_outlets(mentions: List[Dict]) -> List[Dict]:
    by_outlet: Dict[str, Dict] = {}

    for m in mentions:
        outlet = m.get("outlet") or "Unknown"
        rec = by_outlet.get(outlet)
        if not rec:
            rec = {
                "outlet": outlet,
                "mentions": 0,
                "publication_ids": set(),
                "latest_date": "",
                "domains": set(),
            }
            by_outlet[outlet] = rec

        rec["mentions"] += 1
        if m.get("canonical_publication_id"):
            rec["publication_ids"].add(m["canonical_publication_id"])
        if m.get("domain"):
            rec["domains"].add(m["domain"])
        if m.get("mention_date") and (not rec["latest_date"] or m["mention_date"] > rec["latest_date"]):
            rec["latest_date"] = m["mention_date"]

    rows: List[Dict] = []
    for rec in by_outlet.values():
        spread = len(rec["publication_ids"])
        score = rec["mentions"] + 0.8 * spread
        rows.append(
            {
                "outlet": rec["outlet"],
                "mentions": rec["mentions"],
                "publication_spread": spread,
                "latest_date": rec["latest_date"],
                "domains": ";".join(sorted(rec["domains"])),
                "composite_score": round(score, 3),
            }
        )

    rows.sort(key=lambda x: (x["composite_score"], x["mentions"]), reverse=True)
    return rows


def build_canonical_publication_rows(
    canonical_records: List[CanonicalPublication],
    mentions: List[Dict],
    scholar_matches: Dict[str, Dict],
    pub_by_id: Dict[str, Publication],
    tracked_dois: set,
) -> List[Dict]:
    mention_counts = Counter(m.get("canonical_publication_id", "") for m in mentions if m.get("canonical_publication_id"))

    rows: List[Dict] = []
    for rec in canonical_records:
        pub_ids = rec.source_pub_ids
        source_dois = rec.source_dois

        scholar_citations = 0
        scholar_match_count = 0
        for pub_id in pub_ids:
            s = scholar_matches.get(pub_id)
            if s:
                scholar_match_count += 1
                scholar_citations += int(s.get("publication", {}).get("citations", 0) or 0)

        has_tracked_dataset = any(d in tracked_dois for d in source_dois if d)
        mentions_n = int(mention_counts.get(rec.canonical_id, 0))

        if has_tracked_dataset and mentions_n > 0:
            altmetric_state = "tracked_with_mentions"
        elif has_tracked_dataset and mentions_n == 0:
            altmetric_state = "tracked_no_mentions"
        else:
            altmetric_state = "not_tracked"

        rows.append(
            {
                "canonical_publication_id": rec.canonical_id,
                "canonical_title": rec.canonical_title,
                "canonical_doi": rec.canonical_doi,
                "canonical_permalink": rec.canonical_permalink,
                "canonical_year": rec.canonical_year,
                "canonical_venue": rec.canonical_venue,
                "mentions": mentions_n,
                "scholar_citations": scholar_citations,
                "scholar_match_count": scholar_match_count,
                "source_pub_count": len(pub_ids),
                "source_doi_count": len(source_dois),
                "source_pub_ids": ";".join(pub_ids),
                "source_dois": ";".join(source_dois),
                "is_external_only": rec.is_external_only,
                "altmetric_tracking_state": altmetric_state,
            }
        )

    rows.sort(key=lambda x: (x["mentions"], x["scholar_citations"]), reverse=True)
    return rows


def aggregate_mentions_by_bin(mentions: List[Dict], bin_key: str) -> Dict[str, int]:
    counter = Counter()
    for m in mentions:
        if not m.get("has_date"):
            continue
        key = m.get(bin_key, "")
        if key:
            counter[key] += 1
    return dict(sorted(counter.items()))


def aggregate_mentions_by_bin_channels(mentions: List[Dict], bin_key: str) -> List[Dict]:
    rows: Dict[str, Dict] = {}

    for m in mentions:
        if not m.get("has_date"):
            continue

        label = m.get(bin_key, "")
        if not label:
            continue

        if label not in rows:
            rows[label] = {
                "social": 0,
                "media_reference": 0,
                "other": 0,
                "total": 0,
            }

        super_cat = m.get("super_category", "other")
        if super_cat not in ("social", "media_reference", "other"):
            super_cat = "other"

        rows[label][super_cat] += 1
        rows[label]["total"] += 1

    labels = sorted(rows.keys())
    out: List[Dict] = []
    for label in labels:
        row = rows[label]
        entry = {
            "social": int(row["social"]),
            "media_reference": int(row["media_reference"]),
            "other": int(row["other"]),
            "total": int(row["total"]),
        }
        if bin_key == "year_month":
            entry["year_month"] = label
        elif bin_key == "year_quarter":
            entry["year_quarter"] = label
        else:
            entry["year"] = label
        out.append(entry)

    return out


def build_altmetric_country_counts(mentions: List[Dict]) -> List[Dict]:
    counter = Counter(m.get("country", "") for m in mentions if m.get("country"))
    rows = [{"country": c, "mentions": n} for c, n in counter.most_common()]
    return rows


def pick_top_publications(canonical_publications: List[Dict], metric_key: str, limit: int = 8) -> List[Dict]:
    rows = [r for r in canonical_publications if not r.get("is_external_only")]
    rows.sort(key=lambda x: (int(x.get(metric_key, 0) or 0), int(x.get("mentions", 0) or 0)), reverse=True)

    out: List[Dict] = []
    for r in rows[:limit]:
        out.append(
            {
                "canonical_publication_id": r.get("canonical_publication_id", ""),
                "title": compact_title(r.get("canonical_title", "")),
                "full_title": clean_free_text(r.get("canonical_title", "")),
                "mentions": int(r.get("mentions", 0) or 0),
                "citations": int(r.get("scholar_citations", 0) or 0),
                "permalink": r.get("canonical_permalink", ""),
                "year": r.get("canonical_year", None),
            }
        )
    return out


def build_derived_insights(
    metrics: Dict,
    canonical_publications: List[Dict],
    mentions: List[Dict],
    outlets: List[Dict],
    stories: List[Dict],
    altmetric_countries: List[Dict],
    mentions_by_year: Dict[str, int],
) -> Dict:
    total_mentions = int(metrics.get("altmetric_mentions_total", 0) or 0)
    total_citations = int(metrics.get("scholar_total_citations", 0) or 0)
    tracked_pubs = int(metrics.get("tracked_publications", 0) or 0)

    social_count = sum(1 for m in mentions if m.get("super_category") == "social")
    media_ref_count = sum(1 for m in mentions if m.get("super_category") == "media_reference")
    other_count = max(0, total_mentions - social_count - media_ref_count)

    top_by_mentions = pick_top_publications(canonical_publications, "mentions", limit=8)
    top_by_citations = pick_top_publications(canonical_publications, "scholar_citations", limit=8)

    top_outlets = outlets[:8]
    top_stories = stories[:8]
    top_countries = altmetric_countries[:8]

    top_pub_mentions = top_by_mentions[0] if top_by_mentions else None
    top_pub_citations = top_by_citations[0] if top_by_citations else None
    top_outlet = top_outlets[0] if top_outlets else None
    top_story = top_stories[0] if top_stories else None
    top_country = top_countries[0] if top_countries else None

    top_years = sorted(
        [{"year": y, "mentions": int(n or 0)} for y, n in (mentions_by_year or {}).items() if y],
        key=lambda x: x["mentions"],
        reverse=True,
    )[:3]

    news_mentions = sum(1 for m in mentions if m.get("mention_type") == "News story")
    social_mentions = social_count
    if news_mentions > 0:
        default_evidence_tab = "news"
    elif social_mentions > 0:
        default_evidence_tab = "posts"
    else:
        default_evidence_tab = "stories"

    snapshot_takeaway = (
        f"Across {fmt_int(tracked_pubs)} tracked publications, the dataset captures {fmt_int(total_mentions)} "
        f"Altmetric mentions and {fmt_int(total_citations)} total citations."
    )
    if total_mentions > 0:
        snapshot_takeaway += (
            f" Social contributes {pct(social_count, total_mentions)}%, media/reference contributes "
            f"{pct(media_ref_count, total_mentions)}%."
        )

    if top_pub_mentions and top_pub_citations:
        highlights_takeaway = (
            f'Most mentioned: "{top_pub_mentions["title"]}" ({fmt_int(top_pub_mentions["mentions"])} mentions). '
            f'Most cited: "{top_pub_citations["title"]}" ({fmt_int(top_pub_citations["citations"])} citations).'
        )
    else:
        highlights_takeaway = "Publication highlights will appear here as soon as tracked records are available."

    if top_country:
        reach_takeaway = (
            f'{top_country.get("country", "Unknown")} leads with {fmt_int(top_country.get("mentions", 0) or 0)} mentions; '
            f'{fmt_int(len(altmetric_countries))} countries appear in Altmetric geography.'
        )
    else:
        reach_takeaway = "No Altmetric country data are currently available."

    if top_outlet and top_story:
        evidence_takeaway = (
            f'{top_outlet.get("outlet", "Unknown")} is the top outlet ({fmt_int(top_outlet.get("mentions", 0) or 0)} mentions). '
            f'Top story cluster: "{compact_title(top_story.get("title", ""), 72)}" '
            f'({fmt_int(top_story.get("mentions", 0) or 0)} mentions).'
        )
    else:
        evidence_takeaway = "Evidence summaries will appear here when mention-level records are available."

    highlights_items: List[str] = []
    if top_years:
        highlights_items.append(
            f'Peak coverage: {top_years[0].get("year", "n/a")} ({fmt_int(top_years[0].get("mentions", 0) or 0)} mentions)'
        )
    if top_outlet:
        highlights_items.append(
            f'Top outlet: {top_outlet.get("outlet", "Unknown")} ({fmt_int(top_outlet.get("mentions", 0) or 0)} mentions)'
        )
    if top_pub_mentions:
        highlights_items.append(
            f'Most mentioned paper: {compact_title(top_pub_mentions.get("title", ""), 72)} ({fmt_int(top_pub_mentions.get("mentions", 0) or 0)} mentions)'
        )

    if not highlights_items:
        highlights_items = ["Highlights will appear as more tracked mentions are ingested."]

    return {
        "channel_breakdown": {
            "social": social_count,
            "media_reference": media_ref_count,
            "other": other_count,
        },
        "top_publications_by_mentions": top_by_mentions,
        "top_publications_by_citations": top_by_citations,
        "top_outlets": top_outlets,
        "top_story_clusters": top_stories,
        "top_countries": top_countries,
        "peak_years_by_mentions": top_years,
        "defaults": {
            "evidence_tab": default_evidence_tab,
            "rank_metric": "citations",
            "geo_mode": "citation_geo",
        },
        "takeaways": {
            "snapshot": snapshot_takeaway,
            "highlights": highlights_items,
            "highlights_text": highlights_takeaway,
            "reach": reach_takeaway,
            "evidence": evidence_takeaway,
        },
    }


def csv_write(path: Path, rows: List[Dict]) -> None:
    if not rows:
        path.write_text("", encoding="utf-8")
        return

    fieldnames: List[str] = []
    seen = set()
    for row in rows:
        for key in row.keys():
            if key not in seen:
                seen.add(key)
                fieldnames.append(key)

    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            safe_row = {}
            for key in fieldnames:
                value = row.get(key, "")
                if isinstance(value, (list, dict, set, tuple)):
                    safe_row[key] = json.dumps(list(value) if isinstance(value, set) else value, ensure_ascii=False)
                else:
                    safe_row[key] = value
            writer.writerow(safe_row)


def write_export(out_dir: Path, name: str, rows: List[Dict]) -> Dict:
    json_path = out_dir / f"{name}.json"
    csv_path = out_dir / f"{name}.csv"

    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    csv_write(csv_path, rows)

    return {
        "name": name,
        "json_path": f"/data/impact/exports/{name}.json",
        "csv_path": f"/data/impact/exports/{name}.csv",
        "rows": len(rows),
    }


def build_artifacts(
    pubs: List[Publication],
    pub_by_id: Dict[str, Publication],
    scholar: Dict,
    scholar_matches: Dict[str, Dict],
    scholar_unmatched: List[Dict],
    scholar_ignored_non_research: List[Dict],
    map_data: List[Dict],
    mentions: List[Dict],
    per_file_summary: Dict[str, Dict],
    altmetric_unmatched: List[Dict],
    altmetric_alias_matched: List[Dict],
    canonical_records: List[CanonicalPublication],
    canonical_by_id: Dict[str, CanonicalPublication],
) -> Tuple[Dict, Dict, Dict[str, List[Dict]]]:
    tracked_dois = {normalize_doi(r.get("doi", "")) for r in per_file_summary.values() if r.get("doi")}

    mention_type_counts = Counter(m["mention_type"] for m in mentions)
    social_counts = Counter(m["mention_type"] for m in mentions if m.get("super_category") == "social")
    media_ref_counts = Counter(m["mention_type"] for m in mentions if m.get("super_category") == "media_reference")

    dated_mentions = [m for m in mentions if m.get("has_date")]
    undated_mentions = [m for m in mentions if not m.get("has_date")]

    mentions_by_month_totals = aggregate_mentions_by_bin(mentions, "year_month")
    mentions_by_quarter_totals = aggregate_mentions_by_bin(mentions, "year_quarter")
    mentions_by_year_totals = aggregate_mentions_by_bin(mentions, "year")

    mentions_by_month_rows = aggregate_mentions_by_bin_channels(mentions, "year_month")
    mentions_by_quarter_rows = aggregate_mentions_by_bin_channels(mentions, "year_quarter")
    mentions_by_year_rows = aggregate_mentions_by_bin_channels(mentions, "year")
    altmetric_country_counts = build_altmetric_country_counts(mentions)

    outlets = score_outlets(mentions)
    stories = score_story_clusters(mentions)
    canonical_publications = build_canonical_publication_rows(
        canonical_records=canonical_records,
        mentions=mentions,
        scholar_matches=scholar_matches,
        pub_by_id=pub_by_id,
        tracked_dois=tracked_dois,
    )

    tracked_with_mentions = sum(1 for r in canonical_publications if r["altmetric_tracking_state"] == "tracked_with_mentions")
    tracked_no_mentions = sum(1 for r in canonical_publications if r["altmetric_tracking_state"] == "tracked_no_mentions")
    not_tracked = sum(1 for r in canonical_publications if r["altmetric_tracking_state"] == "not_tracked")

    dashboard = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "description": "Deploy-time generated impact dashboard dataset",
        "metrics": {
            "md_publications_total": len(pubs),
            "canonical_publications_total": len(canonical_publications),
            "scholar_total_citations": int(scholar.get("citations", 0) or 0),
            "scholar_h_index": int(scholar.get("h_index", 0) or 0),
            "scholar_i10_index": int(scholar.get("i10_index", 0) or 0),
            "altmetric_mentions_total": len(mentions),
            "altmetric_dated_mentions": len(dated_mentions),
            "altmetric_undated_mentions": len(undated_mentions),
            "tracked_publications": tracked_with_mentions + tracked_no_mentions,
            "tracked_publication_coverage_ratio": round(
                ((tracked_with_mentions + tracked_no_mentions) / len(canonical_publications)) if canonical_publications else 0.0,
                4,
            ),
        },
        "reconciliation_counts": {
            "tracked_with_mentions": tracked_with_mentions,
            "tracked_no_mentions": tracked_no_mentions,
            "not_tracked": not_tracked,
            "scholar_unmatched": len(scholar_unmatched),
            "scholar_ignored_non_research": len(scholar_ignored_non_research),
            "altmetric_unmatched": len(altmetric_unmatched),
            "altmetric_alias_matched": len(altmetric_alias_matched),
            "ambiguous": 0,
        },
        "citation_series": {
            "cites_per_year": scholar.get("cites_per_year", {}),
            "mentions_by_month": mentions_by_month_rows,
            "mentions_by_quarter": mentions_by_quarter_rows,
            "mentions_by_year": mentions_by_year_rows,
            "mentions_by_month_totals": mentions_by_month_totals,
            "mentions_by_quarter_totals": mentions_by_quarter_totals,
            "mentions_by_year_totals": mentions_by_year_totals,
        },
        "donut_series": {
            "social": [{"name": k, "value": v} for k, v in social_counts.most_common()],
            "media_reference": [{"name": k, "value": v} for k, v in media_ref_counts.most_common()],
            "all_types": {
                "social": int(sum(social_counts.values())),
                "media_reference": int(sum(media_ref_counts.values())),
                "other": int(len(mentions) - sum(social_counts.values()) - sum(media_ref_counts.values())),
            },
            "all_types_list": [{"name": k, "value": v} for k, v in mention_type_counts.most_common()],
        },
        "canonical_publications": canonical_publications,
        "mentions": mentions,
        "outlets": outlets,
        "stories": stories,
        "citation_geography": {
            "points": map_data,
            "locations": len(map_data),
            "total_publication_count": int(sum(int(d.get("publicationCount", 0) or 0) for d in map_data)),
        },
        "altmetric_geography": {
            "countries": altmetric_country_counts,
        },
        "derived_insights": {},
        "dataset_catalog": [],
    }

    dashboard["derived_insights"] = build_derived_insights(
        metrics=dashboard["metrics"],
        canonical_publications=canonical_publications,
        mentions=mentions,
        outlets=outlets,
        stories=stories,
        altmetric_countries=altmetric_country_counts,
        mentions_by_year=mentions_by_year_totals,
    )

    reconciliation = {
        "generated_at_utc": dashboard["generated_at_utc"],
        "summary": dashboard["reconciliation_counts"],
        "scholar_unmatched": scholar_unmatched,
        "scholar_ignored_non_research": scholar_ignored_non_research,
        "altmetric_unmatched": altmetric_unmatched,
        "altmetric_alias_matched": altmetric_alias_matched,
        "tracked_doi_count": len(tracked_dois),
        "tracked_dois": sorted(tracked_dois),
    }

    mentions_clean = []
    for m in mentions:
        mentions_clean.append(
            {
                "mention_id": m.get("mention_id", ""),
                "canonical_publication_id": m.get("canonical_publication_id", ""),
                "canonical_publication_title": m.get("canonical_publication_title", ""),
                "canonical_doi": m.get("canonical_doi", ""),
                "source_doi": m.get("doi", ""),
                "merged_from_doi": m.get("merged_from_doi", ""),
                "mention_type": m.get("mention_type", ""),
                "super_category": m.get("super_category", ""),
                "mention_date": m.get("mention_date", ""),
                "has_date": m.get("has_date", False),
                "year": m.get("year", ""),
                "year_month": m.get("year_month", ""),
                "year_quarter": m.get("year_quarter", ""),
                "outlet": m.get("outlet", ""),
                "outlet_raw": m.get("outlet_or_author", ""),
                "domain": m.get("domain", ""),
                "country": m.get("country", ""),
                "mention_title": m.get("mention_title", ""),
                "mention_url": m.get("mention_url", ""),
                "mention_url_raw": m.get("mention_url_raw", ""),
                "inferred_mention_url": m.get("inferred_mention_url", ""),
                "details_page_url": m.get("details_page_url", ""),
                "mention_link": m.get("mention_link", ""),
                "mention_link_source": m.get("mention_link_source", ""),
                "external_id": m.get("external_id", ""),
                "sentiment": m.get("sentiment", ""),
                "attention_score": m.get("attention_score", 0),
                "source_file": m.get("source_file", ""),
            }
        )

    news_clean = [r for r in mentions_clean if r.get("mention_type") == "News story"]
    social_clean = [r for r in mentions_clean if r.get("super_category") == "social"]

    publication_reconciliation = []
    for row in canonical_publications:
        publication_reconciliation.append(
            {
                "canonical_publication_id": row["canonical_publication_id"],
                "canonical_title": row["canonical_title"],
                "canonical_doi": row["canonical_doi"],
                "canonical_permalink": row["canonical_permalink"],
                "canonical_year": row["canonical_year"],
                "canonical_venue": row["canonical_venue"],
                "altmetric_tracking_state": row["altmetric_tracking_state"],
                "mentions": row["mentions"],
                "scholar_citations": row["scholar_citations"],
                "source_pub_count": row["source_pub_count"],
                "source_doi_count": row["source_doi_count"],
                "source_pub_ids": row["source_pub_ids"],
                "source_dois": row["source_dois"],
                "is_external_only": row["is_external_only"],
            }
        )

    exports = {
        "mentions_all_clean": mentions_clean,
        "news_mentions_clean": news_clean,
        "social_mentions_clean": social_clean,
        "outlets_clean": outlets,
        "story_clusters_clean": stories,
        "publication_reconciliation": publication_reconciliation,
    }

    return dashboard, reconciliation, exports


def main(argv: Optional[Iterable[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Build impact dashboard artifacts")
    parser.add_argument(
        "--repo-root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Path to repository root (default: repository containing this script)",
    )
    parser.add_argument(
        "--out-dir",
        default="",
        help="Output directory (default: <repo-root>/data/impact)",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)

    repo_root = Path(args.repo_root).expanduser().resolve()
    out_dir = (
        Path(args.out_dir).expanduser().resolve()
        if str(args.out_dir).strip()
        else (repo_root / "data" / "impact").resolve()
    )
    out_dir.mkdir(parents=True, exist_ok=True)

    publications_dir = repo_root / "_publications"
    scholar_json = repo_root / "_data" / "scholar_metrics.json"
    map_json = repo_root / "_data" / "map_data.json"
    altmetric_dir = repo_root / "data" / "altmetric" / "raw"

    required_inputs = [publications_dir, scholar_json, map_json, altmetric_dir]
    missing = [p for p in required_inputs if not p.exists()]
    if missing:
        print("Missing required input paths:", file=sys.stderr)
        for p in missing:
            print(f"- {p}", file=sys.stderr)
        return 1

    pubs, pub_by_id, doi_to_pub = load_publications(publications_dir)
    scholar = load_scholar(scholar_json)
    scholar_matches, scholar_unmatched, scholar_ignored_non_research = match_scholar_to_publications(scholar, pubs)
    map_data = load_map_data(map_json)
    mentions, per_file_summary, altmetric_unmatched = load_altmetric(altmetric_dir, doi_to_pub)

    canonical_records, pub_to_canonical, doi_to_canonical = build_canonical_publications(pubs, per_file_summary)
    canonical_by_id = {r.canonical_id: r for r in canonical_records}

    attach_canonical_to_mentions(mentions, canonical_by_id, pub_to_canonical, doi_to_canonical)

    altmetric_unresolved: List[Dict] = []
    altmetric_alias_matched: List[Dict] = []
    for row in altmetric_unmatched:
        doi = normalize_doi(row.get("doi", ""))
        if doi and doi in doi_to_canonical:
            alias_row = dict(row)
            alias_row["canonical_publication_id"] = doi_to_canonical[doi]
            alias_row["reason"] = "doi_alias_or_title_reconciled"
            altmetric_alias_matched.append(alias_row)
        else:
            altmetric_unresolved.append(row)

    dashboard, reconciliation, exports = build_artifacts(
        pubs=pubs,
        pub_by_id=pub_by_id,
        scholar=scholar,
        scholar_matches=scholar_matches,
        scholar_unmatched=scholar_unmatched,
        scholar_ignored_non_research=scholar_ignored_non_research,
        map_data=map_data,
        mentions=mentions,
        per_file_summary=per_file_summary,
        altmetric_unmatched=altmetric_unresolved,
        altmetric_alias_matched=altmetric_alias_matched,
        canonical_records=canonical_records,
        canonical_by_id=canonical_by_id,
    )

    exports_dir = out_dir / "exports"
    exports_dir.mkdir(parents=True, exist_ok=True)

    catalog = []
    for name, rows in exports.items():
        catalog.append(write_export(exports_dir, name, rows))

    dashboard["dataset_catalog"] = catalog

    dashboard_path = out_dir / "impact_dashboard.json"
    reconciliation_path = out_dir / "impact_reconciliation.json"

    dashboard_path.write_text(json.dumps(dashboard, ensure_ascii=False, indent=2), encoding="utf-8")
    reconciliation_path.write_text(json.dumps(reconciliation, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Wrote {dashboard_path}")
    print(f"Wrote {reconciliation_path}")
    for item in catalog:
        print(f"Wrote {exports_dir / (item['name'] + '.json')}")
        print(f"Wrote {exports_dir / (item['name'] + '.csv')}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

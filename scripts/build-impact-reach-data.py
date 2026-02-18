#!/usr/bin/env python3
"""Build outlet reach proxy data for impact dashboard news coverage.

Inputs (default):
- data/impact/exports/news_mentions_clean.json (preferred) or .csv fallback

Network source:
- Tranco latest + historical date snapshots

Outputs (default: data/impact/reach/):
- outlet_reach.json / outlet_reach.csv
- reach_metadata.json
- time_adjusted_mentions_reach.json / time_adjusted_mentions_reach.csv
- time_adjusted_outlet_reach.json / time_adjusted_outlet_reach.csv
- tranco_snapshots_used.json / tranco_snapshots_used.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import shutil
import statistics
import sys
import time
import zipfile
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple
from urllib.parse import urlparse
from urllib.request import Request, urlopen


TRANCO_API_LATEST = "https://tranco-list.eu/api/lists/date/latest"
TRANCO_API_DATE = "https://tranco-list.eu/api/lists/date/{date}"
TRANCO_PERMANENT_LIST_ID = "https://tranco-list.eu/top-1m-id"
TRANCO_PERMANENT_ZIP = "https://tranco-list.eu/top-1m.csv.zip"
UA = "impact-reach-builder/2.0 (+https://jakeberv.com)"

PUBLIC_SUFFIX_EXCLUSIONS = {
    "co.uk",
    "ac.uk",
    "gov.uk",
    "org.uk",
    "com.au",
    "net.au",
    "org.au",
    "co.jp",
    "co.kr",
    "com.br",
    "com.mx",
    "com.cn",
    "com.hk",
    "com.sg",
    "co.nz",
    "com.tr",
    "com.sa",
    "com.ar",
    "co.za",
}


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_date_iso(value: str) -> Optional[date]:
    s = (value or "").strip()
    if not s:
        return None
    s = s[:10]
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        return None


def month_key(dt: date) -> str:
    return f"{dt.year:04d}-{dt.month:02d}"


def quarter_key(dt: date) -> str:
    q = ((dt.month - 1) // 3) + 1
    return f"{dt.year:04d}-Q{q}"


def period_key_for_date(dt: date, granularity: str) -> str:
    if granularity == "quarter":
        return quarter_key(dt)
    return month_key(dt)


def period_anchor_date(period_key: str, granularity: str) -> date:
    if granularity == "quarter":
        m = re.match(r"^(\d{4})-Q([1-4])$", period_key)
        if not m:
            raise ValueError(f"Invalid quarter period key: {period_key}")
        year = int(m.group(1))
        quarter = int(m.group(2))
        # Mid-quarter anchor (second month, 15th).
        month = (quarter - 1) * 3 + 2
        return date(year, month, 15)

    m = re.match(r"^(\d{4})-(\d{2})$", period_key)
    if not m:
        raise ValueError(f"Invalid month period key: {period_key}")
    year = int(m.group(1))
    month = int(m.group(2))
    return date(year, month, 15)


def normalize_domain(value: str) -> str:
    raw = (value or "").strip().lower()
    if not raw:
        return ""

    if "://" in raw:
        parsed = urlparse(raw)
        raw = parsed.netloc or parsed.path

    raw = raw.split("/")[0].split("?")[0].split("#")[0].split(":")[0].strip().strip(".")
    if raw.startswith("www."):
        raw = raw[4:]
    if not raw or "." not in raw:
        return ""

    if any(c for c in raw if not (c.isalnum() or c in ".-")):
        return ""

    parts = [p for p in raw.split(".") if p]
    if len(parts) < 2:
        return ""
    return ".".join(parts)


def domain_from_url(url: str) -> str:
    try:
        return normalize_domain(urlparse((url or "").strip()).netloc)
    except Exception:
        return ""


def fetch_bytes(url: str, timeout: int = 30) -> bytes:
    req = Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urlopen(req, timeout=timeout) as resp:
        return resp.read()


def fetch_json(url: str, timeout: int = 30) -> Dict:
    payload = fetch_bytes(url, timeout=timeout)
    return json.loads(payload.decode("utf-8"))


def normalize_tranco_meta(data: Dict, source: str) -> Dict:
    list_id = str(data.get("list_id", "")).strip()
    download = str(data.get("download", "")).strip() or str(data.get("download_url", "")).strip()
    created_on = str(data.get("created_on", "")).strip()
    if not list_id:
        return {}
    if not download:
        download = f"https://tranco-list.eu/download/{list_id}/1000000"
    return {
        "source": source,
        "list_id": list_id,
        "download_url": download,
        "created_on": created_on,
    }


def fetch_latest_tranco_metadata(timeout: int = 30) -> Dict:
    try:
        data = fetch_json(TRANCO_API_LATEST, timeout=timeout)
        meta = normalize_tranco_meta(data, source="tranco_api")
        if meta:
            return meta
    except Exception:
        pass

    try:
        list_id = fetch_bytes(TRANCO_PERMANENT_LIST_ID, timeout=timeout).decode("utf-8", errors="replace").strip()
        if list_id:
            return {
                "source": "tranco_permanent_endpoints",
                "list_id": list_id,
                "download_url": TRANCO_PERMANENT_ZIP,
                "created_on": "",
            }
    except Exception:
        pass

    return {
        "source": "unavailable",
        "list_id": "",
        "download_url": "",
        "created_on": "",
    }


def fetch_tranco_metadata_for_date(target_date: str, timeout: int = 30) -> Dict:
    try:
        data = fetch_json(TRANCO_API_DATE.format(date=target_date), timeout=timeout)
    except Exception:
        return {}
    return normalize_tranco_meta(data, source="tranco_api_date")


def write_csv(path: Path, rows: List[Dict]) -> None:
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
            writer.writerow({k: row.get(k, "") for k in fieldnames})


def load_rows(json_path: Path, csv_path: Path) -> Tuple[List[Dict], str]:
    if json_path.exists():
        with json_path.open("r", encoding="utf-8") as f:
            rows = json.load(f)
            if isinstance(rows, list):
                return rows, str(json_path)
        raise ValueError(f"Unexpected JSON structure in {json_path}")

    if csv_path.exists():
        with csv_path.open("r", encoding="utf-8", newline="") as f:
            return list(csv.DictReader(f)), str(csv_path)

    raise FileNotFoundError(f"Missing both inputs: {json_path} and {csv_path}")


def normalize_news_mentions(rows: List[Dict]) -> Tuple[List[Dict], Dict[str, int]]:
    mentions: List[Dict] = []
    stats = Counter()

    for row in rows:
        mention_type = str(row.get("mention_type", "")).strip()
        if mention_type and mention_type != "News story":
            stats["skipped_non_news"] += 1
            continue

        mention_date = str(row.get("mention_date", "")).strip()
        mention_dt = parse_date_iso(mention_date)
        if mention_date and not mention_dt:
            stats["invalid_date"] += 1

        domain = normalize_domain(str(row.get("domain", "")))
        if not domain:
            domain = domain_from_url(str(row.get("mention_url", "") or row.get("url", "")))
        if not domain:
            stats["skipped_no_domain"] += 1
            continue

        mentions.append(
            {
                "mention_id": str(row.get("mention_id", "")).strip(),
                "mention_date": mention_date,
                "mention_dt": mention_dt,
                "domain": domain,
                "outlet": str(row.get("outlet", "")).strip() or "Unknown",
                "mention_title": str(row.get("mention_title", "")).strip(),
                "mention_url": str(row.get("mention_url", "")).strip(),
                "canonical_publication_id": str(row.get("canonical_publication_id", "")).strip(),
                "canonical_publication_title": str(row.get("canonical_publication_title", "")).strip(),
                "country": str(row.get("country", "")).strip(),
            }
        )

    stats["mentions_kept"] = len(mentions)
    stats["mentions_with_date"] = sum(1 for m in mentions if m.get("mention_dt") is not None)
    stats["mentions_without_date"] = len(mentions) - stats["mentions_with_date"]
    return mentions, dict(stats)


def aggregate_news_domains(mentions: List[Dict]) -> Dict[str, Dict]:
    by_domain: Dict[str, Dict] = {}

    for m in mentions:
        domain = m["domain"]
        rec = by_domain.get(domain)
        if not rec:
            rec = {
                "domain": domain,
                "mentions": 0,
                "outlets": Counter(),
                "first_mention_date": "",
                "last_mention_date": "",
            }
            by_domain[domain] = rec

        rec["mentions"] += 1
        rec["outlets"][m["outlet"]] += 1

        mention_date = m.get("mention_date", "")
        if mention_date:
            if not rec["first_mention_date"] or mention_date < rec["first_mention_date"]:
                rec["first_mention_date"] = mention_date
            if not rec["last_mention_date"] or mention_date > rec["last_mention_date"]:
                rec["last_mention_date"] = mention_date

    return by_domain


def cache_index_path(cache_dir: Path) -> Path:
    return cache_dir / "tranco_cache_index.json"


def load_cache_index(cache_dir: Path) -> Dict:
    p = cache_index_path(cache_dir)
    if not p.exists():
        return {}
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def save_cache_index(cache_dir: Path, payload: Dict) -> None:
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_index_path(cache_dir).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def list_cached_zip_paths(cache_dir: Path) -> List[Path]:
    if not cache_dir.exists():
        return []
    return sorted(cache_dir.glob("tranco_top1m_*.csv.zip"), key=lambda p: p.stat().st_mtime, reverse=True)


def cached_zip_for_list_id(cache_dir: Path, list_id: str) -> Optional[Path]:
    if not list_id:
        return None
    p = cache_dir / f"tranco_top1m_{list_id}.csv.zip"
    if p.exists() and p.stat().st_size > 0:
        return p
    return None


def inferred_list_id_from_zip(path: Path) -> str:
    m = re.match(r"tranco_top1m_([^/]+)\.csv\.zip$", path.name)
    return m.group(1).strip() if m else ""


def merge_source_meta(primary: Dict, fallback: Dict) -> Dict:
    out = dict(primary or {})
    fb = dict(fallback or {})
    for key in ("list_id", "download_url", "created_on"):
        if not out.get(key) and fb.get(key):
            out[key] = fb.get(key)
    return out


def download_tranco_zip(meta: Dict, cache_dir: Path, timeout: int, force_download: bool) -> Tuple[Optional[Path], bool, str]:
    cache_dir.mkdir(parents=True, exist_ok=True)
    list_id = str(meta.get("list_id", "")).strip() or "latest"
    download_url = str(meta.get("download_url", "")).strip()
    if not download_url:
        return None, False, "missing_download_url"

    zip_path = cache_dir / f"tranco_top1m_{list_id}.csv.zip"
    if zip_path.exists() and zip_path.stat().st_size > 0 and not force_download:
        return zip_path, True, ""

    tmp_path = zip_path.with_suffix(".tmp")
    req = Request(download_url, headers={"User-Agent": UA, "Accept": "*/*"})
    try:
        with urlopen(req, timeout=timeout) as resp, tmp_path.open("wb") as out:
            shutil.copyfileobj(resp, out)
        tmp_path.replace(zip_path)
        return zip_path, False, ""
    except Exception as exc:
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
        return None, False, f"{type(exc).__name__}: {exc}"


def parse_rank_line(line: str) -> Tuple[int, str]:
    text = line.strip()
    if not text:
        return 0, ""
    if "," in text:
        rank_s, domain = text.split(",", 1)
    elif "\t" in text:
        rank_s, domain = text.split("\t", 1)
    else:
        parts = text.split(maxsplit=1)
        if len(parts) != 2:
            return 0, ""
        rank_s, domain = parts
    try:
        rank = int(rank_s.strip())
    except ValueError:
        return 0, ""
    return rank, normalize_domain(domain.strip())


def iter_tranco_lines(path: Path):
    with path.open("rb") as fh:
        signature = fh.read(4)

    if signature.startswith(b"PK\x03\x04"):
        with zipfile.ZipFile(path, "r") as zf:
            names = [n for n in zf.namelist() if not n.endswith("/")]
            if not names:
                return
            target = ""
            for name in names:
                if name.lower().endswith(".csv"):
                    target = name
                    break
            if not target:
                target = names[0]

            with zf.open(target, "r") as fh:
                for raw in fh:
                    yield raw.decode("utf-8", errors="replace")
        return

    with path.open("r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            yield line


def parse_tranco_file_subset(path: Path, wanted_domains: Set[str]) -> Dict[str, int]:
    if not wanted_domains:
        return {}

    rank_by_domain: Dict[str, int] = {}
    remaining = set(wanted_domains)

    for line in iter_tranco_lines(path):
        rank, domain = parse_rank_line(line)
        if rank <= 0 or not domain:
            continue
        if domain in remaining:
            rank_by_domain[domain] = rank
            remaining.remove(domain)
            if not remaining:
                break

    return rank_by_domain


def domain_candidates(domain: str) -> List[str]:
    d = normalize_domain(domain)
    if not d:
        return []
    labels = d.split(".")
    if len(labels) < 2:
        return []

    out: List[str] = []
    for i in range(0, len(labels) - 1):
        suffix = ".".join(labels[i:])
        if suffix in PUBLIC_SUFFIX_EXCLUSIONS:
            continue
        if suffix.count(".") < 1:
            continue
        out.append(suffix)
    return out


def collect_wanted_rank_domains(domains: Iterable[str]) -> Set[str]:
    wanted: Set[str] = set()
    for d in domains:
        for cand in domain_candidates(d):
            wanted.add(cand)
    return wanted


def match_tranco_rank(domain: str, rank_by_domain: Dict[str, int]) -> Tuple[str, int, str]:
    candidates = domain_candidates(domain)
    for idx, cand in enumerate(candidates):
        rank = rank_by_domain.get(cand)
        if rank:
            return cand, rank, ("exact" if idx == 0 else "suffix")
    return "", 0, "unmatched"


def reach_score(rank: int) -> float:
    if rank <= 0:
        return 0.0
    clamped = min(max(rank, 1), 1_000_000)
    score = 100.0 * (1.0 - (math.log10(clamped) / 6.0))
    return round(max(0.0, min(100.0, score)), 2)


def reach_percentile(rank: int) -> float:
    if rank <= 0:
        return 0.0
    clamped = min(max(rank, 1), 1_000_000)
    return round(100.0 * (1.0 - ((clamped - 1) / 1_000_000.0)), 3)


def reach_tier(rank: int) -> str:
    if rank <= 0:
        return "unranked"
    if rank <= 1_000:
        return "very_high"
    if rank <= 10_000:
        return "high"
    if rank <= 100_000:
        return "medium"
    if rank <= 1_000_000:
        return "low"
    return "unranked"


def offset_sequence(max_days: int) -> List[int]:
    out = [0]
    for i in range(1, max_days + 1):
        out.append(i)
        out.append(-i)
    return out


def get_date_meta(
    date_iso: str,
    date_lookup: Dict[str, Dict],
    timeout: int,
    warnings: List[str],
    date_api_controls: Dict[str, object],
) -> Optional[Dict]:
    cached = date_lookup.get(date_iso)
    if isinstance(cached, dict):
        if cached.get("status") == "ok" and cached.get("meta"):
            return cached["meta"]
        if cached.get("status") == "missing":
            return None

    max_calls = max(0, int(date_api_controls.get("max_calls", 0) or 0))
    calls_made = int(date_api_controls.get("calls_made", 0) or 0)
    if max_calls and calls_made >= max_calls:
        if not date_api_controls.get("cap_warning_emitted"):
            warnings.append(
                f"Historical date lookup cap reached ({max_calls}); unresolved periods will use nearest available fallback."
            )
            date_api_controls["cap_warning_emitted"] = True
        return None

    delay_seconds = max(0.0, float(date_api_controls.get("delay_seconds", 0.0) or 0.0))
    last_call_ts = float(date_api_controls.get("last_call_ts", 0.0) or 0.0)
    if delay_seconds > 0 and last_call_ts > 0:
        wait_seconds = delay_seconds - (time.monotonic() - last_call_ts)
        if wait_seconds > 0:
            time.sleep(wait_seconds)

    date_api_controls["calls_made"] = calls_made + 1
    date_api_controls["last_call_ts"] = time.monotonic()

    meta = fetch_tranco_metadata_for_date(date_iso, timeout=timeout)
    if meta:
        date_lookup[date_iso] = {"status": "ok", "meta": meta, "queried_at_utc": now_utc_iso()}
        return meta

    date_lookup[date_iso] = {"status": "missing", "queried_at_utc": now_utc_iso()}
    return None


def resolve_period_snapshots(
    period_keys: List[str],
    granularity: str,
    date_lookup: Dict[str, Dict],
    timeout: int,
    max_window_days: int,
    warnings: List[str],
    date_api_controls: Dict[str, object],
) -> Dict[str, Dict]:
    period_map: Dict[str, Dict] = {}
    successes: List[Dict] = []

    offsets = offset_sequence(max_window_days)
    for pk in sorted(period_keys):
        target_dt = period_anchor_date(pk, granularity)
        target_iso = target_dt.isoformat()

        chosen: Optional[Dict] = None
        for off in offsets:
            probe_dt = target_dt + timedelta(days=off)
            probe_iso = probe_dt.isoformat()
            meta = get_date_meta(
                probe_iso,
                date_lookup=date_lookup,
                timeout=timeout,
                warnings=warnings,
                date_api_controls=date_api_controls,
            )
            if not meta:
                continue

            resolved_dt = parse_date_iso(str(meta.get("created_on", ""))) or probe_dt
            chosen = {
                "status": "ok",
                "period_key": pk,
                "target_date": target_iso,
                "probe_date": probe_iso,
                "resolved_date": resolved_dt.isoformat(),
                "offset_days": (resolved_dt - target_dt).days,
                "resolution": "exact_date" if off == 0 else "nearest_date_window",
                "list_id": meta.get("list_id", ""),
                "download_url": meta.get("download_url", ""),
                "created_on": meta.get("created_on", ""),
            }
            break

        if chosen:
            period_map[pk] = chosen
            successes.append(chosen)
        else:
            period_map[pk] = {
                "status": "unresolved",
                "period_key": pk,
                "target_date": target_iso,
                "probe_date": "",
                "resolved_date": "",
                "offset_days": "",
                "resolution": "unresolved",
                "list_id": "",
                "download_url": "",
                "created_on": "",
            }

    if successes:
        success_rows: List[Tuple[date, Dict]] = []
        for row in successes:
            dt = parse_date_iso(row.get("resolved_date", ""))
            if dt:
                success_rows.append((dt, row))

        for pk, row in list(period_map.items()):
            if row.get("status") != "unresolved":
                continue
            target_dt = parse_date_iso(row.get("target_date", ""))
            if not target_dt or not success_rows:
                continue
            nearest_dt, nearest_row = min(success_rows, key=lambda t: abs((t[0] - target_dt).days))
            period_map[pk] = {
                "status": "ok",
                "period_key": pk,
                "target_date": row.get("target_date", ""),
                "probe_date": nearest_row.get("probe_date", ""),
                "resolved_date": nearest_dt.isoformat(),
                "offset_days": (nearest_dt - target_dt).days,
                "resolution": "fallback_nearest_available",
                "list_id": nearest_row.get("list_id", ""),
                "download_url": nearest_row.get("download_url", ""),
                "created_on": nearest_row.get("created_on", ""),
                "fallback_from_period": nearest_row.get("period_key", ""),
            }

    unresolved = [pk for pk, row in period_map.items() if row.get("status") != "ok"]
    if unresolved:
        warnings.append(
            "Unresolved Tranco snapshots for periods: " + ", ".join(unresolved[:12]) + (" ..." if len(unresolved) > 12 else "")
        )

    return period_map


def resolve_rank_map_for_meta(
    meta: Dict,
    cache_dir: Path,
    timeout: int,
    force_download: bool,
    wanted_domains: Set[str],
) -> Tuple[Dict[str, int], Dict, str]:
    list_id = str(meta.get("list_id", "")).strip()
    if not list_id:
        return {}, {"status": "missing_list_id", "list_id": ""}, "missing_list_id"

    zip_path, cache_hit, download_error = download_tranco_zip(
        meta=meta,
        cache_dir=cache_dir,
        timeout=timeout,
        force_download=force_download,
    )

    if not zip_path:
        cached_zip = cached_zip_for_list_id(cache_dir, list_id)
        if cached_zip:
            zip_path = cached_zip
            cache_hit = True
            download_error = ""

    if not zip_path:
        err = download_error or "no_cached_zip"
        return {}, {"status": "unavailable", "list_id": list_id, "cache_hit": False, "zip_path": ""}, err

    try:
        rank_map = parse_tranco_file_subset(zip_path, wanted_domains=wanted_domains)
    except Exception as exc:
        return {}, {"status": "parse_failed", "list_id": list_id, "cache_hit": bool(cache_hit), "zip_path": str(zip_path)}, f"{type(exc).__name__}: {exc}"

    info = {
        "status": "ok",
        "list_id": list_id,
        "cache_hit": bool(cache_hit),
        "zip_path": str(zip_path),
        "ranked_domains_subset": len(rank_map),
    }
    return rank_map, info, ""


def resolve_latest_rank_data(
    cache_index: Dict,
    cache_dir: Path,
    timeout: int,
    force_download: bool,
    wanted_domains: Set[str],
) -> Tuple[Dict[str, int], Dict, List[str], Dict]:
    warnings: List[str] = []
    cached_source_meta = cache_index.get("source_meta", {}) if isinstance(cache_index, dict) else {}

    source_meta = fetch_latest_tranco_metadata(timeout=timeout)
    source_meta = merge_source_meta(source_meta, cached_source_meta)
    source_meta["retrieved_at_utc"] = now_utc_iso()
    source_meta["cache_hit"] = False
    source_meta["zip_path"] = ""

    if source_meta.get("source") == "unavailable":
        warnings.append("Unable to fetch Tranco latest metadata endpoints; attempting cached latest list.")

    rank_map, info, error = resolve_rank_map_for_meta(
        meta=source_meta,
        cache_dir=cache_dir,
        timeout=timeout,
        force_download=force_download,
        wanted_domains=wanted_domains,
    )

    if error:
        warnings.append(f"Latest Tranco fetch failed: {error}")
        cached_zip_candidates = list_cached_zip_paths(cache_dir)
        if cached_zip_candidates:
            chosen = cached_zip_candidates[0]
            inferred_id = inferred_list_id_from_zip(chosen)
            fallback_meta = {
                "source": "cached_latest_fallback",
                "list_id": inferred_id,
                "download_url": f"https://tranco-list.eu/download/{inferred_id}/1000000" if inferred_id else "",
                "created_on": "",
                "retrieved_at_utc": now_utc_iso(),
            }
            source_meta = merge_source_meta(source_meta, fallback_meta)
            try:
                rank_map = parse_tranco_file_subset(chosen, wanted_domains=wanted_domains)
                source_meta["cache_hit"] = True
                source_meta["zip_path"] = str(chosen)
                source_meta["ranked_domains"] = len(rank_map)
                warnings.append(f"Using cached Tranco file: {chosen.name}")
            except Exception as exc:
                warnings.append(f"Cached latest parse failed: {type(exc).__name__}: {exc}")
                rank_map = {}
        else:
            rank_map = {}
    else:
        source_meta["cache_hit"] = bool(info.get("cache_hit", False))
        source_meta["zip_path"] = str(info.get("zip_path", ""))
        source_meta["ranked_domains"] = len(rank_map)

    cache_index["source_meta"] = source_meta
    return rank_map, source_meta, warnings, cache_index


def build_outlet_reach_rows(domain_stats: Dict[str, Dict], rank_by_domain: Dict[str, int], source_meta: Dict) -> List[Dict]:
    rows: List[Dict] = []
    generated_at = now_utc_iso()

    for domain, stats in domain_stats.items():
        matched_domain, rank, match_type = match_tranco_rank(domain, rank_by_domain)
        outlets: Counter = stats["outlets"]
        top_outlet, top_outlet_mentions = ("", 0)
        if outlets:
            top_outlet, top_outlet_mentions = outlets.most_common(1)[0]

        rows.append(
            {
                "domain": domain,
                "matched_domain": matched_domain,
                "match_type": match_type,
                "tranco_rank": rank,
                "reach_score": reach_score(rank),
                "reach_percentile": reach_percentile(rank),
                "reach_tier": reach_tier(rank),
                "mentions": int(stats["mentions"]),
                "unique_outlets": len(outlets),
                "top_outlet": top_outlet,
                "top_outlet_mentions": int(top_outlet_mentions),
                "first_mention_date": stats["first_mention_date"],
                "last_mention_date": stats["last_mention_date"],
                "tranco_list_id": source_meta.get("list_id", ""),
                "tranco_list_created_on": source_meta.get("created_on", ""),
                "generated_at_utc": generated_at,
            }
        )

    rows.sort(key=lambda r: (-int(r["mentions"]), int(r["tranco_rank"] or 9_999_999), str(r["domain"])))
    return rows


def build_time_adjusted_mentions_rows(
    mentions: List[Dict],
    period_map: Dict[str, Dict],
    rank_maps_by_list_id: Dict[str, Dict[str, int]],
    granularity: str,
) -> Tuple[List[Dict], Dict[str, float]]:
    rows: List[Dict] = []

    assigned_snapshot = 0
    ranked_mentions = 0
    abs_offsets: List[int] = []

    for m in mentions:
        dt = m.get("mention_dt")
        period_key = period_key_for_date(dt, granularity) if dt else ""
        snapshot = period_map.get(period_key, {})

        list_id = str(snapshot.get("list_id", "")).strip()
        rank_map = rank_maps_by_list_id.get(list_id, {}) if list_id else {}

        matched_domain = ""
        rank = 0
        match_type = "unmatched"
        if rank_map:
            matched_domain, rank, match_type = match_tranco_rank(m["domain"], rank_map)

        snapshot_resolved_date = str(snapshot.get("resolved_date", "")).strip()
        snapshot_dt = parse_date_iso(snapshot_resolved_date)
        mention_to_snapshot_days = ""
        if dt and snapshot_dt:
            mention_to_snapshot_days = (dt - snapshot_dt).days
            abs_offsets.append(abs(mention_to_snapshot_days))

        if snapshot.get("status") == "ok":
            assigned_snapshot += 1

        if rank > 0:
            ranked_mentions += 1

        rows.append(
            {
                "mention_id": m.get("mention_id", ""),
                "mention_date": m.get("mention_date", ""),
                "period_key": period_key,
                "snapshot_target_date": snapshot.get("target_date", ""),
                "snapshot_resolved_date": snapshot_resolved_date,
                "snapshot_offset_days": snapshot.get("offset_days", ""),
                "mention_to_snapshot_days": mention_to_snapshot_days,
                "snapshot_resolution": snapshot.get("resolution", ""),
                "tranco_list_id": list_id,
                "tranco_list_created_on": snapshot.get("created_on", ""),
                "domain": m["domain"],
                "matched_domain": matched_domain,
                "match_type": match_type,
                "tranco_rank_at_date": rank,
                "reach_score_at_date": reach_score(rank),
                "reach_percentile_at_date": reach_percentile(rank),
                "reach_tier_at_date": reach_tier(rank),
                "outlet": m.get("outlet", ""),
                "country": m.get("country", ""),
                "canonical_publication_id": m.get("canonical_publication_id", ""),
                "canonical_publication_title": m.get("canonical_publication_title", ""),
                "mention_title": m.get("mention_title", ""),
                "mention_url": m.get("mention_url", ""),
            }
        )

    rows.sort(key=lambda r: (r.get("mention_date", ""), r.get("mention_id", "")))

    summary = {
        "mentions_total": len(mentions),
        "mentions_assigned_snapshot": assigned_snapshot,
        "mentions_ranked_at_date": ranked_mentions,
        "ranked_coverage_rate": round((ranked_mentions / len(mentions)), 4) if mentions else 0.0,
        "median_abs_snapshot_offset_days": int(statistics.median(abs_offsets)) if abs_offsets else 0,
        "max_abs_snapshot_offset_days": max(abs_offsets) if abs_offsets else 0,
    }
    return rows, summary


def safe_mean(values: List[float]) -> float:
    if not values:
        return 0.0
    return round(sum(values) / len(values), 4)


def build_time_adjusted_outlet_rows(
    mention_rows: List[Dict],
    latest_outlet_rows_by_domain: Dict[str, Dict],
) -> List[Dict]:
    grouped: Dict[str, Dict] = {}

    for row in mention_rows:
        domain = str(row.get("domain", "")).strip()
        if not domain:
            continue

        g = grouped.get(domain)
        if not g:
            g = {
                "domain": domain,
                "mentions": 0,
                "ranked_mentions": 0,
                "scores": [],
                "ranks": [],
                "outlets": Counter(),
                "first_mention_date": "",
                "last_mention_date": "",
                "periods": set(),
                "list_ids": set(),
                "match_types": Counter(),
            }
            grouped[domain] = g

        g["mentions"] += 1
        rank = int(row.get("tranco_rank_at_date", 0) or 0)
        if rank > 0:
            g["ranked_mentions"] += 1
            g["ranks"].append(rank)
            g["scores"].append(float(row.get("reach_score_at_date", 0.0) or 0.0))

        outlet = str(row.get("outlet", "")).strip() or "Unknown"
        g["outlets"][outlet] += 1

        d = str(row.get("mention_date", "")).strip()
        if d:
            if not g["first_mention_date"] or d < g["first_mention_date"]:
                g["first_mention_date"] = d
            if not g["last_mention_date"] or d > g["last_mention_date"]:
                g["last_mention_date"] = d

        pk = str(row.get("period_key", "")).strip()
        if pk:
            g["periods"].add(pk)

        lid = str(row.get("tranco_list_id", "")).strip()
        if lid:
            g["list_ids"].add(lid)

        mt = str(row.get("match_type", "")).strip()
        if mt:
            g["match_types"][mt] += 1

    rows: List[Dict] = []
    for domain, g in grouped.items():
        latest = latest_outlet_rows_by_domain.get(domain, {})
        ranks = sorted(g["ranks"])
        scores = g["scores"]
        top_outlet, top_outlet_mentions = ("", 0)
        if g["outlets"]:
            top_outlet, top_outlet_mentions = g["outlets"].most_common(1)[0]
        primary_match_type = g["match_types"].most_common(1)[0][0] if g["match_types"] else "unmatched"

        rows.append(
            {
                "domain": domain,
                "mentions": g["mentions"],
                "ranked_mentions": g["ranked_mentions"],
                "rank_coverage_rate": round((g["ranked_mentions"] / g["mentions"]), 4) if g["mentions"] else 0.0,
                "mean_reach_score_at_date": safe_mean(scores),
                "median_reach_score_at_date": round(float(statistics.median(scores)), 4) if scores else 0.0,
                "mean_tranco_rank_at_date": int(round(sum(ranks) / len(ranks))) if ranks else 0,
                "median_tranco_rank_at_date": int(round(float(statistics.median(ranks)))) if ranks else 0,
                "best_tranco_rank_at_date": ranks[0] if ranks else 0,
                "worst_tranco_rank_at_date": ranks[-1] if ranks else 0,
                "primary_match_type": primary_match_type,
                "unique_snapshot_periods": len(g["periods"]),
                "unique_tranco_lists": len(g["list_ids"]),
                "top_outlet": top_outlet,
                "top_outlet_mentions": int(top_outlet_mentions),
                "first_mention_date": g["first_mention_date"],
                "last_mention_date": g["last_mention_date"],
                "latest_tranco_rank": int(latest.get("tranco_rank", 0) or 0),
                "latest_reach_score": float(latest.get("reach_score", 0.0) or 0.0),
                "latest_tranco_list_id": latest.get("tranco_list_id", ""),
            }
        )

    rows.sort(
        key=lambda r: (
            -float(r.get("mean_reach_score_at_date", 0.0) or 0.0),
            -int(r.get("mentions", 0) or 0),
            str(r.get("domain", "")),
        )
    )
    return rows


def build_snapshot_rows(
    period_map: Dict[str, Dict],
    mentions: List[Dict],
    granularity: str,
    rank_maps_by_list_id: Dict[str, Dict[str, int]],
) -> List[Dict]:
    mentions_by_period = Counter()
    for m in mentions:
        dt = m.get("mention_dt")
        if not dt:
            continue
        mentions_by_period[period_key_for_date(dt, granularity)] += 1

    rows: List[Dict] = []
    for pk in sorted(period_map.keys()):
        s = period_map[pk]
        lid = str(s.get("list_id", "")).strip()
        rows.append(
            {
                "period_key": pk,
                "mentions": int(mentions_by_period.get(pk, 0)),
                "status": s.get("status", ""),
                "resolution": s.get("resolution", ""),
                "target_date": s.get("target_date", ""),
                "resolved_date": s.get("resolved_date", ""),
                "offset_days": s.get("offset_days", ""),
                "probe_date": s.get("probe_date", ""),
                "tranco_list_id": lid,
                "tranco_list_created_on": s.get("created_on", ""),
                "download_url": s.get("download_url", ""),
                "rank_map_loaded": bool(lid and lid in rank_maps_by_list_id),
                "ranked_domains_subset": len(rank_maps_by_list_id.get(lid, {})) if lid else 0,
            }
        )

    return rows


def build_metadata(
    latest_rows: List[Dict],
    mentions_input_count: int,
    source_meta: Dict,
    input_source: str,
    warnings: List[str],
    mention_parse_stats: Dict[str, int],
    time_adjusted_summary: Dict[str, object],
) -> Dict:
    matched_domains = [r for r in latest_rows if int(r.get("tranco_rank", 0) or 0) > 0]
    unmatched_domains = [r for r in latest_rows if int(r.get("tranco_rank", 0) or 0) <= 0]

    mentions_covered = sum(int(r.get("mentions", 0) or 0) for r in matched_domains)
    domain_total = len(latest_rows)
    domain_matched = len(matched_domains)
    domain_unmatched = len(unmatched_domains)

    return {
        "generated_at_utc": now_utc_iso(),
        "input": {
            "source_path": input_source,
            "news_mentions_rows_input": mentions_input_count,
            "news_mentions_rows_kept": mention_parse_stats.get("mentions_kept", 0),
            "unique_domains": domain_total,
            "parse_stats": mention_parse_stats,
        },
        "source": source_meta,
        "coverage": {
            "domains_matched": domain_matched,
            "domains_unmatched": domain_unmatched,
            "domain_match_rate": round((domain_matched / domain_total), 4) if domain_total else 0.0,
            "mentions_ranked": mentions_covered,
            "mentions_total": mention_parse_stats.get("mentions_kept", 0),
            "mention_coverage_rate": round((mentions_covered / max(1, mention_parse_stats.get("mentions_kept", 0))), 4)
            if mention_parse_stats.get("mentions_kept", 0)
            else 0.0,
        },
        "time_adjusted": time_adjusted_summary,
        "top_unmatched_domains": [
            {
                "domain": row["domain"],
                "mentions": row["mentions"],
                "top_outlet": row["top_outlet"],
                "last_mention_date": row["last_mention_date"],
            }
            for row in sorted(unmatched_domains, key=lambda r: (-int(r["mentions"]), str(r["domain"])))[:40]
        ],
        "warnings": warnings,
    }


def main(argv: Optional[Iterable[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Build outlet reach proxy data from Tranco")
    parser.add_argument(
        "--repo-root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Path to repository root (default: repository containing this script)",
    )
    parser.add_argument(
        "--input-json",
        default="",
        help="Input JSON path (default: <repo-root>/data/impact/exports/news_mentions_clean.json)",
    )
    parser.add_argument(
        "--input-csv",
        default="",
        help="Input CSV fallback path (default: <repo-root>/data/impact/exports/news_mentions_clean.csv)",
    )
    parser.add_argument(
        "--out-dir",
        default="",
        help="Output directory (default: <repo-root>/data/impact/reach)",
    )
    parser.add_argument(
        "--cache-dir",
        default="",
        help="Cache directory for Tranco files (default: <out-dir>/.cache)",
    )
    parser.add_argument("--timeout", type=int, default=30, help="Network timeout in seconds (default: 30)")
    parser.add_argument("--force-download", action="store_true", help="Force re-download even if cached files exist")
    parser.add_argument(
        "--historical-granularity",
        choices=("month", "quarter"),
        default="month",
        help="Granularity for time-adjusted historical snapshots (default: month)",
    )
    parser.add_argument(
        "--historical-window-days",
        type=int,
        default=10,
        help="Max +/- day search window when exact Tranco snapshot date is missing (default: 10)",
    )
    parser.add_argument(
        "--historical-date-api-delay-ms",
        type=int,
        default=250,
        help="Delay between historical date API lookups in milliseconds (default: 250)",
    )
    parser.add_argument(
        "--historical-max-date-lookups",
        type=int,
        default=250,
        help="Max historical date API lookups per run (0 disables cap, default: 250)",
    )
    parser.add_argument(
        "--disable-time-adjusted",
        action="store_true",
        help="Skip historical time-adjusted outputs and generate latest reach only",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)

    repo_root = Path(args.repo_root).expanduser().resolve()
    out_dir = (Path(args.out_dir).expanduser().resolve() if str(args.out_dir).strip() else (repo_root / "data" / "impact" / "reach").resolve())
    out_dir.mkdir(parents=True, exist_ok=True)

    input_json = (
        Path(args.input_json).expanduser().resolve()
        if str(args.input_json).strip()
        else (repo_root / "data" / "impact" / "exports" / "news_mentions_clean.json").resolve()
    )
    input_csv = (
        Path(args.input_csv).expanduser().resolve()
        if str(args.input_csv).strip()
        else (repo_root / "data" / "impact" / "exports" / "news_mentions_clean.csv").resolve()
    )
    cache_dir = (Path(args.cache_dir).expanduser().resolve() if str(args.cache_dir).strip() else (out_dir / ".cache").resolve())

    try:
        raw_rows, input_source = load_rows(input_json, input_csv)
    except Exception as exc:
        print(f"Failed to read input rows: {exc}", file=sys.stderr)
        return 1

    mentions, mention_parse_stats = normalize_news_mentions(raw_rows)
    domain_stats = aggregate_news_domains(mentions)

    wanted_domains = collect_wanted_rank_domains(domain_stats.keys())
    cache_index = load_cache_index(cache_dir)

    latest_rank_map, source_meta, warnings, cache_index = resolve_latest_rank_data(
        cache_index=cache_index,
        cache_dir=cache_dir,
        timeout=args.timeout,
        force_download=args.force_download,
        wanted_domains=wanted_domains,
    )

    latest_rows = build_outlet_reach_rows(domain_stats=domain_stats, rank_by_domain=latest_rank_map, source_meta=source_meta)
    latest_by_domain = {r["domain"]: r for r in latest_rows}

    # Historical / time-adjusted outputs.
    time_adjusted_mentions_rows: List[Dict] = []
    time_adjusted_outlet_rows: List[Dict] = []
    snapshot_rows: List[Dict] = []
    time_adjusted_summary: Dict[str, object] = {
        "enabled": not args.disable_time_adjusted,
        "granularity": args.historical_granularity,
        "periods_requested": 0,
        "periods_resolved": 0,
        "periods_fallback": 0,
        "unique_tranco_lists": 0,
        "mentions_total": len(mentions),
        "mentions_assigned_snapshot": 0,
        "mentions_ranked_at_date": 0,
        "ranked_coverage_rate": 0.0,
        "median_abs_snapshot_offset_days": 0,
        "max_abs_snapshot_offset_days": 0,
        "earliest_snapshot_date": "",
        "latest_snapshot_date": "",
    }

    if not args.disable_time_adjusted:
        dated_mentions = [m for m in mentions if m.get("mention_dt") is not None]
        period_keys = sorted({period_key_for_date(m["mention_dt"], args.historical_granularity) for m in dated_mentions})
        date_lookup = cache_index.get("date_lookup", {}) if isinstance(cache_index.get("date_lookup", {}), dict) else {}
        date_api_controls = {
            "calls_made": 0,
            "max_calls": max(0, int(args.historical_max_date_lookups)),
            "delay_seconds": max(0.0, float(args.historical_date_api_delay_ms) / 1000.0),
            "last_call_ts": 0.0,
            "cap_warning_emitted": False,
        }

        period_map = resolve_period_snapshots(
            period_keys=period_keys,
            granularity=args.historical_granularity,
            date_lookup=date_lookup,
            timeout=args.timeout,
            max_window_days=max(0, int(args.historical_window_days)),
            warnings=warnings,
            date_api_controls=date_api_controls,
        )
        cache_index["date_lookup"] = date_lookup

        rank_maps_by_list_id: Dict[str, Dict[str, int]] = {}
        snapshot_cache_info: Dict[str, Dict] = {}

        unique_list_meta: Dict[str, Dict] = {}
        for row in period_map.values():
            if row.get("status") != "ok":
                continue
            list_id = str(row.get("list_id", "")).strip()
            if not list_id:
                continue
            if list_id not in unique_list_meta:
                unique_list_meta[list_id] = {
                    "list_id": list_id,
                    "download_url": row.get("download_url", ""),
                    "created_on": row.get("created_on", ""),
                    "source": "tranco_api_date",
                }

        for list_id, meta in unique_list_meta.items():
            rank_map, info, err = resolve_rank_map_for_meta(
                meta=meta,
                cache_dir=cache_dir,
                timeout=args.timeout,
                force_download=args.force_download,
                wanted_domains=wanted_domains,
            )
            if err:
                warnings.append(f"Historical Tranco fetch failed for {list_id}: {err}")
            rank_maps_by_list_id[list_id] = rank_map
            snapshot_cache_info[list_id] = info

        time_adjusted_mentions_rows, mention_time_summary = build_time_adjusted_mentions_rows(
            mentions=dated_mentions,
            period_map=period_map,
            rank_maps_by_list_id=rank_maps_by_list_id,
            granularity=args.historical_granularity,
        )
        time_adjusted_outlet_rows = build_time_adjusted_outlet_rows(
            mention_rows=time_adjusted_mentions_rows,
            latest_outlet_rows_by_domain=latest_by_domain,
        )
        snapshot_rows = build_snapshot_rows(
            period_map=period_map,
            mentions=dated_mentions,
            granularity=args.historical_granularity,
            rank_maps_by_list_id=rank_maps_by_list_id,
        )

        resolved_periods = [r for r in snapshot_rows if r.get("status") == "ok"]
        fallback_periods = [r for r in snapshot_rows if str(r.get("resolution", "")).startswith("fallback_")]
        snapshot_dates = [parse_date_iso(str(r.get("resolved_date", ""))) for r in resolved_periods]
        snapshot_dates = [d for d in snapshot_dates if d is not None]

        time_adjusted_summary = {
            "enabled": True,
            "granularity": args.historical_granularity,
            "periods_requested": len(period_keys),
            "periods_resolved": len(resolved_periods),
            "periods_fallback": len(fallback_periods),
            "unique_tranco_lists": len({r.get("tranco_list_id", "") for r in resolved_periods if r.get("tranco_list_id", "")}),
            "mentions_total": len(dated_mentions),
            "mentions_assigned_snapshot": mention_time_summary.get("mentions_assigned_snapshot", 0),
            "mentions_ranked_at_date": mention_time_summary.get("mentions_ranked_at_date", 0),
            "ranked_coverage_rate": mention_time_summary.get("ranked_coverage_rate", 0.0),
            "median_abs_snapshot_offset_days": mention_time_summary.get("median_abs_snapshot_offset_days", 0),
            "max_abs_snapshot_offset_days": mention_time_summary.get("max_abs_snapshot_offset_days", 0),
            "earliest_snapshot_date": min(snapshot_dates).isoformat() if snapshot_dates else "",
            "latest_snapshot_date": max(snapshot_dates).isoformat() if snapshot_dates else "",
            "unresolved_period_keys": [r.get("period_key", "") for r in snapshot_rows if r.get("status") != "ok"],
            "date_api_lookups_attempted": int(date_api_controls.get("calls_made", 0) or 0),
            "date_api_lookup_cap": int(date_api_controls.get("max_calls", 0) or 0),
            "date_api_lookup_cap_hit": bool(
                int(date_api_controls.get("max_calls", 0) or 0)
                and int(date_api_controls.get("calls_made", 0) or 0) >= int(date_api_controls.get("max_calls", 0) or 0)
            ),
            "date_api_delay_ms": int(args.historical_date_api_delay_ms),
        }

    metadata = build_metadata(
        latest_rows=latest_rows,
        mentions_input_count=len(raw_rows),
        source_meta=source_meta,
        input_source=input_source,
        warnings=warnings,
        mention_parse_stats=mention_parse_stats,
        time_adjusted_summary=time_adjusted_summary,
    )

    # Persist cache index updates.
    cache_index["updated_at_utc"] = now_utc_iso()
    save_cache_index(cache_dir=cache_dir, payload=cache_index)

    out_latest_json = out_dir / "outlet_reach.json"
    out_latest_csv = out_dir / "outlet_reach.csv"
    out_meta = out_dir / "reach_metadata.json"

    out_ta_mentions_json = out_dir / "time_adjusted_mentions_reach.json"
    out_ta_mentions_csv = out_dir / "time_adjusted_mentions_reach.csv"
    out_ta_outlets_json = out_dir / "time_adjusted_outlet_reach.json"
    out_ta_outlets_csv = out_dir / "time_adjusted_outlet_reach.csv"
    out_snapshots_json = out_dir / "tranco_snapshots_used.json"
    out_snapshots_csv = out_dir / "tranco_snapshots_used.csv"

    out_latest_json.write_text(json.dumps(latest_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(out_latest_csv, latest_rows)
    out_meta.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    out_ta_mentions_json.write_text(json.dumps(time_adjusted_mentions_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(out_ta_mentions_csv, time_adjusted_mentions_rows)
    out_ta_outlets_json.write_text(json.dumps(time_adjusted_outlet_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(out_ta_outlets_csv, time_adjusted_outlet_rows)
    out_snapshots_json.write_text(json.dumps(snapshot_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(out_snapshots_csv, snapshot_rows)

    print(f"Wrote {out_latest_json}")
    print(f"Wrote {out_latest_csv}")
    print(f"Wrote {out_meta}")
    print(f"Wrote {out_ta_mentions_json}")
    print(f"Wrote {out_ta_mentions_csv}")
    print(f"Wrote {out_ta_outlets_json}")
    print(f"Wrote {out_ta_outlets_csv}")
    print(f"Wrote {out_snapshots_json}")
    print(f"Wrote {out_snapshots_csv}")

    if warnings:
        for w in warnings:
            print(f"WARNING: {w}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

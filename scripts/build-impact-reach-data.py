#!/usr/bin/env python3
"""Build outlet reach proxy data for impact dashboard news coverage.

Inputs (default):
- data/impact/exports/news_mentions_clean.json (preferred) or .csv fallback

Network source:
- Tranco list metadata + top 1M daily domains

Outputs (default: data/impact/reach/):
- outlet_reach.json
- outlet_reach.csv
- reach_metadata.json
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import shutil
import sys
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple
from urllib.parse import urlparse
from urllib.request import Request, urlopen


TRANCO_API_LATEST = "https://tranco-list.eu/api/lists/date/latest"
TRANCO_PERMANENT_LIST_ID = "https://tranco-list.eu/top-1m-id"
TRANCO_PERMANENT_ZIP = "https://tranco-list.eu/top-1m.csv.zip"
UA = "impact-reach-builder/1.0 (+https://jakeberv.com)"

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


def fetch_latest_tranco_metadata(timeout: int = 30) -> Dict:
    try:
        data = fetch_json(TRANCO_API_LATEST, timeout=timeout)
        list_id = str(data.get("list_id", "")).strip()
        download = str(data.get("download", "")).strip() or TRANCO_PERMANENT_ZIP
        created_on = str(data.get("created_on", "")).strip()
        if list_id:
            return {
                "source": "tranco_api",
                "list_id": list_id,
                "download_url": download,
                "created_on": created_on,
            }
    except Exception:
        pass

    try:
        list_id = fetch_bytes(TRANCO_PERMANENT_LIST_ID, timeout=timeout).decode("utf-8", errors="replace").strip()
        return {
            "source": "tranco_permanent_endpoints",
            "list_id": list_id or "latest",
            "download_url": TRANCO_PERMANENT_ZIP,
            "created_on": "",
        }
    except Exception:
        return {
            "source": "unavailable",
            "list_id": "",
            "download_url": "",
            "created_on": "",
        }


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


def aggregate_news_domains(rows: List[Dict]) -> Tuple[Dict[str, Dict], int]:
    by_domain: Dict[str, Dict] = {}
    mentions_total = 0

    for row in rows:
        mention_type = str(row.get("mention_type", "")).strip()
        if mention_type and mention_type != "News story":
            continue

        domain = normalize_domain(str(row.get("domain", "")))
        if not domain:
            domain = domain_from_url(str(row.get("mention_url", "") or row.get("url", "")))
        if not domain:
            continue

        mentions_total += 1
        outlet = str(row.get("outlet", "")).strip() or "Unknown"
        mention_date = str(row.get("mention_date", "")).strip()

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
        rec["outlets"][outlet] += 1
        if mention_date:
            if not rec["first_mention_date"] or mention_date < rec["first_mention_date"]:
                rec["first_mention_date"] = mention_date
            if not rec["last_mention_date"] or mention_date > rec["last_mention_date"]:
                rec["last_mention_date"] = mention_date

    return by_domain, mentions_total


def cache_index_path(cache_dir: Path) -> Path:
    return cache_dir / "tranco_cache_index.json"


def load_cache_index(cache_dir: Path) -> Dict:
    p = cache_index_path(cache_dir)
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_cache_index(cache_dir: Path, payload: Dict) -> None:
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_index_path(cache_dir).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def list_cached_zip_paths(cache_dir: Path) -> List[Path]:
    if not cache_dir.exists():
        return []
    return sorted(cache_dir.glob("tranco_top1m_*.csv.zip"), key=lambda p: p.stat().st_mtime, reverse=True)


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


def parse_tranco_plain_text(path: Path) -> Dict[str, int]:
    rank_by_domain: Dict[str, int] = {}
    with path.open("r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            rank, domain = parse_rank_line(line)
            if rank <= 0 or not domain:
                continue
            if domain not in rank_by_domain:
                rank_by_domain[domain] = rank
    return rank_by_domain


def parse_tranco_zip(path: Path) -> Dict[str, int]:
    rank_by_domain: Dict[str, int] = {}
    with zipfile.ZipFile(path, "r") as zf:
        names = [n for n in zf.namelist() if not n.endswith("/")]
        if not names:
            return rank_by_domain

        target = ""
        for name in names:
            if name.lower().endswith(".csv"):
                target = name
                break
        if not target:
            target = names[0]

        with zf.open(target, "r") as fh:
            for raw in fh:
                line = raw.decode("utf-8", errors="replace")
                rank, domain = parse_rank_line(line)
                if rank <= 0 or not domain:
                    continue
                if domain not in rank_by_domain:
                    rank_by_domain[domain] = rank
    return rank_by_domain


def parse_tranco_file(path: Path) -> Dict[str, int]:
    with path.open("rb") as fh:
        signature = fh.read(4)
    if signature.startswith(b"PK\x03\x04"):
        return parse_tranco_zip(path)
    return parse_tranco_plain_text(path)


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


def build_metadata(
    rows: List[Dict],
    mentions_total: int,
    source_meta: Dict,
    input_source: str,
    warnings: List[str],
) -> Dict:
    matched_domains = [r for r in rows if int(r.get("tranco_rank", 0) or 0) > 0]
    unmatched_domains = [r for r in rows if int(r.get("tranco_rank", 0) or 0) <= 0]

    mentions_covered = sum(int(r.get("mentions", 0) or 0) for r in matched_domains)
    domain_total = len(rows)
    domain_matched = len(matched_domains)
    domain_unmatched = len(unmatched_domains)

    return {
        "generated_at_utc": now_utc_iso(),
        "input": {
            "source_path": input_source,
            "news_mentions_rows": mentions_total,
            "unique_domains": domain_total,
        },
        "source": source_meta,
        "coverage": {
            "domains_matched": domain_matched,
            "domains_unmatched": domain_unmatched,
            "domain_match_rate": round((domain_matched / domain_total), 4) if domain_total else 0.0,
            "mentions_ranked": mentions_covered,
            "mentions_total": mentions_total,
            "mention_coverage_rate": round((mentions_covered / mentions_total), 4) if mentions_total else 0.0,
        },
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


def resolve_rank_data(cache_dir: Path, timeout: int, force_download: bool) -> Tuple[Dict[str, int], Dict, List[str]]:
    warnings: List[str] = []
    cached_index = load_cache_index(cache_dir)
    cached_source_meta = cached_index.get("source_meta", {}) if isinstance(cached_index, dict) else {}
    source_meta = fetch_latest_tranco_metadata(timeout=timeout)
    source_meta = merge_source_meta(source_meta, cached_source_meta)
    source_meta["retrieved_at_utc"] = now_utc_iso()
    source_meta["cache_hit"] = False
    source_meta["zip_path"] = ""

    if source_meta.get("source") == "unavailable":
        warnings.append("Unable to fetch Tranco metadata endpoints; attempting cached list.")

    zip_path: Optional[Path] = None
    cache_hit = False
    if source_meta.get("download_url"):
        zip_path, cache_hit, download_error = download_tranco_zip(source_meta, cache_dir, timeout, force_download)
        if download_error:
            warnings.append(f"Tranco download failed: {download_error}")

    if not zip_path:
        cached = list_cached_zip_paths(cache_dir)
        if cached:
            zip_path = cached[0]
            cache_hit = True
            warnings.append(f"Using cached Tranco file: {zip_path.name}")
            source_meta = merge_source_meta(source_meta, cached_source_meta)
            inferred_id = inferred_list_id_from_zip(zip_path)
            if inferred_id and not source_meta.get("list_id"):
                source_meta["list_id"] = inferred_id
            if source_meta.get("list_id") and not source_meta.get("download_url"):
                source_meta["download_url"] = f"https://tranco-list.eu/download/{source_meta['list_id']}/1000000"
        else:
            warnings.append("No cached Tranco list available. Reach ranks will be unassigned.")
            save_cache_index(
                cache_dir,
                {
                    "updated_at_utc": now_utc_iso(),
                    "source_meta": source_meta,
                    "ranked_domains": 0,
                    "zip_path": "",
                },
            )
            return {}, source_meta, warnings

    try:
        rank_by_domain = parse_tranco_file(zip_path)
        source_meta["cache_hit"] = bool(cache_hit)
        source_meta["zip_path"] = str(zip_path)
        source_meta["ranked_domains"] = len(rank_by_domain)
        inferred_id = inferred_list_id_from_zip(zip_path)
        if inferred_id and not source_meta.get("list_id"):
            source_meta["list_id"] = inferred_id
        if source_meta.get("list_id") and not source_meta.get("download_url"):
            source_meta["download_url"] = f"https://tranco-list.eu/download/{source_meta['list_id']}/1000000"
        save_cache_index(
            cache_dir,
            {
                "updated_at_utc": now_utc_iso(),
                "source_meta": source_meta,
                "ranked_domains": len(rank_by_domain),
                "zip_path": str(zip_path),
            },
        )
        return rank_by_domain, source_meta, warnings
    except Exception as exc:
        warnings.append(f"Failed to parse Tranco zip: {type(exc).__name__}: {exc}")
        return {}, source_meta, warnings


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
        help="Cache directory for Tranco zip files (default: <out-dir>/.cache)",
    )
    parser.add_argument("--timeout", type=int, default=30, help="Network timeout in seconds (default: 30)")
    parser.add_argument("--force-download", action="store_true", help="Force re-download even if cached zip exists")
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
        rows, input_source = load_rows(input_json, input_csv)
    except Exception as exc:
        print(f"Failed to read input rows: {exc}", file=sys.stderr)
        return 1

    domain_stats, mentions_total = aggregate_news_domains(rows)
    rank_by_domain, source_meta, warnings = resolve_rank_data(cache_dir, timeout=args.timeout, force_download=args.force_download)

    reach_rows = build_outlet_reach_rows(domain_stats, rank_by_domain, source_meta)
    metadata = build_metadata(reach_rows, mentions_total=mentions_total, source_meta=source_meta, input_source=input_source, warnings=warnings)

    out_json = out_dir / "outlet_reach.json"
    out_csv = out_dir / "outlet_reach.csv"
    out_meta = out_dir / "reach_metadata.json"

    out_json.write_text(json.dumps(reach_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(out_csv, reach_rows)
    out_meta.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Wrote {out_json}")
    print(f"Wrote {out_csv}")
    print(f"Wrote {out_meta}")
    if warnings:
        for w in warnings:
            print(f"WARNING: {w}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

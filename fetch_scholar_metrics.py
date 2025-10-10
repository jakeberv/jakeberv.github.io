# fetch_scholar_metrics.py
from scholarly import scholarly, ProxyGenerator
import json
import os
import time
from pathlib import Path
from typing import Optional, Dict, Any

# ---------- Configuration ----------
SCHOLAR_ID = os.getenv("SCHOLAR_ID", "cQQaGZQAAAAJ")
REQUIRE_FREE_PROXY = os.getenv("REQUIRE_FREE_PROXY", "1").strip().lower() not in ("0", "false", "no")
MAX_PUB_RETRIES = 3
PROXY_INIT_RETRIES = 5
AUTHOR_FETCH_RETRIES = 5
CRAWL_DELAY = float(os.getenv("CRAWL_DELAY", "2"))
MAX_PUBS = int(os.getenv("MAX_PUBS", "12"))
OUT_PATH = Path("_data/scholar_metrics.json")


# ---------- Proxy Handling ----------
def init_free_proxy(max_attempts: int = PROXY_INIT_RETRIES) -> Optional[ProxyGenerator]:
    for attempt in range(1, max_attempts + 1):
        try:
            print(f"[proxy] Attempt {attempt}/{max_attempts} to fetch free proxies...")
            pg = ProxyGenerator()
            ok = pg.FreeProxies()
            if ok:
                scholarly.use_proxy(pg)
                print("[proxy] ✅ Free proxy configured.")
                return pg
            else:
                print("[proxy] ❌ FreeProxies() returned False.")
        except Exception as e:
            print(f"[proxy] ❌ Exception during FreeProxies(): {e}")
        time.sleep(min(10, 2 * attempt))
    print("[proxy] ⚠️ Could not obtain a working free proxy after retries.")
    return None


def switch_proxy(pg_holder: Dict[str, Optional[ProxyGenerator]]) -> None:
    print("[proxy] Switching proxy...")
    new_pg = init_free_proxy(max_attempts=3)
    if new_pg is not None:
        pg_holder["pg"] = new_pg
    else:
        print("[proxy] ⚠️ Could not obtain a new proxy; keeping existing.")


# ---------- Safe Save ----------
def ensure_outdir_safe():
    """Create _data only if missing. Do nothing if it exists."""
    if OUT_PATH.parent.exists():
        if not OUT_PATH.parent.is_dir():
            raise RuntimeError(f"[fatal] {OUT_PATH.parent} exists but is not a directory.")
        print(f"[info] Data folder {OUT_PATH.parent} exists — leaving it untouched.")
    else:
        print(f"[info] Creating data folder {OUT_PATH.parent}")
        OUT_PATH.parent.mkdir(parents=True, exist_ok=True)


# ---------- Fetch Helpers ----------
def fetch_author_with_retries(pg_holder: Dict[str, Optional[ProxyGenerator]], retries: int = AUTHOR_FETCH_RETRIES):
    """
    Repeatedly attempt to fetch & fill the author. Switch proxies and back off between tries.
    Returns a filled author dict or None.
    """
    for attempt in range(1, retries + 1):
        try:
            # Sometimes an immediate call after switching a proxy gets blocked; short pause helps.
            time.sleep(1.0)

            a = scholarly.search_author_id(SCHOLAR_ID)
            if not a:
                raise ValueError("search_author_id returned None")

            try:
                a = scholarly.fill(
                    a,
                    sections=["basics", "indices", "coauthors", "counts", "publications", "public_access"],
                )
            except Exception as e:
                print(f"[warn] fill(sections=...) failed ({e}); falling back to default fill()")
                a = scholarly.fill(a)

            # Validate result
            if not a or not isinstance(a, dict):
                raise ValueError("filled author is None or not a dict")

            # A minimal sanity check: name or citations present
            if not a.get("name") and not a.get("citedby"):
                raise ValueError("filled author missing key fields (name/citedby)")

            return a

        except Exception as e:
            print(f"[warn] Author fetch attempt {attempt}/{retries} failed: {e}")
            switch_proxy(pg_holder)
            time.sleep(min(20, 2 * attempt))  # exponential-ish backoff

    print("[error] Exhausted retries fetching author.")
    return None


def fetch_publication_details(pub: Dict[str, Any], pg_holder: Dict[str, Optional[ProxyGenerator]]) -> Optional[Dict[str, Any]]:
    for attempt in range(1, MAX_PUB_RETRIES + 1):
        try:
            filled = scholarly.fill(pub)
            return {
                "title": filled.get("bib", {}).get("title", "N/A"),
                "citations": filled.get("num_citations", 0),
                "year": filled.get("bib", {}).get("pub_year", "N/A"),
                "venue": filled.get("bib", {}).get("venue", "N/A"),
                "url": filled.get("pub_url", "N/A"),
            }
        except Exception as e:
            print(f"[warn] pub fill failed (attempt {attempt}/{MAX_PUB_RETRIES}): {e}")
            switch_proxy(pg_holder)
            time.sleep(min(15, 1.5 * (2 ** (attempt - 1))))
    print("[error] giving up on a publication after retries.")
    return None


# ---------- Main ----------
def main() -> int:
    print(f"[info] Using SCHOLAR_ID={SCHOLAR_ID}")
    print(f"[info] REQUIRE_FREE_PROXY={REQUIRE_FREE_PROXY}")
    print(f"[info] MAX_PUBS={MAX_PUBS}, CRAWL_DELAY={CRAWL_DELAY}s")

    pg_holder = {"pg": init_free_proxy()}

    if REQUIRE_FREE_PROXY and pg_holder["pg"] is None:
        print("[fatal] No free proxy could be configured and REQUIRE_FREE_PROXY=1. Exiting.")
        return 2

    if not REQUIRE_FREE_PROXY and pg_holder["pg"] is None:
        scholarly.use_proxy(None)
        print("[proxy] Proceeding without proxy (REQUIRE_FREE_PROXY=0).")

    author = fetch_author_with_retries(pg_holder, retries=AUTHOR_FETCH_RETRIES)
    if not author:
        print("[fatal] Error fetching author data after retries.")
        return 1

    print(f"[info] Fetched author: {author.get('name', 'Unknown')}")

    # Publications
    publications_data = []
    pubs = author.get("publications", []) or []
    if MAX_PUBS > 0:
        pubs = pubs[:MAX_PUBS]

    for i, pub in enumerate(pubs, 1):
        print(f"[info] Processing publication {i}/{len(pubs)}")
        details = fetch_publication_details(pub, pg_holder)
        if details:
            publications_data.append(details)
        time.sleep(CRAWL_DELAY)

    # Final data
    scholar_data = {
        "name": author.get("name", "N/A"),
        "affiliation": author.get("affiliation", "N/A"),
        "email_domain": author.get("email_domain", author.get("email", "N/A")),
        "h_index": author.get("hindex", "N/A"),
        "i10_index": author.get("i10index", "N/A"),
        "citations": author.get("citedby", "N/A"),
        "cites_per_year": author.get("cites_per_year", {}),
        "interests": author.get("interests", []),
        "coauthors": [
            {
                "name": c.get("name", "N/A"),
                "affiliation": c.get("affiliation", "N/A"),
                "scholar_id": c.get("scholar_id", "N/A"),
            }
            for c in author.get("coauthors", [])
        ],
        "profile_picture": author.get("url_picture", "N/A"),
        "homepage": author.get("homepage", "N/A"),
        "organization": author.get("organization", "N/A"),
        "public_access": author.get("public_access", "N/A"),
        "total_publications": len(author.get("publications", []) or []),
        "publications_fetched": len(publications_data),
        "publications": publications_data,
        "generated_at": int(time.time()),
        "proxy_mode": "free" if pg_holder["pg"] else "none",
    }

    print(json.dumps(scholar_data, indent=2))

    # Save
    try:
        ensure_outdir_safe()
        with OUT_PATH.open("w", encoding="utf-8") as f:
            json.dump(scholar_data, f, indent=2, ensure_ascii=False)
        print(f"[info] Saved to {OUT_PATH}")
    except Exception as e:
        print(f"[fatal] Error saving data: {e}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

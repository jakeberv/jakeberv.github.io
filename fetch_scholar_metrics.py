from scholarly import scholarly, ProxyGenerator
import json
import os
import time
import random
from pathlib import Path
from typing import Optional, Dict, Any

# ---------- Configuration ----------
SCHOLAR_ID = os.getenv("SCHOLAR_ID", "cQQaGZQAAAAJ")
REQUIRE_FREE_PROXY = os.getenv("REQUIRE_FREE_PROXY", "1").strip().lower() not in ("0", "false", "no")
MAX_PUB_RETRIES = 3
PROXY_INIT_RETRIES = 5
AUTHOR_FETCH_RETRIES = int(os.getenv("AUTHOR_FETCH_RETRIES", "10"))
CRAWL_DELAY = float(os.getenv("CRAWL_DELAY", "2"))
MAX_PUBS = int(os.getenv("MAX_PUBS", "12"))
OUT_PATH = Path("_data/scholar_metrics.json")

# ---------- Helper: backoff with jitter ----------
def backoff_sleep(base: float, attempt: int, cap: float = 20.0, jitter: float = 0.5):
    sleep_for = min(cap, base * (2 ** (attempt - 1)))
    sleep_for += random.uniform(-jitter, jitter)
    if sleep_for < 0.2:
        sleep_for = 0.2
    time.sleep(sleep_for)

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
        backoff_sleep(base=1.5, attempt=attempt, cap=10, jitter=0.75)
    print("[proxy] ⚠️ Could not obtain a working free proxy after retries.")
    return None

def use_no_proxy():
    scholarly.use_proxy(None)
    print("[proxy] ⚠️ Temporarily using NO proxy for bootstrap fetch.")

def switch_proxy(pg_holder: Dict[str, Optional[ProxyGenerator]]) -> None:
    print("[proxy] Switching proxy...")
    new_pg = init_free_proxy(max_attempts=3)
    if new_pg is not None:
        pg_holder["pg"] = new_pg
    else:
        print("[proxy] ⚠️ Could not obtain a new proxy; keeping existing.")

# ---------- Safe Save ----------
def ensure_outdir_safe():
    if OUT_PATH.parent.exists():
        if not OUT_PATH.parent.is_dir():
            raise RuntimeError(f"[fatal] {OUT_PATH.parent} exists but is not a directory.")
        print(f"[info] Data folder {OUT_PATH.parent} exists — leaving it untouched.")
    else:
        print(f"[info] Creating data folder {OUT_PATH.parent}")
        OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

# ---------- Fetch Helpers ----------
def try_fill_author_light(a) -> Optional[dict]:
    """Try light fills first to reduce block risk."""
    if not a:
        return None
    try:
        b = scholarly.fill(a)
        if isinstance(b, dict) and (b.get("name") or b.get("citedby")):
            return b
    except Exception as e:
        print(f"[warn] vanilla fill() failed: {e}")

    try:
        b = scholarly.fill(a, sections=["basics", "indices"])
        if isinstance(b, dict) and (b.get("name") or b.get("citedby")):
            return b
    except Exception as e:
        print(f"[warn] fill(basics,indices) failed: {e}")

    try:
        b = scholarly.fill(a, sections=["basics"])
        if isinstance(b, dict) and (b.get("name") or b.get("citedby")):
            return b
    except Exception as e:
        print(f"[warn] fill(basics) failed: {e}")

    return None

def fetch_author_with_retries(pg_holder: Dict[str, Optional[ProxyGenerator]], retries: int = AUTHOR_FETCH_RETRIES):
    """Try repeatedly to fetch the author. If free proxies keep failing, do one bootstrap fetch without proxy."""
    bootstrap_done = False
    for attempt in range(1, retries + 1):
        try:
            time.sleep(1.0)
            a = scholarly.search_author_id(SCHOLAR_ID)
            if not a:
                raise ValueError("search_author_id returned None")

            b = try_fill_author_light(a)
            if isinstance(b, dict):
                return b

            raise ValueError("author fill returned None or invalid structure")

        except Exception as e:
            print(f"[warn] Author fetch attempt {attempt}/{retries} failed: {e}")

            # Bootstrap attempt once if proxies consistently fail
            if not bootstrap_done and attempt >= 2:
                bootstrap_done = True
                print("[proxy] Trying ONE bootstrap attempt without proxy for author only...")
                use_no_proxy()
                try:
                    a2 = scholarly.search_author_id(SCHOLAR_ID)
                    b2 = try_fill_author_light(a2)
                    if isinstance(b2, dict):
                        print("[proxy] ✅ Bootstrap succeeded. Switching back to free proxies.")
                        switch_proxy(pg_holder)
                        return b2
                except Exception as e2:
                    print(f"[warn] Bootstrap without proxy failed: {e2}")
                # Always restore free proxy afterwards
                switch_proxy(pg_holder)
            else:
                switch_proxy(pg_holder)

            backoff_sleep(base=2.0, attempt=attempt, cap=20, jitter=1.25)

    print("[error] ❌ Exhausted retries fetching author.")
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
            backoff_sleep(base=1.5, attempt=attempt, cap=15, jitter=0.5)
    print("[error] giving up on a publication after retries.")
    return None

# ---------- Main ----------
def main() -> int:
    print(f"[info] Using SCHOLAR_ID={SCHOLAR_ID}")
    print(f"[info] REQUIRE_FREE_PROXY={REQUIRE_FREE_PROXY}")
    print(f"[info] MAX_PUBS={MAX_PUBS}, CRAWL_DELAY={CRAWL_DELAY}s")

    pg_holder = {"pg": init_free_proxy()}
    
    # If free proxy init failed, try ONE bootstrap run without proxy (even if REQUIRE_FREE_PROXY=1)
    if pg_holder["pg"] is None:
        print("[proxy] No free proxy available. Attempting ONE bootstrap run without proxy...")
        use_no_proxy()

    author = fetch_author_with_retries(pg_holder, retries=AUTHOR_FETCH_RETRIES)
    if not author:
        print("[fatal] Error fetching author data after retries.")
        return 1

    print(f"[info] ✅ Fetched author: {author.get('name', 'Unknown')}")

    # Always attempt a fuller fill and MERGE it (don’t replace), so we don’t lose hindex/i10index
    try:
        filled = scholarly.fill(
            author,
            sections=["basics", "indices", "publications", "coauthors", "counts", "public_access"],
        )
        if isinstance(filled, dict):
            author.update(filled)  # shallow merge preserves any fields gathered earlier
    except Exception as e:
        print(f"[warn] follow-up fill failed: {e}")
    
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

    # --- Preserve previous numeric metrics if this run lost them (e.g., proxy hiccup) ---
    prev = {}
    if OUT_PATH.exists():
        try:
            prev = json.loads(OUT_PATH.read_text(encoding="utf-8"))
        except Exception:
            prev = {}

    def _bad(v):
        return v in (None, "", "N/A")

    for k in ["h_index", "i10_index", "citations", "total_publications"]:
        if _bad(scholar_data.get(k)) and not _bad(prev.get(k)):
            scholar_data[k] = prev[k]
    # --- end guard ---

    # --- Hard & anomaly guards to avoid saving bad data ---
    def _is_intlike(x):
        try:
            int(x)
            return True
        except Exception:
            return False

    essential_ok = _is_intlike(scholar_data.get("h_index")) and _is_intlike(scholar_data.get("i10_index"))
    print(f"[debug] essential_ok={essential_ok}; h_index={scholar_data.get('h_index')} i10_index={scholar_data.get('i10_index')}")

    # If citations suddenly drop by >40% vs previous, skip save (likely a bad scrape)
    prev_cites = prev.get("citations")
    cur_cites = scholar_data.get("citations")
    if isinstance(prev_cites, int) and isinstance(cur_cites, int):
        if cur_cites < max(0, int(prev_cites * 0.6)):
            print(f"[warn] Citations dropped unusually ({cur_cites} < 60% of {prev_cites}); preserving previous JSON and skipping save.")
            return 0

    # If we already have a file and essentials are missing, skip save
    if OUT_PATH.exists() and not essential_ok:
        print("[warn] h-index and/or i10-index missing this run; preserving previous JSON and skipping save.")
        return 0
    # --- end guards ---
    
    print(json.dumps(scholar_data, indent=2))

    try:
        ensure_outdir_safe()
        with OUT_PATH.open("w", encoding="utf-8") as f:
            json.dump(scholar_data, f, indent=2, ensure_ascii=False)
        print(f"[info] ✅ Saved to {OUT_PATH}")
    except Exception as e:
        print(f"[fatal] Error saving data: {e}")
        return 1

    return 0

if __name__ == "__main__":
    raise SystemExit(main())

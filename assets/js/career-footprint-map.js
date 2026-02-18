(function careerFootprintBootstrap() {
  const root = document.getElementById("careerFootprintApp");
  if (!root) return;

  if (!window.d3 || !window.topojson) {
    root.innerHTML =
      '<p style="margin:0.5rem 0 0;color:#7d2a2a;">Map dependencies failed to load. Please refresh.</p>';
    return;
  }

  const d3 = window.d3;
  const topojson = window.topojson;

  const DATA_URL = root.dataset.dataUrl || "/data/career_geo/career_footprint.json";
  const WORLD_URL = root.dataset.worldUrl || "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
  const WORLD_URL_FALLBACK =
    root.dataset.worldUrlFallback || "https://unpkg.com/world-atlas@2/countries-110m.json";
  const ISO_A2_TO_NUMERIC = {
    US: "840",
    EC: "218",
    ZA: "710",
    SR: "740",
    PG: "598",
    GT: "320",
    HN: "340",
    KE: "404",
    BR: "076",
    CA: "124",
    AR: "032",
    JP: "392",
    MX: "484",
    NZ: "554",
    GB: "826",
    FR: "250",
  };
  const NUMERIC_TO_ISO_A2 = Object.fromEntries(
    Object.entries(ISO_A2_TO_NUMERIC).map(([a2, numeric]) => [numeric, a2])
  );

  const DEFAULT_STATE = {
    mode: "countries",
    window: "all",
    excludeUS: false,
  };

  const state = { ...DEFAULT_STATE };

  const svg = d3.select(root.querySelector(".cfp-map"));
  const gBackdrop = svg.append("g");
  const gBase = svg.append("g");
  const gData = svg.append("g");

  const tooltip = root.querySelector("[data-tooltip]");
  const insightCardEl = root.querySelector(".cfp-insight-card");
  const mapTitle = root.querySelector("[data-map-title]");
  const mapSubtitle = root.querySelector("[data-map-subtitle]");
  const legend = root.querySelector("[data-legend]");

  const kpi = {
    entries: root.querySelector('[data-kpi="entries"]'),
    countries: root.querySelector('[data-kpi="countries"]'),
    localities: root.querySelector('[data-kpi="localities"]'),
    hotspot: root.querySelector('[data-kpi="hotspot"]'),
  };

  const controlButtons = Array.from(root.querySelectorAll("[data-control]"));
  const excludeUSInput = root.querySelector('[data-toggle="exclude-us"]');
  const resetBtn = root.querySelector('[data-action="reset"]');

  let worldFeatures = [];
  let allEntries = [];
  let projection;
  let path;

  init().catch((error) => {
    console.error(error);
    mapTitle.textContent = "Map Unavailable";
    mapSubtitle.textContent = "Failed to load required data sources.";
    legend.innerHTML = "";
  });

  async function init() {
    const [dataPayload, worldAtlas] = await Promise.all([
      fetchJson(DATA_URL),
      fetchJsonWithFallback([WORLD_URL, WORLD_URL_FALLBACK]),
    ]);

    allEntries = (dataPayload.entries || []).map(normalizeEntry);
    worldFeatures = topojson.feature(worldAtlas, worldAtlas.objects.countries).features;

    projection = d3.geoNaturalEarth1().fitExtent(
      [
        [12, 10],
        [968, 510],
      ],
      { type: "FeatureCollection", features: worldFeatures }
    );
    path = d3.geoPath(projection);

    drawBaseMap();
    wireControls();
    syncControlButtons();
    render();
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    return res.json();
  }

  async function fetchJsonWithFallback(urls) {
    let lastError = null;
    for (const url of urls) {
      try {
        return await fetchJson(url);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Failed to load required JSON");
  }

  function normalizeEntry(entry) {
    const normalizedScope = entry.scope === "event" ? "event" : "virtual";
    return {
      id: entry.id || "",
      title: entry.title || "",
      date: normalizeDate(entry.date),
      year: Number(entry.year || 1900),
      scope: normalizedScope,
      countries: (entry.countries || [])
        .map((c) => ({
          code: String(c.code || "").toUpperCase(),
          name: c.name || countryName(c.code),
          region_m49: String(c.region_m49 || "").padStart(3, "0"),
          weight: Number(c.weight || 1),
        }))
        .filter((c) => c.code),
      localities: (entry.localities || [])
        .map((loc) => ({
          name: String(loc.name || "").trim(),
          country_code: String(loc.country_code || "").toUpperCase(),
          lat: Number(loc.lat),
          lon: Number(loc.lon),
          weight: Number(loc.weight || 1),
        }))
        .filter(
          (loc) =>
            loc.name &&
            loc.country_code &&
            Number.isFinite(loc.lat) &&
            Number.isFinite(loc.lon)
        ),
    };
  }

  function normalizeDate(value) {
    const raw = String(value || "");
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : "1900-01-01";
  }

  function drawBaseMap() {
    gBackdrop
      .append("path")
      .datum({ type: "Sphere" })
      .attr("class", "cfp-map-sphere")
      .attr("d", path);

    gBackdrop
      .append("path")
      .datum(d3.geoGraticule10())
      .attr("class", "cfp-graticule")
      .attr("d", path);

    gBase
      .selectAll("path.cfp-country-shape")
      .data(worldFeatures)
      .join("path")
      .attr("class", "cfp-country-shape")
      .attr("d", path)
      .attr("fill", "var(--cfp-land)");
  }

  function wireControls() {
    controlButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const control = btn.dataset.control;
        const value = btn.dataset.value;
        if (!control) return;
        state[control] = value;
        syncControlButtons();
        render();
      });
    });

    excludeUSInput.addEventListener("change", () => {
      state.excludeUS = excludeUSInput.checked;
      render();
    });

    resetBtn.addEventListener("click", () => {
      Object.assign(state, DEFAULT_STATE);
      excludeUSInput.checked = false;
      syncControlButtons();
      render();
    });

    window.addEventListener("resize", () => {
      window.requestAnimationFrame(syncPanelHeight);
    });

    svg.node().addEventListener("mouseleave", hideTooltip);
  }

  function syncControlButtons() {
    controlButtons.forEach((btn) => {
      const control = btn.dataset.control;
      const value = btn.dataset.value;
      btn.classList.toggle("is-active", state[control] === value);
    });
  }

  function render() {
    const filteredEntries = filterEntries(allEntries);
    const aggregates = aggregateGeo(filteredEntries, state.excludeUS);
    renderKpis(filteredEntries, aggregates);
    renderLists(aggregates, filteredEntries);
    renderMap(aggregates, filteredEntries.length);
    window.requestAnimationFrame(syncPanelHeight);
  }

  function filterEntries(entries) {
    const maxYear = d3.max(entries, (d) => d.year) || new Date().getFullYear();
    const minYear =
      state.window === "all" ? -Infinity : state.window === "10y" ? maxYear - 9 : maxYear - 4;

    return entries.filter((entry) => (entry.year || 0) >= minYear);
  }

  function aggregateGeo(entries, excludeUS) {
    const countries = new Map();
    const localities = new Map();

    for (const entry of entries) {
      const countryCodesInEntry = new Set();
      for (const country of entry.countries || []) {
        if (!country.code) continue;
        if (excludeUS && country.code === "US") continue;
        if (countryCodesInEntry.has(country.code)) continue;
        countryCodesInEntry.add(country.code);

        const key = country.code;
        const current = countries.get(key) || {
          key,
          code: country.code,
          name: country.name || countryName(country.code),
          value: 0,
          entries: new Set(),
        };

        current.entries.add(entry.id);
        countries.set(key, current);
      }

      const localityKeysInEntry = new Set();
      for (const loc of entry.localities || []) {
        if (excludeUS && loc.country_code === "US") continue;

        const key = `${loc.name}|${loc.country_code}|${loc.lat}|${loc.lon}`;
        if (localityKeysInEntry.has(key)) continue;
        localityKeysInEntry.add(key);

        const current = localities.get(key) || {
          key,
          name: loc.name,
          country_code: loc.country_code,
          lat: Number(loc.lat),
          lon: Number(loc.lon),
          value: 0,
          entries: new Set(),
        };

        current.entries.add(entry.id);
        localities.set(key, current);
      }
    }

    for (const item of countries.values()) {
      item.value = item.entries.size;
    }
    for (const item of localities.values()) {
      item.value = item.entries.size;
    }

    return {
      countries: Array.from(countries.values()).sort((a, b) => b.value - a.value),
      localities: Array.from(localities.values()).sort((a, b) => b.value - a.value),
    };
  }

  function renderKpis(filteredEntries, aggregates) {
    kpi.entries.textContent = formatInt(filteredEntries.length);
    kpi.countries.textContent = formatInt(aggregates.countries.length);
    kpi.localities.textContent = formatInt(aggregates.localities.length);

    if (state.mode === "countries") {
      const top = aggregates.countries[0];
      kpi.hotspot.textContent = top
        ? `${top.name || top.code} (${formatInt(top.value)})`
        : "No matching countries";
      return;
    }

    const top = aggregates.localities[0];
    kpi.hotspot.textContent = top
      ? `${top.name}, ${top.country_code} (${formatInt(top.value)})`
      : "No matching localities";
  }

  function renderLists(aggregates, filteredEntries) {
    renderRankList(root.querySelector("[data-top-countries]"), aggregates.countries.slice(0, 7), {
      label: (d) => d.name || d.code,
      value: (d) => d.value,
    });

    renderRankList(root.querySelector("[data-top-localities]"), aggregates.localities.slice(0, 7), {
      label: (d) => `${d.name}, ${d.country_code}`,
      value: (d) => d.value,
    });

    const recentContainer = root.querySelector("[data-recent-entries]");
    const recent = [...filteredEntries].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 4);

    recentContainer.innerHTML = recent
      .map((entry) => {
        const countryLabel =
          (entry.countries || []).slice(0, 3).map((c) => c.code).join(", ") || "-";
        return `
          <article class="cfp-recent-item">
            <p class="cfp-recent-date">${escapeHtml(entry.date)} · ${escapeHtml(countryLabel)}</p>
            <p>${escapeHtml(entry.title)}</p>
          </article>
        `;
      })
      .join("");
  }

  function renderRankList(container, items, { label, value }) {
    if (!items.length) {
      container.innerHTML = '<p class="cfp-empty-note">No data for current filters.</p>';
      return;
    }

    const maxValue = d3.max(items, value) || 1;
    container.innerHTML = items
      .map((item) => {
        const v = Number(value(item) || 0);
        const pct = Math.max(4, Math.round((v / maxValue) * 100));
        return `
          <div class="cfp-rank-row-wrap">
            <div class="cfp-rank-row">
              <span class="name">${escapeHtml(label(item))}</span>
              <span class="value">${formatInt(v)}</span>
            </div>
            <div class="cfp-rank-bar"><span style="width:${pct}%"></span></div>
          </div>
        `;
      })
      .join("");
  }

  function renderMap(aggregates, totalEntries) {
    gData.selectAll("*").remove();
    hideTooltip();

    if (state.mode === "countries") {
      mapTitle.textContent = "Country Footprint";
      mapSubtitle.textContent = "Log scale improves comparability when one country dominates.";
      renderCountryMode(aggregates.countries, totalEntries);
      return;
    }

    mapTitle.textContent = "Locality Hotspots";
    mapSubtitle.textContent =
      "Bubble size reflects locality concentration from geo.localities; hover for event counts.";
    renderLocalityMode(aggregates.localities, totalEntries);
  }

  function renderCountryMode(countryRows, totalEntries) {
    const valueByCode = new Map(countryRows.map((row) => [row.code, row]));
    const rawValues = countryRows.map((d) => d.value).filter((v) => v > 0);

    const transform = (v) => Math.log1p(v);
    const maxT = d3.max(rawValues.map(transform)) || 1;
    const palette = getCountryPalette();
    const rampStart = palette.rampStart;

    const colorInterp = d3.scaleLinear().domain([0, maxT]).range([rampStart, 1]).clamp(true);
    const countryInterpolator = d3.interpolateRgbBasis(palette.colors);
    const colorFor = (value) => countryInterpolator(colorInterp(transform(value)));

    gBase
      .selectAll("path.cfp-country-shape")
      .attr("fill", (feature) => {
        const code = countryCodeForFeature(feature);
        const row = code ? valueByCode.get(code) : null;
        return row && row.value > 0 ? colorFor(row.value) : "var(--cfp-land)";
      })
      .attr("opacity", (feature) => {
        const code = countryCodeForFeature(feature);
        const row = code ? valueByCode.get(code) : null;
        if (!row) return 1;
        if (!state.excludeUS) return 1;
        return row.code === "US" ? 0.36 : 1;
      })
      .on("mousemove", (event, feature) => {
        const code = countryCodeForFeature(feature);
        const row = code ? valueByCode.get(code) : null;
        if (!row) {
          hideTooltip();
          return;
        }

        const share = totalEntries > 0 ? (row.entries.size / totalEntries) * 100 : 0;
        showTooltip(
          event,
          `<strong>${escapeHtml(row.name || row.code)}</strong>${formatInt(row.value)} events<br>${formatInt(
            row.entries.size
          )} entries · ${formatPct(share)} of view`
        );
      })
      .on("mouseleave", hideTooltip);

    const minV = d3.min(rawValues) || 0;
    const medV = d3.quantile(rawValues.sort((a, b) => a - b), 0.5) || minV;
    const maxV = d3.max(rawValues) || 0;

    renderLegendRamp({
      start: countryInterpolator(rampStart),
      end: countryInterpolator(1),
      left: formatInt(minV),
      right: formatInt(maxV),
      note: `Log · median ${formatInt(medV)}`,
    });
  }

  function countryCodeForFeature(feature) {
    const numeric = String(feature.id).padStart(3, "0");
    return NUMERIC_TO_ISO_A2[numeric] || null;
  }

  function renderLocalityMode(localityRows, totalEntries) {
    gBase
      .selectAll("path.cfp-country-shape")
      .attr("fill", "var(--cfp-land)")
      .attr("opacity", 1)
      .on("mousemove", null)
      .on("mouseleave", null);

    const maxValue = d3.max(localityRows, (d) => d.value) || 1;
    const radius = d3.scaleSqrt().domain([1, maxValue]).range([3, 19]);
    const alpha = d3.scaleLinear().domain([1, maxValue]).range([0.42, 0.9]).clamp(true);

    gData
      .selectAll("circle.cfp-locality-dot")
      .data(localityRows)
      .join("circle")
      .attr("class", "cfp-locality-dot")
      .attr("cx", (d) => projection([d.lon, d.lat])[0])
      .attr("cy", (d) => projection([d.lon, d.lat])[1])
      .attr("r", (d) => radius(d.value))
      .style("fill-opacity", (d) => alpha(d.value))
      .on("mousemove", (event, d) => {
        const share = totalEntries > 0 ? (d.entries.size / totalEntries) * 100 : 0;
        showTooltip(
          event,
          `<strong>${escapeHtml(d.name)}, ${escapeHtml(d.country_code)}</strong>${formatInt(
            d.value
          )} events<br>${formatInt(d.entries.size)} entries · ${formatPct(share)} of view`
        );
      })
      .on("mouseleave", hideTooltip);

    renderLegendDot({
      color: "var(--cfp-hotspot)",
      left: "Smaller",
      right: `Larger · max ${formatInt(maxValue)}`,
      note: "Size by event count",
    });
  }

  function renderLegendRamp({ start, end, left, right, note }) {
    legend.innerHTML = `
      <span class="cfp-legend-label">${escapeHtml(left)}</span>
      <span class="cfp-legend-ramp" style="--legend-start:${start};--legend-end:${end}"></span>
      <span class="cfp-legend-label">${escapeHtml(right)}</span>
      <span class="cfp-legend-note">${escapeHtml(note)}</span>
    `;
  }

  function renderLegendDot({ color, left, right, note }) {
    legend.innerHTML = `
      <span class="cfp-legend-label">${escapeHtml(left)}</span>
      <span class="cfp-legend-dot" style="--legend-dot:${color}"></span>
      <span class="cfp-legend-label">${escapeHtml(right)}</span>
      <span class="cfp-legend-note">${escapeHtml(note)}</span>
    `;
  }

  function getCountryPalette() {
    return {
      label: "Default",
      rampStart: 0.28,
      colors: [
        "#c3e8dd",
        "#99d6d5",
        "#6bbdd1",
        "#499ebf",
        "#347fa9",
        "#266289",
        "#1b496f",
        "#12365a",
        "#0e294a",
      ],
    };
  }

  function countryName(code) {
    const upper = String(code || "").toUpperCase();
    if (!upper) return "";
    try {
      if (Intl.DisplayNames) {
        const labels = new Intl.DisplayNames(["en"], { type: "region" });
        return labels.of(upper) || upper;
      }
    } catch (error) {
      return upper;
    }
    return upper;
  }

  function showTooltip(event, html) {
    tooltip.hidden = false;
    tooltip.innerHTML = html;
    const mapRect = svg.node().getBoundingClientRect();
    const x = event.clientX - mapRect.left + 14;
    const y = event.clientY - mapRect.top + 14;
    tooltip.style.left = `${Math.min(x, mapRect.width - 228)}px`;
    tooltip.style.top = `${Math.min(y, mapRect.height - 92)}px`;
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }

  function syncPanelHeight() {
    if (!insightCardEl) return;
    insightCardEl.style.maxHeight = "";
  }

  function formatInt(value) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  function formatPct(value) {
    return `${Number(value || 0).toFixed(1)}%`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();

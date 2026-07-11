(function () {
  "use strict";

  var app = document.getElementById("talkMapApp");
  if (!app) return;

  var status = app.querySelector("[data-talk-status]");
  var mapNode = app.querySelector("[data-talk-map]");
  var listNode = app.querySelector("[data-talk-list]");
  var countNode = app.querySelector("[data-talk-count]");
  var tooltip = app.querySelector("[data-talk-tooltip]");
  var activeTags = new Set(
    Array.from(app.querySelectorAll("[data-talk-tag]")).map(function (button) {
      return button.dataset.talkTag;
    })
  );
  var activeWindow = "all";
  var payload = null;
  var world = null;

  function token(name, fallback) {
    var value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function cutoffDate() {
    if (activeWindow === "all" || !payload) return "0000-00-00";
    var parts = payload.as_of.split("-");
    return String(Number(parts[0]) - Number(activeWindow)) + "-" + parts[1] + "-" + parts[2];
  }

  function filteredEntries() {
    if (!payload) return [];
    var cutoff = cutoffDate();
    return payload.entries.filter(function (entry) {
      return entry.date >= cutoff && entry.speaking_tags.some(function (tag) {
        return activeTags.has(tag);
      });
    });
  }

  function renderList(entries) {
    listNode.replaceChildren();
    entries.slice().reverse().forEach(function (entry) {
      var item = document.createElement("li");
      item.className = "talkmap-event";
      var link = document.createElement("a");
      link.href = entry.url;
      link.textContent = entry.title;
      var meta = document.createElement("span");
      meta.className = "talkmap-event__meta";
      var places = entry.localities.map(function (locality) { return locality.name; }).join("; ");
      meta.textContent = entry.date.slice(0, 4) + " · " + places;
      item.append(link, meta);
      listNode.append(item);
    });
    countNode.textContent = String(entries.length);
  }

  function groupedLocations(entries) {
    var groups = new Map();
    entries.forEach(function (entry) {
      entry.localities.forEach(function (locality) {
        var key = locality.lat.toFixed(4) + "," + locality.lon.toFixed(4);
        if (!groups.has(key)) groups.set(key, { locality: locality, entries: [] });
        groups.get(key).entries.push(entry);
      });
    });
    return Array.from(groups.values());
  }

  function showTooltip(event, group) {
    tooltip.replaceChildren();
    var heading = document.createElement("strong");
    heading.textContent = group.locality.name;
    var detail = document.createElement("span");
    detail.textContent = group.entries.length + (group.entries.length === 1 ? " event" : " events");
    tooltip.append(heading, detail);
    tooltip.hidden = false;
    var bounds = app.getBoundingClientRect();
    var targetBounds = event.currentTarget && event.currentTarget.getBoundingClientRect
      ? event.currentTarget.getBoundingClientRect()
      : bounds;
    var clientX = Number.isFinite(event.clientX)
      ? event.clientX
      : targetBounds.left + targetBounds.width / 2;
    var clientY = Number.isFinite(event.clientY)
      ? event.clientY
      : targetBounds.top + targetBounds.height / 2;
    tooltip.style.left = Math.max(8, Math.min(clientX - bounds.left + 12, bounds.width - 190)) + "px";
    tooltip.style.top = Math.max(8, clientY - bounds.top + 12) + "px";
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }

  function renderMap(entries) {
    mapNode.replaceChildren();
    if (!world || !window.d3 || !window.topojson) return false;

    var d3 = window.d3;
    var countries = window.topojson.feature(world, world.objects.countries);
    var projection = d3.geoNaturalEarth1().fitExtent([[12, 12], [948, 508]], countries);
    var pathGenerator = d3.geoPath(projection);
    var svg = d3.select(mapNode);
    svg.append("path")
      .datum(countries)
      .attr("class", "talkmap-land")
      .attr("d", pathGenerator)
      .attr("fill", token("--viz-surface-muted", "#eef0f2"))
      .attr("stroke", token("--viz-outline", "#8a9298"));

    var groups = groupedLocations(entries);
    var maximum = Math.max(1, ...groups.map(function (group) { return group.entries.length; }));
    var radius = d3.scaleSqrt().domain([1, maximum]).range([5, 18]);
    svg.selectAll("circle")
      .data(groups)
      .join("circle")
      .attr("class", "talkmap-marker")
      .attr("cx", function (group) { return projection([group.locality.lon, group.locality.lat])[0]; })
      .attr("cy", function (group) { return projection([group.locality.lon, group.locality.lat])[1]; })
      .attr("r", function (group) { return radius(group.entries.length); })
      .attr("fill", token("--global-link-color", "#2979ab"))
      .attr("stroke", token("--site-link-contrast", "#ffffff"))
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", function (group) {
        return group.locality.name + ": " + group.entries.length + (group.entries.length === 1 ? " event" : " events");
      })
      .on("pointerenter focus", showTooltip)
      .on("pointermove", showTooltip)
      .on("pointerleave blur", hideTooltip)
      .on("keydown", function (event, group) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showTooltip(event, group);
        }
      });
    return true;
  }

  function render() {
    var entries = filteredEntries();
    renderList(entries);
    var mapped = renderMap(entries);
    if (mapped) {
      status.textContent = entries.length + (entries.length === 1 ? " event" : " events") + " shown across " + groupedLocations(entries).length + " locations.";
    } else if (payload) {
      status.textContent = "The map could not be drawn; the complete event list remains available.";
    }
  }

  function wireControls() {
    app.querySelectorAll("[data-talk-tag]").forEach(function (button) {
      button.addEventListener("click", function () {
        var tag = button.dataset.talkTag;
        if (activeTags.has(tag)) activeTags.delete(tag);
        else activeTags.add(tag);
        var selected = activeTags.has(tag);
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-pressed", String(selected));
        render();
      });
    });
    app.querySelectorAll("[data-talk-window]").forEach(function (button) {
      button.addEventListener("click", function () {
        activeWindow = button.dataset.talkWindow;
        app.querySelectorAll("[data-talk-window]").forEach(function (candidate) {
          var selected = candidate === button;
          candidate.classList.toggle("is-active", selected);
          candidate.setAttribute("aria-pressed", String(selected));
        });
        render();
      });
    });
  }

  async function fetchJson(url) {
    var response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) throw new Error("request failed with status " + response.status);
    return response.json();
  }

  async function loadWorld() {
    try {
      return await fetchJson(app.dataset.worldUrl);
    } catch (_primaryError) {
      return fetchJson(app.dataset.worldUrlFallback);
    }
  }

  async function initialize() {
    wireControls();
    try {
      payload = await fetchJson(app.dataset.dataUrl);
      renderList(filteredEntries());
    } catch (_error) {
      status.textContent = "Speaking-location data is unavailable right now.";
      return;
    }

    try {
      world = await loadWorld();
    } catch (_error) {
      world = null;
    }
    render();
  }

  window.addEventListener("site:themechange", render);
  initialize();
})();

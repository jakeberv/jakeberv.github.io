(function () {
  "use strict";

  var SPRING_EASE = "cubic-bezier(0.2, 0.9, 0.25, 1.2)";
  var MOTION_MS = 420;

  function parseGroupSet(rawValue) {
    if (!rawValue) {
      return new Set();
    }

    return new Set(
      rawValue
        .split(/\s+/)
        .map(function (value) {
          return value.trim();
        })
        .filter(Boolean)
    );
  }

  function getVisibleAnimationElements(page) {
    return Array.from(
      page.querySelectorAll("[data-news-year-block], [data-news-item]")
    ).filter(function (el) {
      return !el.classList.contains("is-hidden");
    });
  }

  function snapshotRects(elements) {
    var rects = new Map();
    elements.forEach(function (el) {
      rects.set(el, el.getBoundingClientRect());
    });
    return rects;
  }

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function animateReflow(page, beforeRects) {
    if (prefersReducedMotion()) {
      return;
    }

    var visibleAfter = getVisibleAnimationElements(page);

    requestAnimationFrame(function () {
      visibleAfter.forEach(function (el) {
        var beforeRect = beforeRects.get(el);
        var afterRect = el.getBoundingClientRect();

        if (!beforeRect) {
          el.classList.add("news-entering");
          requestAnimationFrame(function () {
            el.classList.add("news-entered");
          });
          window.setTimeout(function () {
            el.classList.remove("news-entering");
            el.classList.remove("news-entered");
          }, MOTION_MS + 80);
          return;
        }

        var dx = beforeRect.left - afterRect.left;
        var dy = beforeRect.top - afterRect.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
          return;
        }

        el.style.transition = "none";
        el.style.transform = "translate(" + dx + "px, " + dy + "px)";

        requestAnimationFrame(function () {
          el.style.transition =
            "transform " +
            MOTION_MS +
            "ms " +
            SPRING_EASE +
            ", opacity 220ms ease";
          el.style.transform = "translate(0, 0)";
        });
      });

      window.setTimeout(function () {
        visibleAfter.forEach(function (el) {
          el.style.transition = "";
          el.style.transform = "";
        });
      }, MOTION_MS + 120);
    });
  }

  function updateUrlForGroup(group) {
    var url = new URL(window.location.href);
    if (group === "all") {
      url.searchParams.delete("category");
    } else {
      url.searchParams.set("category", group);
    }
    window.history.replaceState({}, "", url.toString());
  }

  function setChipState(chips, activeGroup) {
    chips.forEach(function (chip) {
      var isActive = chip.dataset.group === activeGroup;
      chip.classList.toggle("is-active", isActive);
      chip.setAttribute("aria-pressed", String(isActive));
    });
  }

  function setYearJumpVisibility(page, yearLinks) {
    var visibleLinks = 0;
    yearLinks.forEach(function (link) {
      var yearValue = link.getAttribute("data-year");
      var block = page.querySelector(
        '[data-news-year-block][data-year="' + yearValue + '"]'
      );
      var shouldShow = !!block && !block.classList.contains("is-hidden");
      link.classList.toggle("is-hidden", !shouldShow);
      link.setAttribute("aria-hidden", String(!shouldShow));
      link.tabIndex = shouldShow ? 0 : -1;
      if (shouldShow) {
        visibleLinks += 1;
      }
    });

    var jumpRow = page.querySelector("[data-news-jump]");
    if (jumpRow) {
      jumpRow.hidden = visibleLinks === 0;
    }
  }

  function firstVisibleYearHeading(yearBlocks) {
    for (var i = 0; i < yearBlocks.length; i += 1) {
      if (!yearBlocks[i].classList.contains("is-hidden")) {
        return (
          yearBlocks[i].querySelector(".news-year-title") || yearBlocks[i]
        );
      }
    }
    return null;
  }

  function maybeScrollToVisibleYear(yearBlocks) {
    var target = firstVisibleYearHeading(yearBlocks);
    if (!target) {
      return;
    }

    var top = target.getBoundingClientRect().top;
    var isNearTop = top >= 0 && top <= window.innerHeight * 0.35;
    if (!isNearTop) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function applyFilter(state, group, options) {
    var config = options || {};
    var animate = config.animate !== false;
    var updateUrl = config.updateUrl !== false;
    var scroll = !!config.scrollToFirst;

    var normalizedGroup = state.validGroups.has(group) ? group : "all";
    var beforeRects = null;

    if (animate) {
      beforeRects = snapshotRects(getVisibleAnimationElements(state.page));
    }

    state.items.forEach(function (item) {
      var groups = parseGroupSet(item.dataset.groups);
      var matches =
        normalizedGroup === "all" || groups.has(normalizedGroup);
      item.classList.toggle("is-hidden", !matches);
      item.setAttribute("aria-hidden", String(!matches));
    });

    var visibleCount = 0;
    state.yearBlocks.forEach(function (block) {
      var visibleItems = block.querySelectorAll(
        "[data-news-item]:not(.is-hidden)"
      );
      var hasVisibleItems = visibleItems.length > 0;
      block.classList.toggle("is-hidden", !hasVisibleItems);
      block.setAttribute("aria-hidden", String(!hasVisibleItems));
      if (hasVisibleItems) {
        visibleCount += visibleItems.length;
      }
    });

    if (state.emptyNotice) {
      state.emptyNotice.hidden = visibleCount !== 0;
    }

    setChipState(state.chips, normalizedGroup);
    setYearJumpVisibility(state.page, state.yearLinks);

    if (animate && beforeRects) {
      animateReflow(state.page, beforeRects);
    }

    if (updateUrl) {
      updateUrlForGroup(normalizedGroup);
    }

    if (scroll) {
      maybeScrollToVisibleYear(state.yearBlocks);
    }
  }

  function initNewsFilters(page) {
    var chips = Array.from(page.querySelectorAll("[data-news-filter]"));
    var items = Array.from(page.querySelectorAll("[data-news-item]"));
    var yearBlocks = Array.from(page.querySelectorAll("[data-news-year-block]"));
    var yearLinks = Array.from(page.querySelectorAll("[data-news-year-link]"));
    var emptyNotice = page.querySelector("[data-news-empty]");

    if (!chips.length || !items.length || !yearBlocks.length) {
      return;
    }

    var validGroups = new Set(
      chips
        .map(function (chip) {
          return chip.dataset.group;
        })
        .filter(Boolean)
    );
    var initialGroup = new URL(window.location.href).searchParams.get("category");
    if (!validGroups.has(initialGroup)) {
      initialGroup = "all";
    }

    var state = {
      page: page,
      chips: chips,
      items: items,
      yearBlocks: yearBlocks,
      yearLinks: yearLinks,
      emptyNotice: emptyNotice,
      validGroups: validGroups
    };

    applyFilter(state, initialGroup, {
      animate: false,
      updateUrl: false,
      scrollToFirst: false
    });

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        applyFilter(state, chip.dataset.group, {
          animate: true,
          updateUrl: true,
          scrollToFirst: true
        });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var page = document.querySelector("[data-news-page]");
    if (!page) {
      return;
    }
    initNewsFilters(page);
  });
})();

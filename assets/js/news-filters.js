(function () {
  "use strict";

  var SPRING_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
  var MOTION_MS = 540;
  var OPACITY_MS = 320;
  var STAGGER_MS = 28;
  var MAX_STAGGER_MS = 168;
  var INCOMING_PHASE_MS = 60;
  var LIMIT_UNBOUNDED = 0;

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

  function getAnimationElements(page) {
    return Array.from(
      page.querySelectorAll("[data-news-year-block], [data-news-item]")
    );
  }

  function getVisibleAnimationElements(page) {
    return getAnimationElements(page).filter(function (el) {
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

  function visualOrderSort(elements) {
    return elements.slice().sort(function (a, b) {
      var aRect = a.getBoundingClientRect();
      var bRect = b.getBoundingClientRect();
      var topDiff = aRect.top - bRect.top;
      if (Math.abs(topDiff) > 1) {
        return topDiff;
      }
      return aRect.left - bRect.left;
    });
  }

  function getStaggerDelay(index) {
    return Math.min(index * STAGGER_MS, MAX_STAGGER_MS);
  }

  function clearAnimationStyles(el) {
    el.classList.remove("news-entering");
    el.classList.remove("news-entered");
    el.style.transition = "";
    el.style.transform = "";
    el.style.opacity = "";
    el.style.willChange = "";
    el.style.height = "";
    el.style.minHeight = "";
    el.style.maxHeight = "";
    el.style.overflow = "";
    el.style.removeProperty("--news-delay");
    el.style.removeProperty("--news-enter-ms");
  }

  function removeMotionGhosts() {
    Array.from(document.querySelectorAll(".news-motion-ghost")).forEach(
      function (ghost) {
        ghost.remove();
      }
    );
  }

  function clearAnimationState(page) {
    removeMotionGhosts();
    getAnimationElements(page).forEach(function (el) {
      clearAnimationStyles(el);
    });
  }

  function isNewsItemElement(el) {
    return !!el && el.hasAttribute("data-news-item");
  }

  function lockRowHeight(el) {
    if (!isNewsItemElement(el)) {
      return;
    }
    var rowHeight = el.getBoundingClientRect().height;
    if (!rowHeight || rowHeight <= 0) {
      return;
    }
    var rowHeightPx = rowHeight + "px";
    el.style.height = rowHeightPx;
    el.style.minHeight = rowHeightPx;
    el.style.maxHeight = rowHeightPx;
    el.style.overflow = "hidden";
  }

  function spawnExitGhost(state, el, fromRect, toRect, delay, animationNonce) {
    var ghost = el.cloneNode(true);
    ghost.classList.add("news-motion-ghost");
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.position = "fixed";
    ghost.style.left = fromRect.left + "px";
    ghost.style.top = fromRect.top + "px";
    ghost.style.width = fromRect.width + "px";
    ghost.style.height = fromRect.height + "px";
    ghost.style.margin = "0";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "9999";
    ghost.style.transformOrigin = "top left";
    ghost.style.opacity = "1";
    document.body.appendChild(ghost);

    requestAnimationFrame(function () {
      if (state.animationNonce !== animationNonce) {
        ghost.remove();
        return;
      }

      var ty = -22;
      if (toRect) {
        ty = toRect.top - fromRect.top - 16;
      }

      ghost.style.transition =
        "transform " +
        MOTION_MS +
        "ms " +
        SPRING_EASE +
        " " +
        delay +
        "ms, opacity " +
        OPACITY_MS +
        "ms ease " +
        delay +
        "ms";
      ghost.style.transform = "translate(0, " + ty + "px)";
      ghost.style.opacity = "0";
    });

    window.setTimeout(function () {
      ghost.remove();
    }, MOTION_MS + delay + 220);
  }

  function animateReflow(state, beforeRects, previousVisible) {
    if (prefersReducedMotion()) {
      return;
    }

    state.animationNonce += 1;
    var animationNonce = state.animationNonce;
    clearAnimationState(state.page);
    var visibleAfter = visualOrderSort(getVisibleAnimationElements(state.page));
    var previousItems = previousVisible.filter(isNewsItemElement);
    var afterItems = visibleAfter.filter(isNewsItemElement);
    var afterItemIndex = new Map();
    afterItems.forEach(function (el, index) {
      afterItemIndex.set(el, index);
    });

    requestAnimationFrame(function () {
      previousItems.forEach(function (el, previousIndex) {
        if (afterItemIndex.has(el)) {
          return;
        }
        var fromRect = beforeRects.get(el);
        if (!fromRect) {
          return;
        }
        var targetIndex = Math.min(previousIndex, afterItems.length - 1);
        var targetEl = targetIndex >= 0 ? afterItems[targetIndex] : null;
        var targetRect = targetEl ? targetEl.getBoundingClientRect() : null;
        var delay = getStaggerDelay(Math.min(previousIndex, 5));
        spawnExitGhost(state, el, fromRect, targetRect, delay, animationNonce);
      });

      visibleAfter.forEach(function (el, index) {
        var delay = getStaggerDelay(index);
        lockRowHeight(el);
        var beforeRect = beforeRects.get(el);
        var usedSlotRect = false;
        if (!beforeRect && isNewsItemElement(el)) {
          var slotIndex = afterItemIndex.get(el);
          var slotSource = previousItems[slotIndex];
          if (slotSource) {
            beforeRect = beforeRects.get(slotSource) || null;
            usedSlotRect = !!beforeRect;
          }
        }
        var afterRect = el.getBoundingClientRect();

        if (!beforeRect) {
          var enteringDelay = delay + INCOMING_PHASE_MS;
          el.style.setProperty("--news-delay", enteringDelay + "ms");
          el.style.setProperty("--news-enter-ms", MOTION_MS + "ms");
          el.classList.add("news-entering");
          requestAnimationFrame(function () {
            if (state.animationNonce !== animationNonce) {
              return;
            }
            el.classList.add("news-entered");
          });
          window.setTimeout(function () {
            if (state.animationNonce !== animationNonce) {
              return;
            }
            clearAnimationStyles(el);
          }, MOTION_MS + delay + 140);
          return;
        }

        var dy = beforeRect.top - afterRect.top;
        if (usedSlotRect) {
          if (Math.abs(dy) < 0.5) {
            dy = 34;
          } else {
            dy += dy >= 0 ? 14 : -14;
          }
        }
        if (!usedSlotRect && Math.abs(dy) < 0.5) {
          return;
        }

        el.style.willChange = "transform, opacity";
        el.style.transition = "none";
        el.style.transform = "translate(0, " + dy + "px)";
        el.style.opacity = usedSlotRect ? "0.1" : "1";

        requestAnimationFrame(function () {
          if (state.animationNonce !== animationNonce) {
            return;
          }
          var incomingDelay = delay + (usedSlotRect ? INCOMING_PHASE_MS : 0);
          el.style.transition =
            "transform " +
            MOTION_MS +
            "ms " +
            SPRING_EASE +
            " " +
            incomingDelay +
            "ms, opacity " +
            OPACITY_MS +
            "ms ease " +
            incomingDelay +
            "ms";
          el.style.transform = "translate(0, 0)";
          el.style.opacity = "1";
        });
      });

      window.setTimeout(function () {
        if (state.animationNonce !== animationNonce) {
          return;
        }
        visibleAfter.forEach(function (el) {
          clearAnimationStyles(el);
        });
      }, MOTION_MS + MAX_STAGGER_MS + 240);
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

  function parseLimit(rawValue) {
    var parsed = parseInt(rawValue, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return LIMIT_UNBOUNDED;
    }
    return parsed;
  }

  function parseBooleanWithDefault(rawValue, fallbackValue) {
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      return fallbackValue;
    }
    var normalized = String(rawValue).trim().toLowerCase();
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    return fallbackValue;
  }

  function updateAllNewsLink(allNewsLink, activeGroup) {
    if (!allNewsLink) {
      return;
    }

    var baseHref =
      allNewsLink.getAttribute("data-base-href") ||
      allNewsLink.getAttribute("href");
    if (!baseHref) {
      return;
    }

    var url = new URL(baseHref, window.location.origin);
    if (activeGroup === "all") {
      url.searchParams.delete("category");
    } else {
      url.searchParams.set("category", activeGroup);
    }
    allNewsLink.setAttribute(
      "href",
      url.pathname + url.search + url.hash
    );
  }

  function applyFilter(state, group, options) {
    var config = options || {};
    var animate = config.animate !== false;
    var updateUrl = config.updateUrl !== false;
    var scroll = !!config.scrollToFirst;

    var normalizedGroup = state.validGroups.has(group) ? group : "all";
    var beforeRects = null;
    var beforeVisible = [];
    var visibleIndex = 0;

    if (animate) {
      beforeVisible = visualOrderSort(getVisibleAnimationElements(state.page));
      beforeRects = snapshotRects(beforeVisible);
    }

    state.items.forEach(function (item) {
      var groups = parseGroupSet(item.dataset.groups);
      var matchesGroup =
        normalizedGroup === "all" || groups.has(normalizedGroup);
      var matchesLimit =
        state.limit <= LIMIT_UNBOUNDED || visibleIndex < state.limit;
      var isVisible = matchesGroup && matchesLimit;
      item.classList.toggle("is-hidden", !isVisible);
      item.setAttribute("aria-hidden", String(!isVisible));
      if (isVisible) {
        visibleIndex += 1;
      }
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
      animateReflow(state, beforeRects, beforeVisible);
    }

    if (updateUrl) {
      updateUrlForGroup(normalizedGroup);
    }

    updateAllNewsLink(state.allNewsLink, normalizedGroup);

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
    var allNewsLink = page.querySelector("[data-news-all-link]");

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
      validGroups: validGroups,
      limit: parseLimit(page.getAttribute("data-news-limit")),
      allNewsLink: allNewsLink,
      scrollOnClick: parseBooleanWithDefault(
        page.getAttribute("data-news-scroll-on-click"),
        true
      ),
      animationNonce: 0
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
          scrollToFirst: state.scrollOnClick
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

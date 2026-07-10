/* ==========================================================================
   Shared site interactions
   ========================================================================== */

/* jslint es6 */
"use strict";

const THEME_STORAGE_KEY = "theme";

function readSavedTheme() {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === "dark" || savedTheme === "light" ? savedTheme : null;
  } catch (error) {
    return null;
  }
}

function persistTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // The toggle remains usable for the current page when storage is blocked.
  }
}

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function syncThemeUi(theme) {
  const toggle = document.getElementById("theme-toggle");
  const icon = document.getElementById("theme-icon");
  const nextTheme = theme === "dark" ? "light" : "dark";
  const label = `Switch to ${nextTheme} theme`;

  if (toggle) {
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    toggle.setAttribute("title", label);
  }

  if (icon) {
    icon.classList.toggle("fa-sun", theme === "light");
    icon.classList.toggle("fa-moon", theme === "dark");
  }

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    const background = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue("--global-bg-color")
      .trim();
    if (background) themeColor.setAttribute("content", background);
  }
}

function applyTheme(theme, options = {}) {
  const normalizedTheme = theme === "dark" ? "dark" : "light";
  const previousTheme = currentTheme();

  if (normalizedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }

  if (options.persist) persistTheme(normalizedTheme);
  syncThemeUi(normalizedTheme);

  if (options.announce && previousTheme !== normalizedTheme) {
    window.dispatchEvent(
      new CustomEvent("site:themechange", {
        detail: { theme: normalizedTheme },
      }),
    );
  }
}

function initializeTheme() {
  applyTheme(readSavedTheme() === "dark" ? "dark" : "light");

  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark", {
        announce: true,
        persist: true,
      });
    });
  }
}

$(function () {
  const authorMenuButton = $(".author__urls-wrapper button");
  const authorLinks = $(".author__urls");
  let didResize = false;

  initializeTheme();

  const updateFooterSpacing = function () {
    $("body").css("padding-bottom", "0");
    $("body").css("margin-bottom", $(".page__footer").outerHeight(true));
  };

  const syncAuthorLinks = function () {
    authorLinks.stop(true, true).removeAttr("style");
    if (authorMenuButton.css("display") !== "none") {
      authorMenuButton.removeClass("open");
    }
  };

  updateFooterSpacing();

  $(window).on("resize", function () {
    didResize = true;
    syncAuthorLinks();
  });

  window.setInterval(function () {
    if (didResize) {
      didResize = false;
      updateFooterSpacing();
    }
  }, 250);

  authorMenuButton.on("click", function () {
    authorLinks.stop(true, true).fadeToggle("fast");
    $(this).toggleClass("open");
  });
});

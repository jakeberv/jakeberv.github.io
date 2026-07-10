/* ==========================================================================
   Shared site interactions
   ========================================================================== */

/* jslint es6 */
"use strict";

$(function () {
  const scssLarge = 925;
  let didResize = false;

  const updateFooterSpacing = function () {
    $("body").css("padding-bottom", "0");
    $("body").css("margin-bottom", $(".page__footer").outerHeight(true));
  };

  const restoreAuthorLinks = function () {
    if (
      $(".author__urls.social-icons").css("display") === "none" &&
      $(window).width() >= scssLarge
    ) {
      $(".author__urls").css("display", "block");
    }
  };

  updateFooterSpacing();

  $(window).on("resize", function () {
    didResize = true;
    restoreAuthorLinks();
  });

  window.setInterval(function () {
    if (didResize) {
      didResize = false;
      updateFooterSpacing();
    }
  }, 250);

  $(".author__urls-wrapper button").on("click", function () {
    $(".author__urls").stop(true, true).fadeToggle("fast");
    $(this).toggleClass("open");
  });
});

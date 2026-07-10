/* ==========================================================================
   Shared site interactions
   ========================================================================== */

/* jslint es6 */
"use strict";

$(function () {
  const authorMenuButton = $(".author__urls-wrapper button");
  let didResize = false;

  const updateFooterSpacing = function () {
    $("body").css("padding-bottom", "0");
    $("body").css("margin-bottom", $(".page__footer").outerHeight(true));
  };

  const restoreAuthorLinks = function () {
    if (
      authorMenuButton.css("display") === "none" &&
      $(".author__urls.social-icons").css("display") === "none"
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

  authorMenuButton.on("click", function () {
    $(".author__urls").stop(true, true).fadeToggle("fast");
    $(this).toggleClass("open");
  });
});

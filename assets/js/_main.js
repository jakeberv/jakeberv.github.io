/* ==========================================================================
   Shared site interactions
   ========================================================================== */

/* jslint es6 */
"use strict";

$(function () {
  const authorMenuButton = $(".author__urls-wrapper button");
  const authorLinks = $(".author__urls");
  let didResize = false;

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

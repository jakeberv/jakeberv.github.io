/*
 * Greedy Navigation
 *
 * http://codepen.io/lukejacksonn/pen/PwmwWV
 */

var $nav = $("#site-nav");
var $btn = $("#site-nav > .greedy-nav__toggle");
var $vlinks = $("#site-nav .visible-links");
var $vlinksPersistTail = $vlinks.children(".persist.tail");
var $hlinks = $("#site-nav .hidden-links");
var breaks = [];
var overflowButtonGutter = 8;

function syncOverflowPosition() {
  if ($btn.hasClass("hidden")) {
    $btn.css("right", "");
    $hlinks.css("right", "");
    $vlinksPersistTail.children(".theme-toggle").css("transform", "");
    return;
  }

  var tailWidth = $vlinksPersistTail.length
    ? $vlinksPersistTail.outerWidth(true)
    : 0;
  var buttonLeft = Math.max(
    $vlinks.width() - tailWidth + overflowButtonGutter,
    0,
  );
  var offset = Math.max(
    $nav.width() - buttonLeft - $btn.width(),
    0,
  );

  $btn.css("right", offset + "px");
  $hlinks.css("right", offset + "px");
  $vlinksPersistTail
    .children(".theme-toggle")
    .css(
      "transform",
      "translateX(" + ($btn.width() + overflowButtonGutter) + "px)",
    );
}

function updateNav() {
  var availableSpace = $btn.hasClass("hidden")
    ? $nav.width()
    : $nav.width() - $btn.width() - overflowButtonGutter;

  if ($vlinks.width() > availableSpace) {
    $btn.removeClass("hidden");
    availableSpace = $nav.width() - $btn.width() - overflowButtonGutter;

    while (
      $vlinks.width() > availableSpace &&
      $vlinks.children(":not(.persist)").length > 0
    ) {
      breaks.push($vlinks.width());
      $vlinks.children(":not(.persist)").last().prependTo($hlinks);
      availableSpace = $nav.width() - $btn.width() - overflowButtonGutter;
    }
  } else {
    while (
      breaks.length > 0 &&
      (breaks.length === 1 ? $nav.width() : availableSpace) >
        breaks[breaks.length - 1]
    ) {
      if ($vlinksPersistTail.length > 0) {
        $hlinks.children().first().insertBefore($vlinksPersistTail);
      } else {
        $hlinks.children().first().appendTo($vlinks);
      }
      breaks.pop();
    }

    if (breaks.length < 1) {
      $btn.addClass("hidden");
      $btn.removeClass("close");
      $btn.attr("aria-expanded", "false");
      $hlinks.addClass("hidden");
    }
  }

  $btn.attr("count", breaks.length);
  syncOverflowPosition();
}

$(window).on("resize", updateNav);

if (screen.orientation && screen.orientation.addEventListener) {
  screen.orientation.addEventListener("change", updateNav);
}

$btn.on("click", function () {
  var isOpening = $hlinks.hasClass("hidden");

  $hlinks.toggleClass("hidden");

  if (isOpening) {
    $(this).addClass("close");
  } else {
    $(this).removeClass("close");
  }

  $(this).attr("aria-expanded", isOpening ? "true" : "false");
});

updateNav();

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

function updateNav() {
  var availableSpace = $btn.hasClass("hidden")
    ? $nav.width()
    : $nav.width() - $btn.width() - 30;

  if ($vlinks.width() > availableSpace) {
    $btn.removeClass("hidden");
    availableSpace = $nav.width() - $btn.width() - 30;

    while (
      $vlinks.width() > availableSpace &&
      $vlinks.children(":not(.persist)").length > 0
    ) {
      breaks.push($vlinks.width());
      $vlinks.children(":not(.persist)").last().prependTo($hlinks);
      availableSpace = $nav.width() - $btn.width() - 30;
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
}

$(window).on("resize", updateNav);

if (screen.orientation && screen.orientation.addEventListener) {
  screen.orientation.addEventListener("change", updateNav);
}

$btn.on("click", function () {
  $hlinks.toggleClass("hidden");
  $(this).toggleClass("close");
  $(this).attr("aria-expanded", $(this).hasClass("close") ? "true" : "false");
});

updateNav();

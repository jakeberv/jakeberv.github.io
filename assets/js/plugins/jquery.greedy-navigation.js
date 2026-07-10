/*
 * Greedy Navigation
 *
 * http://codepen.io/lukejacksonn/pen/PwmwWV
 */

var $nav = $("#site-nav");
var $btn = $("#site-nav button");
var $vlinks = $("#site-nav .visible-links");
var $vlinksPersistTail = $vlinks.children(".persist.tail");
var $hlinks = $("#site-nav .hidden-links");
var breaks = [];

function updateNav() {
  var availableSpace = $btn.hasClass("hidden")
    ? $nav.width()
    : $nav.width() - $btn.width() - 30;

  if ($vlinks.width() > availableSpace) {
    while (
      $vlinks.width() > availableSpace &&
      $vlinks.children(":not(.persist)").length > 0
    ) {
      breaks.push($vlinks.width());
      $vlinks.children(":not(.persist)").last().prependTo($hlinks);
      availableSpace = $btn.hasClass("hidden")
        ? $nav.width()
        : $nav.width() - $btn.width() - 30;
      $btn.removeClass("hidden");
    }
  } else {
    while (
      breaks.length > 0 &&
      availableSpace > breaks[breaks.length - 1]
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
});

updateNav();

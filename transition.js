/* ============================================================
   Labora Cafe — page transitions
   Hover a home column -> its footage is already full-bleed behind
   the columns. Click it and the chrome dissolves off that footage,
   the timestamp is handed to the next page, and the destination
   hero picks the same clip up where it left off. One continuous
   shot across a plain multi-page navigation.
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var KEY = "laboraHeroHandoff";
  var EXIT_MS = 460; // must stay under the CSS exit transitions

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Seek, whether or not metadata has arrived yet ---------- */
  function seek(video, t) {
    function apply() {
      try {
        video.currentTime = t;
      } catch (e) {}
    }
    if (video.readyState >= 1) apply();
    else video.addEventListener("loadedmetadata", apply, { once: true });
  }

  /* ---------- ENTER: resume the clip the home column was showing ------ */
  var hero = document.querySelector(".js-hero-video");
  if (hero) {
    var src = hero.getAttribute("data-video");
    var handoff = null;
    try {
      handoff = JSON.parse(sessionStorage.getItem(KEY) || "null");
      sessionStorage.removeItem(KEY); // one-shot: a reload starts from 0
    } catch (e) {}

    if (src) {
      hero.src = src;
      hero.load();
      if (handoff && handoff.section === hero.getAttribute("data-section")) {
        seek(hero, handoff.t || 0);
      }
      var play = hero.play();
      if (play && play.catch) {
        play.catch(function () {
          /* autoplay blocked, or the file isn't there yet */
        });
      }
    }
  }

  /* ---------- EXIT: dissolve, hand off the timestamp, navigate -------- */
  function currentTimeFor(section) {
    var layer = document.querySelector(
      '.hero__layer[data-section="' + section + '"] .hero__video'
    );
    return layer && isFinite(layer.currentTime) ? layer.currentTime : 0;
  }

  function leave(href, section) {
    if (section) {
      try {
        sessionStorage.setItem(
          KEY,
          JSON.stringify({ section: section, t: currentTimeFor(section) })
        );
      } catch (e) {}
    }
    if (reduce) {
      window.location.href = href;
      return;
    }
    root.classList.add("is-leaving");
    window.setTimeout(function () {
      window.location.href = href;
    }, EXIT_MS);
  }

  /* Plain left-clicks only — modified clicks still open a new tab. */
  function isPlainClick(e) {
    return (
      e.button === 0 &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.shiftKey &&
      !e.altKey &&
      !e.defaultPrevented
    );
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a");
    if (!a || !isPlainClick(e)) return;

    var href = a.getAttribute("href");
    // Skip placeholders, anchors, downloads, new tabs and off-site links.
    if (!href || href.charAt(0) === "#" || a.target || a.hasAttribute("download")) return;
    if (a.host && a.host !== window.location.host) return;

    e.preventDefault();
    leave(a.href, a.getAttribute("data-section"));
  });

  /* Restoring from the back/forward cache would otherwise leave the page
     stuck in its faded-out exit state. */
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) root.classList.remove("is-leaving");
  });
})();

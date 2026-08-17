/* ============================================================
   Labora Cafe — loader (once per session)
   White panel, LABORA logo as a mask, fill rises inside the logo
   as the page loads, then the panel slides up.
   ============================================================ */
(function () {
  "use strict";

  var loader = document.getElementById("loader");
  if (!loader) return;

  // Returning visitors this session: head script already hid it. Bail.
  var seen = false;
  try {
    seen = !!sessionStorage.getItem("laboraLoaded");
  } catch (e) {}
  if (seen) return;

  var cover = document.getElementById("loaderCover");
  var video = loader.querySelector(".loader__video");
  var body = document.body;
  body.classList.add("is-loading");

  // Try to play the (placeholder) fill video
  if (video) {
    var src = video.getAttribute("data-video");
    if (src) {
      video.src = src;
      var pp = video.play();
      if (pp && pp.catch) pp.catch(function () {});
    }
  }

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var typed = document.getElementById("loaderTyped");
  var GREETING = "welcome to labora";
  var TYPE_MS = 95; // per character
  var HOLD_MS = 650; // beat on the finished line before leaving

  var progress = 0;
  var target = 0;
  var done = false;
  var START = Date.now();
  // The typed greeting now supplies most of the dwell, so the fill itself
  // doesn't need to linger the way it did.
  var MIN_MS = 600; // keep it on screen at least this long
  var MAX_MS = 4000; // hard cap so it always finishes

  function setCover() {
    if (cover) cover.style.height = 100 - progress + "%";
  }

  function typeOut(text, whenDone) {
    if (!typed) return whenDone();
    var i = 0;
    loader.classList.add("is-typing"); // starts the caret blinking
    (function step() {
      typed.textContent = text.slice(0, i);
      if (i >= text.length) {
        loader.classList.remove("is-typing"); // caret rests on the last letter
        whenDone();
        return;
      }
      i += 1;
      window.setTimeout(step, TYPE_MS);
    })();
  }

  function finish() {
    if (done) return;
    done = true;
    progress = 100;
    setCover();

    function slideUp() {
      try {
        sessionStorage.setItem("laboraLoaded", "1");
      } catch (e) {}
      if (reduce) {
        loader.style.display = "none";
        body.classList.remove("is-loading");
        return;
      }
      loader.classList.add("is-done");
      window.setTimeout(function () {
        loader.style.display = "none";
        body.classList.remove("is-loading");
      }, 900);
    }

    if (reduce) {
      if (typed) typed.textContent = GREETING; // no animation, just the words
      slideUp();
      return;
    }

    // let the fill reach the top, type the greeting, then slide away
    window.setTimeout(function () {
      typeOut(GREETING, function () {
        window.setTimeout(slideUp, HOLD_MS);
      });
    }, 320);
  }

  // Ease progress toward target each frame
  function tick() {
    if (done) return;
    progress += (target - progress) * 0.08;
    if (target - progress < 0.5) progress = target;
    setCover();
    window.requestAnimationFrame(tick);
  }

  // Creep toward 90% while loading so it always feels alive
  var creep = window.setInterval(function () {
    if (target < 90) target = Math.min(90, target + 6);
  }, 160);

  function complete() {
    window.clearInterval(creep);
    target = 100;
    var waited = Date.now() - START;
    window.setTimeout(finish, Math.max(0, MIN_MS - waited));
  }

  if (document.readyState === "complete") {
    complete();
  } else {
    window.addEventListener("load", complete);
  }
  window.setTimeout(complete, MAX_MS); // fallback

  window.requestAnimationFrame(tick);
})();

/* ============================================================
   Labora Cafe — home page interactions
   5 columns over a cross-fading full-screen background.
   Desktop: hover a column to activate it.
   Mobile:  swipe the carousel; dots track the active slide.
   ============================================================ */
(function () {
  "use strict";

  var hero    = document.getElementById("hero");
  var track   = document.querySelector(".hero__track");
  var layers  = Array.prototype.slice.call(document.querySelectorAll(".hero__layer"));
  var panels  = Array.prototype.slice.call(document.querySelectorAll(".panel"));
  var dots    = Array.prototype.slice.call(document.querySelectorAll(".dot"));
  var DEFAULT = "menu";

  var isDesktop = window.matchMedia("(hover: hover) and (min-width: 769px)");

  /* Lazily attach a video source the first time its section activates,
     so we don't download all 5 videos up front. */
  function ensureVideo(layer) {
    var v = layer.querySelector(".hero__video");
    var src = v && v.getAttribute("data-video");
    if (v && src && !v.dataset.loaded) {
      v.src = src;
      v.dataset.loaded = "1";
      v.load();
    }
    return v;
  }

  function sectionIndex(section) {
    for (var i = 0; i < panels.length; i++) {
      if (panels[i].getAttribute("data-section") === section) return i;
    }
    return 0;
  }

  function setActive(section, hovering) {
    hero.classList.toggle("is-hover", !!hovering);

    layers.forEach(function (layer) {
      var on = layer.getAttribute("data-section") === section;
      layer.classList.toggle("is-active", on);
      if (on) {
        var vid = ensureVideo(layer);
        if (vid) {
          var p = vid.play();
          if (p && p.catch) p.catch(function () { /* no file yet / autoplay blocked */ });
        }
      } else {
        var existing = layer.querySelector(".hero__video");
        if (existing) existing.pause();
      }
    });

    panels.forEach(function (panel) {
      panel.classList.toggle("is-active", panel.getAttribute("data-section") === section);
    });

    var idx = sectionIndex(section);
    dots.forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === idx);
    });
  }

  /* ---------- Desktop: hover swaps the active column + background ---------- */
  panels.forEach(function (panel) {
    panel.addEventListener("mouseenter", function () {
      if (isDesktop.matches) setActive(panel.getAttribute("data-section"), true);
    });
  });

  hero.addEventListener("mouseleave", function () {
    if (isDesktop.matches) setActive(DEFAULT, false);  // back to default (Menu)
  });

  /* ---------- Mobile: carousel ---------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (isDesktop.matches) return;  // desktop shows all columns at once
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          setActive(entry.target.getAttribute("data-section"), false);
        }
      });
    }, { root: track, threshold: [0.6] });
    panels.forEach(function (p) { io.observe(p); });
  }

  dots.forEach(function (dot) {
    dot.addEventListener("click", function () {
      var i = parseInt(dot.getAttribute("data-index"), 10);
      if (panels[i]) {
        panels[i].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      }
    });
  });

  /* ---------- Init: default state = Menu ---------- */
  setActive(DEFAULT, false);
})();

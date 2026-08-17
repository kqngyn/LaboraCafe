/* ============================================================
   Labora Cafe — about page
   - Mobile nav toggle (the "MENU" button)
   - Scroll-driven image scale: images sit at 100% and scale
     down to 75% as they scroll up the viewport.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Mobile nav toggle ---------- */
  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav__toggle");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "CLOSE" : "MENU";
    });
  }

  /* ---------- Scroll-driven image scale ---------- */
  var MIN = 0.75; // smallest scale
  var imgs = Array.prototype.slice.call(document.querySelectorAll(".js-scale"));

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (imgs.length && !reduce) {
    var ticking = false;

    function clamp(v, lo, hi) {
      return Math.max(lo, Math.min(hi, v));
    }

    function update() {
      var vh = window.innerHeight;
      imgs.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var center = r.top + r.height / 2;
        // 0 when the element's center is at the bottom edge (just entering),
        // 1 when it reaches the top edge (scrolled up).
        var p = clamp((vh - center) / vh, 0, 1);
        var scale = 1 - (1 - MIN) * p;
        el.style.transform = "scale(" + scale.toFixed(4) + ")";
      });
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update(); // set initial scales
  }

  /* ---------- Inline video ----------
     Loads and plays only once scrolled into view, and pauses on the way
     out, so it isn't fetched by visitors who never reach it. */
  var videos = Array.prototype.slice.call(
    document.querySelectorAll(".js-about-video")
  );
  if (!videos.length) return;

  function start(video) {
    if (!video.dataset.loaded) {
      var src = video.getAttribute("data-video");
      if (!src) return;
      video.src = src;
      video.dataset.loaded = "1";
      video.load();
    }
    var p = video.play();
    if (p && p.catch) {
      p.catch(function () {
        /* autoplay blocked, or the file isn't there yet */
      });
    }
  }

  if (!("IntersectionObserver" in window)) {
    videos.forEach(start); // old browsers: just load it
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) start(entry.target);
        else if (entry.target.dataset.loaded) entry.target.pause();
      });
    },
    { rootMargin: "200px 0px" } // begin fetching just before it scrolls in
  );

  videos.forEach(function (v) {
    io.observe(v);
  });
})();

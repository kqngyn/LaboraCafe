/* ============================================================
   Labora Cafe — locations page
   - Mobile nav toggle (the "MENU" button)
   - Store videos load and play only once scrolled into view, and
     pause on the way out, so the page doesn't pull ~10MB up front.
   The hero video is handled by transition.js.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Mobile nav toggle ---------- */
  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav__toggle");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "CLOSE" : "MENU";
    });
  }

  /* ---------- Store videos ---------- */
  var videos = Array.prototype.slice.call(
    document.querySelectorAll(".js-store-video")
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
    videos.forEach(start); // old browsers: just load both
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

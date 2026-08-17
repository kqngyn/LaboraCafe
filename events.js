/* ============================================================
   Labora Cafe — events page
   - Mobile nav toggle (the "MENU" button)
   - Collaboration enquiry form: inline validation. The browser can
     check the fields but it cannot deliver the message — that needs
     the form's action to point at a backend.
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
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "CLOSE" : "MENU";
    });
  }

  /* ---------- Enquiry form ---------- */
  var form = document.querySelector(".events-form");
  if (!form) return;

  var status = form.querySelector(".form-status");

  function setError(id, message) {
    var node = form.querySelector('[data-error-for="' + id + '"]');
    var input = form.querySelector("#" + id);
    if (node) node.textContent = message || "";
    if (input) {
      input.classList.toggle("has-error", !!message);
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
  }

  /* Deliberately loose: the point is to catch typos, not to police
     which addresses are real. The backend does the real check. */
  function looksLikeEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /* Count digits rather than match a format — partners may write a
     number any number of ways, and some will include a country code. */
  function looksLikePhone(value) {
    return (value.match(/\d/g) || []).length >= 10;
  }

  var CHECKS = [
    {
      id: "business",
      test: function (v) {
        return v ? "" : "Please enter your business name.";
      },
    },
    {
      id: "phone",
      test: function (v) {
        if (!v) return "Please enter a phone number.";
        return looksLikePhone(v) ? "" : "That number looks incomplete.";
      },
    },
    {
      id: "email",
      test: function (v) {
        if (!v) return "Please enter your email.";
        return looksLikeEmail(v) ? "" : "That email doesn't look right.";
      },
    },
    {
      id: "details",
      test: function (v) {
        return v ? "" : "Tell us a little about the event.";
      },
    },
  ];

  /* Clear an error as soon as the field is corrected. */
  CHECKS.forEach(function (check) {
    var input = form.querySelector("#" + check.id);
    if (!input) return;
    input.addEventListener("input", function () {
      if (input.classList.contains("has-error")) setError(check.id, "");
    });
  });

  form.addEventListener("submit", function (e) {
    var first = null;

    CHECKS.forEach(function (check) {
      var input = form.querySelector("#" + check.id);
      if (!input) return;
      var message = check.test(input.value.trim());
      setError(check.id, message);
      if (message && !first) first = input;
    });

    if (first) {
      e.preventDefault();
      if (status) status.textContent = "";
      first.focus();
      return;
    }

    /* The action is still the placeholder from the markup — posting
       would 404 and look like the sender's fault. Say what's wrong. */
    if (form.getAttribute("action").indexOf("YOUR_FORM_ID") !== -1) {
      e.preventDefault();
      if (status) {
        status.textContent =
          "This form isn't connected to a backend yet — see the note in events.html.";
        status.classList.add("is-error");
      }
      return;
    }

    if (status) {
      status.classList.remove("is-error");
      status.textContent = "Sending…";
    }
  });
})();

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

  /* ---------- Delivery ----------
     Sent over fetch rather than as a native POST, so the sender stays on
     the page. A plain POST hands them Formspree's own thank-you screen and
     drops them out of the site entirely. */
  var submitBtn = form.querySelector(".form-submit");
  var sending = false;

  function setStatus(message, kind) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", kind === "error");
    status.classList.toggle("is-ok", kind === "ok");
  }

  function settle(message, kind) {
    sending = false;
    if (submitBtn) submitBtn.disabled = false;
    setStatus(message, kind);
  }

  function send() {
    if (sending) return; // double-click guard
    sending = true;
    if (submitBtn) submitBtn.disabled = true;
    setStatus("Sending\u2026", "");

    fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            if (res.ok) {
              form.reset();
              settle("Thanks \u2014 we've got your enquiry and will be in touch.", "ok");
              return;
            }
            /* Formspree answers with {errors:[{message}]} for an unverified
               address, a plan limit, a blocked domain — surface what it said
               rather than a generic failure. */
            var errors = data && data.errors;
            settle(
              errors && errors.length
                ? errors
                    .map(function (x) {
                      return x.message;
                    })
                    .join(" ")
                : "Something went wrong. Please email help@laboracafe.com instead.",
              "error"
            );
          });
      })
      .catch(function () {
        settle(
          "Couldn't reach the server. Check your connection, or email help@laboracafe.com.",
          "error"
        );
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault(); // always handled in JS now
    var first = null;

    CHECKS.forEach(function (check) {
      var input = form.querySelector("#" + check.id);
      if (!input) return;
      var message = check.test(input.value.trim());
      setError(check.id, message);
      if (message && !first) first = input;
    });

    if (first) {
      if (status) status.textContent = "";
      first.focus();
      return;
    }

    /* The action is still the placeholder from the markup — posting would
       404 and look like the sender's fault. Say what's actually wrong. */
    if (form.getAttribute("action").indexOf("YOUR_FORM_ID") !== -1) {
      setStatus(
        "This form isn't connected yet — see the note in events.html.",
        "error"
      );
      return;
    }

    send();
  });
})();

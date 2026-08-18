/* ============================================================
   Labora Cafe — careers page
   - Mobile nav toggle (the "MENU" button)
   - Application form: inline validation. Resumes come in as a shared
     link rather than an attachment, so there is no file to handle.
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

  /* ---------- Application form ---------- */
  var form = document.querySelector(".careers-form");
  if (!form) return;

  var resume = form.querySelector("#resume");
  var status = form.querySelector(".form-status");

  function errorNode(name) {
    return form.querySelector('[data-error-for="' + name + '"]');
  }

  function setError(name, message) {
    var node = errorNode(name);
    var input = form.querySelector("#" + name);
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

  /* Loose on purpose: people paste Drive, Dropbox and LinkedIn urls with
     and without a scheme, and we only need to catch obvious non-links. */
  function looksLikeUrl(value) {
    return /^(https?:\/\/)?\S+\.\S{2,}$/.test(value);
  }

  function checkResume() {
    var value = resume ? resume.value.trim() : "";
    if (!value) return "Please add a link to your resume.";
    return looksLikeUrl(value) ? "" : "That doesn't look like a link.";
  }

  /* Clear an error as soon as the field is corrected. */
  ["name", "email", "resume"].forEach(function (id) {
    var input = form.querySelector("#" + id);
    if (!input) return;
    input.addEventListener("input", function () {
      if (input.classList.contains("has-error")) setError(id, "");
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
              settle("Thanks \u2014 your application is in. We'll be in touch.", "ok");
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
    var name = form.querySelector("#name");
    var email = form.querySelector("#email");
    var first = null;

    var nameErr = name.value.trim() ? "" : "Please enter your name.";
    var emailErr = !email.value.trim()
      ? "Please enter your email."
      : looksLikeEmail(email.value.trim())
        ? ""
        : "That email doesn't look right.";
    var resumeErr = checkResume();

    setError("name", nameErr);
    setError("email", emailErr);
    setError("resume", resumeErr);

    if (nameErr) first = name;
    else if (emailErr) first = email;
    else if (resumeErr) first = resume;

    if (first) {
      if (status) status.textContent = "";
      if (first.focus) first.focus({ preventScroll: false });
      return;
    }

    /* The action is still the placeholder from the markup — posting would
       404 and look like the applicant's fault. Say what's actually wrong. */
    if (form.getAttribute("action").indexOf("YOUR_FORM_ID") !== -1) {
      setStatus(
        "This form isn't connected yet — see the note in careers.html.",
        "error"
      );
      return;
    }

    /* A bare "drive.google.com/..." isn't clickable in the notification
       email — give it a scheme before it goes. */
    if (resume && !/^https?:\/\//i.test(resume.value.trim())) {
      resume.value = "https://" + resume.value.trim();
    }

    send();
  });
})();

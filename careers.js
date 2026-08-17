/* ============================================================
   Labora Cafe — careers page
   - Mobile nav toggle (the "MENU" button)
   - Application form: inline validation and the resume picker.
     The browser can check the fields but it cannot receive the
     upload — that needs the form's action to point at a backend.
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

  /* ---------- Application form ---------- */
  var form = document.querySelector(".careers-form");
  if (!form) return;

  var resume = form.querySelector("#resume");
  var fileName = form.querySelector("[data-file-name]");
  var status = form.querySelector(".form-status");
  var MAX_BYTES = 5 * 1024 * 1024; // keep in step with the hint in the markup

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

  function checkResume() {
    var file = resume && resume.files && resume.files[0];
    if (!file) return "Please attach your resume.";
    var isPdf =
      file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) return "Resume must be a PDF.";
    if (file.size > MAX_BYTES) return "That file is over 5MB.";
    return "";
  }

  /* Show the chosen filename — the native input is hidden for styling,
     so without this there's no feedback that anything was picked. */
  if (resume && fileName) {
    resume.addEventListener("change", function () {
      var file = resume.files && resume.files[0];
      fileName.textContent = file ? file.name : "No file chosen";
      setError("resume", checkResume());
    });
  }

  /* Clear an error as soon as the field is corrected. */
  ["name", "email"].forEach(function (id) {
    var input = form.querySelector("#" + id);
    if (!input) return;
    input.addEventListener("input", function () {
      if (input.classList.contains("has-error")) setError(id, "");
    });
  });

  form.addEventListener("submit", function (e) {
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
      e.preventDefault();
      if (status) status.textContent = "";
      if (first.focus) first.focus({ preventScroll: false });
      return;
    }

    /* The action is still the placeholder from the markup — posting
       would 404 and look like the applicant's fault. Say what's wrong. */
    if (form.getAttribute("action").indexOf("YOUR_FORM_ID") !== -1) {
      e.preventDefault();
      if (status) {
        status.textContent =
          "This form isn't connected to a backend yet — see the note in careers.html.";
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

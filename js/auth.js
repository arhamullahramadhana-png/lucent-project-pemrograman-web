/* =========================================================================
   LUCENT — auth.js
   Client-side accounts + session for the UTS demo.

   NOTE: This stores everything in localStorage on the visitor's own machine.
   It is a learning demo only — it is NOT secure and must never be used to
   protect real accounts or data.
   ========================================================================= */
(function () {
  "use strict";

  var USERS_KEY = "lucent.users";
  var SESSION_KEY = "lucent.session";

  /* Site root (…/uts/) derived from this script's own URL so internal
     redirects resolve correctly from any folder depth (e.g. articles/). */
  var ROOT = (document.currentScript && document.currentScript.src)
    ? document.currentScript.src.replace(/js\/[^/]*$/, "")
    : "";

  /* ---- Storage helpers -------------------------------------------------- */
  function readUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
    catch (e) { return []; }
  }
  function writeUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch (e) { return null; }
  }
  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      name: user.name,
      email: user.email,
      since: user.since || Date.now()
    }));
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function findUser(email) {
    email = String(email || "").trim().toLowerCase();
    return readUsers().filter(function (u) { return u.email === email; })[0] || null;
  }

  /* ---- Form field errors ------------------------------------------------ */
  function setError(input, message) {
    var field = input.closest(".field");
    var slot = field ? field.querySelector(".field__error") : null;
    if (message) {
      input.setAttribute("aria-invalid", "true");
      if (slot) slot.textContent = message;
    } else {
      input.removeAttribute("aria-invalid");
      if (slot) slot.textContent = "";
    }
  }
  function clearErrors(form) {
    form.querySelectorAll("[aria-invalid]").forEach(function (el) {
      el.removeAttribute("aria-invalid");
    });
    form.querySelectorAll(".field__error").forEach(function (el) {
      el.textContent = "";
    });
  }
  function alertBox(form) {
    return form.parentElement.querySelector(".form-alert") ||
      document.getElementById("formAlert");
  }
  function showAlert(form, message, kind) {
    var box = alertBox(form);
    if (!box) return;
    box.textContent = message;
    box.className = "form-alert is-visible" + (kind ? " form-alert--" + kind : "");
  }
  function hideAlert(form) {
    var box = alertBox(form);
    if (box) box.className = "form-alert";
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---- Register --------------------------------------------------------- */
  function initRegister() {
    var form = document.getElementById("registerForm");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearErrors(form);
      hideAlert(form);

      var name = form.elements.fullname;
      var email = form.elements.email;
      var pass = form.elements.password;
      var confirm = form.elements.confirm;

      var ok = true;
      if (!name.value.trim() || name.value.trim().length < 3) {
        setError(name, "Masukkan nama lengkap, minimal 3 karakter.");
        ok = false;
      }
      if (!EMAIL_RE.test(email.value.trim())) {
        setError(email, "Masukkan alamat email yang valid.");
        ok = false;
      }
      if (pass.value.length < 6) {
        setError(pass, "Kata sandi minimal 6 karakter.");
        ok = false;
      }
      if (confirm.value !== pass.value || !confirm.value) {
        setError(confirm, "Konfirmasi kata sandi belum cocok.");
        ok = false;
      }
      if (!ok) return;

      if (findUser(email.value)) {
        showAlert(form, "Email ini sudah terdaftar. Coba masuk saja.", "error");
        setError(email, "Email sudah digunakan.");
        return;
      }

      var users = readUsers();
      users.push({
        name: name.value.trim(),
        email: email.value.trim().toLowerCase(),
        password: pass.value,
        since: Date.now()
      });
      writeUsers(users);

      window.location.href = ROOT + "login.html?registered=1";
    });

    form.querySelectorAll("input").forEach(function (input) {
      input.addEventListener("input", function () { setError(input, ""); });
    });
  }

  /* ---- Login ------------------------------------------------------------ */
  function initLogin() {
    var form = document.getElementById("loginForm");
    if (!form) return;

    var params = new URLSearchParams(location.search);
    if (params.get("registered")) {
      showAlert(form, "Pendaftaran berhasil. Sekarang masuk dengan akunmu.", "ok");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearErrors(form);
      if (!params.get("registered")) hideAlert(form);

      var email = form.elements.email;
      var pass = form.elements.password;
      var ok = true;

      if (!EMAIL_RE.test(email.value.trim())) {
        setError(email, "Masukkan alamat email yang valid.");
        ok = false;
      }
      if (!pass.value) {
        setError(pass, "Masukkan kata sandi.");
        ok = false;
      }
      if (!ok) return;

      var user = findUser(email.value);
      if (!user || user.password !== pass.value) {
        showAlert(form, "Email atau kata sandi salah. Periksa lagi, ya.", "error");
        return;
      }

      setSession(user);
      var next = params.get("next");
      window.location.href = next ? next : ROOT + "dashboard.html";
    });

    form.querySelectorAll("input").forEach(function (input) {
      input.addEventListener("input", function () { setError(input, ""); });
    });
  }

  /* ---- Auth-aware navigation ------------------------------------------- */
  function renderNav() {
    var session = getSession();
    document.documentElement.classList.toggle("has-session", !!session);
    if (session) {
      document.querySelectorAll("[data-user-name]").forEach(function (el) {
        el.textContent = session.name.split(" ")[0];
      });
      document.querySelectorAll("[data-user-initial]").forEach(function (el) {
        el.textContent = (session.name.charAt(0) || "L").toUpperCase();
      });
    }
  }

  function initLogout() {
    document.querySelectorAll("[data-logout]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        clearSession();
        window.location.href = ROOT + "index.html";
      });
    });
  }

  /* ---- Page guards ------------------------------------------------------ */
  function guards() {
    var page = document.body.dataset.page;
    var session = getSession();

    if (page === "dashboard" && !session) {
      window.location.replace(ROOT + "login.html?next=dashboard.html");
      return;
    }
    if ((page === "login" || page === "register") && session) {
      window.location.replace(ROOT + "dashboard.html");
    }
  }

  /* ---- Dashboard content ------------------------------------------------ */
  function initDashboard() {
    var session = getSession();
    if (!session) return;

    document.querySelectorAll("[data-greeting-name]").forEach(function (el) {
      el.textContent = session.name.split(" ")[0];
    });
    var memberSince = document.querySelector("[data-member-since]");
    if (memberSince && session.since) {
      memberSince.textContent = new Date(session.since).toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric"
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    guards();
    renderNav();
    initRegister();
    initLogin();
    initLogout();
    initDashboard();
  });
})();

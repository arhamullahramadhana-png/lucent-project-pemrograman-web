/* =========================================================================
   LUCENT — script.js
   Shared behaviour: nav, header state, scroll reveal, gallery filter,
   lightbox, image fallback, footer year.
   ========================================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Image fallback ---------------------------------------------------
     If a remote photo fails, swap in a deterministic placeholder so no
     broken image ever appears. */
  function guardImages() {
    var imgs = document.querySelectorAll("img");
    imgs.forEach(function (img, i) {
      img.addEventListener("error", function () {
        if (img.dataset.fallbackDone) return;
        img.dataset.fallbackDone = "1";
        var seed = (img.dataset.seed || "lucent-" + i).replace(/[^a-z0-9-]/gi, "");
        img.src = "https://picsum.photos/seed/" + seed + "/900/1100";
      });
    });
  }

  /* ---- Header scroll state --------------------------------------------- */
  function headerState() {
    var header = document.getElementById("siteHeader");
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Mobile navigation ------------------------------------------------ */
  function mobileNav() {
    var toggle = document.getElementById("navToggle");
    var nav = document.getElementById("primaryNav");
    if (!toggle || !nav) return;

    var close = function () {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Buka menu");
      document.body.classList.remove("no-scroll");
    };

    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
      document.body.classList.toggle("no-scroll", open);
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) close();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 780) close();
    });
  }

  /* ---- Active nav link -------------------------------------------------- */
  function activeNav() {
    var here = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav__link[href]").forEach(function (link) {
      var target = link.getAttribute("href").split("?")[0];
      if (target === here) link.classList.add("is-active");
    });
  }

  /* ---- Scroll reveal ---------------------------------------------------- */
  function reveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---- Gallery filter --------------------------------------------------- */
  function gallery() {
    var bar = document.querySelector("[data-filter-bar]");
    var grid = document.getElementById("galleryGrid");
    if (!bar || !grid) return;

    var cards = Array.prototype.slice.call(grid.querySelectorAll("[data-category]"));
    var empty = document.getElementById("galleryEmpty");

    function apply(filter) {
      var shown = 0;
      cards.forEach(function (card) {
        var match = filter === "all" || card.dataset.category === filter;
        card.classList.toggle("is-hidden", !match);
        card.hidden = !match;
        if (match) shown++;
      });
      if (empty) empty.hidden = shown !== 0;
      bar.querySelectorAll(".filter-btn").forEach(function (btn) {
        var active = btn.dataset.filter === filter;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    bar.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter-btn");
      if (!btn) return;
      apply(btn.dataset.filter);
    });

    var param = new URLSearchParams(location.search).get("category");
    var valid = ["all", "galaxies", "planets", "earth", "missions"];
    apply(valid.indexOf(param) !== -1 ? param : "all");
  }

  /* ---- Lightbox --------------------------------------------------------- */
  function lightbox() {
    var box = document.getElementById("lightbox");
    var grid = document.getElementById("galleryGrid");
    if (!box || !grid) return;

    var imgEl = box.querySelector("[data-lb-img]");
    var titleEl = box.querySelector("[data-lb-title]");
    var metaEl = box.querySelector("[data-lb-meta]");
    var descEl = box.querySelector("[data-lb-desc]");
    var sourceWrap = box.querySelector("[data-lb-source]");
    var sourceTextEl = box.querySelector("[data-lb-source-text]");
    var sourceLinkEl = box.querySelector("[data-lb-source-link]");
    var counterEl = box.querySelector("[data-lb-counter]");
    var lastFocus = null;
    var current = 0;

    function visibleCards() {
      return Array.prototype.slice.call(grid.querySelectorAll("[data-category]"))
        .filter(function (c) { return !c.hidden; });
    }

    function show(index) {
      var list = visibleCards();
      if (!list.length) return;
      current = (index + list.length) % list.length;
      var card = list[current];
      imgEl.src = card.dataset.full || card.querySelector("img").src;
      imgEl.alt = card.dataset.title || "";
      titleEl.textContent = card.dataset.title || "";
      metaEl.textContent = card.dataset.meta || "";
      descEl.textContent = card.dataset.desc || "";

      var en = card.dataset.descEn || "";
      var src = card.dataset.source || "";
      sourceTextEl.textContent = en;
      if (sourceLinkEl) {
        if (src) {
          sourceLinkEl.href = src;
          sourceLinkEl.hidden = false;
        } else {
          sourceLinkEl.hidden = true;
        }
      }
      if (sourceWrap) sourceWrap.hidden = !en && !src;

      counterEl.textContent = (current + 1) + " / " + list.length;
    }

    function open(card) {
      var list = visibleCards();
      lastFocus = document.activeElement;
      box.classList.add("is-open");
      box.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll");
      show(list.indexOf(card));
      box.querySelector(".lightbox__close").focus();
    }

    function close() {
      box.classList.remove("is-open");
      box.setAttribute("aria-hidden", "true");
      document.body.classList.remove("no-scroll");
      imgEl.src = "";
      if (lastFocus) lastFocus.focus();
    }

    grid.addEventListener("click", function (e) {
      var card = e.target.closest("[data-category]");
      if (card) open(card);
    });

    grid.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var card = e.target.closest("[data-category]");
      if (card) {
        e.preventDefault();
        open(card);
      }
    });

    box.querySelector("[data-lb-close]").addEventListener("click", close);
    box.querySelector("[data-lb-prev]").addEventListener("click", function () { show(current - 1); });
    box.querySelector("[data-lb-next]").addEventListener("click", function () { show(current + 1); });

    box.addEventListener("click", function (e) {
      if (e.target === box) close();
    });

    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });
  }

  /* ---- Footer year ------------------------------------------------------ */
  function year() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    guardImages();
    headerState();
    mobileNav();
    activeNav();
    reveal();
    gallery();
    lightbox();
    year();
  });
})();

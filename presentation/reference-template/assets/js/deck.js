/* ===========================================================
   NCC SAP deck engine — dependency-free
   nav: ← / → / Space / Home / End · F fullscreen · ESC
   fragments: elements with class "fr" reveal step-by-step
   =========================================================== */
(function () {
  "use strict";

  var stage = document.getElementById("stage");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var progress = document.getElementById("progress");
  var counter = document.getElementById("counter");

  var total = slides.length;
  var cur = 0;       // current slide index
  var fri = 0;       // fragments revealed on current slide

  function frags(i) {
    return Array.prototype.slice.call(slides[i].querySelectorAll(".fr"));
  }

  function render(showAllFrags) {
    slides.forEach(function (s, i) { s.classList.toggle("active", i === cur); });
    var f = frags(cur);
    if (showAllFrags) fri = f.length;
    f.forEach(function (el, i) { el.classList.toggle("show", i < fri); });
    progress.style.width = ((cur + 1) / total * 100) + "%";
    counter.textContent = (cur + 1) + " / " + total;
    location.hash = "#" + (cur + 1);
  }

  function next() {
    var f = frags(cur);
    if (fri < f.length) { fri++; render(false); return; }
    if (cur < total - 1) { cur++; fri = 0; render(false); }
  }

  function prev() {
    if (fri > 0) { fri--; render(false); return; }
    if (cur > 0) { cur--; render(true); }      // entering backward: show all frags
  }

  function goto(i, showAll) {
    cur = Math.max(0, Math.min(total - 1, i));
    fri = 0;
    render(!!showAll);
  }

  // ---------- scaling ----------
  function fit() {
    var pad = 0;
    var sw = (window.innerWidth - pad) / 1280;
    var sh = (window.innerHeight - pad) / 720;
    var scale = Math.min(sw, sh);
    document.documentElement.style.setProperty("--scale", scale);
  }

  // ---------- input ----------
  document.addEventListener("keydown", function (e) {
    switch (e.key) {
      case "ArrowRight": case " ": case "PageDown": e.preventDefault(); next(); break;
      case "ArrowLeft": case "PageUp": e.preventDefault(); prev(); break;
      case "Home": e.preventDefault(); goto(0, false); break;
      case "End": e.preventDefault(); goto(total - 1, true); break;
      case "f": case "F":
        if (!document.fullscreenElement) { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); }
        else { document.exitFullscreen && document.exitFullscreen(); }
        break;
    }
  });

  // click zones: right half = next, left half = prev
  stage.addEventListener("click", function (e) {
    var r = stage.getBoundingClientRect();
    if ((e.clientX - r.left) / r.width > 0.5) next(); else prev();
  });

  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", fit);

  // ---------- init ----------
  fit();
  // fill per-slide footer page numbers dynamically
  slides.forEach(function (s, i) {
    var pg = s.querySelector(".footer .pg");
    if (pg) pg.textContent = (i + 1) + " / " + total;
  });
  var start = parseInt((location.hash || "").replace("#", ""), 10);
  if (start >= 1 && start <= total) cur = start - 1;
  render(false);
})();

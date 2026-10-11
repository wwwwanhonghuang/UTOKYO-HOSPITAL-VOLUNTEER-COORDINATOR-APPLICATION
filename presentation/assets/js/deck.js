/* Adapted from the NCC-SAP dependency-free deck engine.
 * All presentation state stays in this browser. No network requests.
 */
(function () {
  "use strict";

  function init() {
    var viewport = document.getElementById("viewport");
    var stage = document.getElementById("stage");
    var slides = Array.prototype.slice.call(document.querySelectorAll("#stage .slide"));
    if (!stage || !viewport || !slides.length) return;

    var total = slides.length;
    var current = 0;
    var revealed = 0;
    var notesOpen = false;
    var overviewButtons = [];
    var fragments = slides.map(function (slide) {
      return Array.prototype.slice.call(slide.querySelectorAll(".fr"));
    });
    var previousButton = document.getElementById("prev");
    var nextButton = document.getElementById("next");
    var counter = document.getElementById("counter");
    var progress = document.getElementById("progress");
    var overviewToggle = document.getElementById("overview-toggle");
    var overviewDialog = document.getElementById("overview-dialog");
    var overviewList = document.getElementById("overview-list");
    var notesToggle = document.getElementById("notes-toggle");
    var notesPanel = document.getElementById("notes-panel");
    var notesTitle = document.getElementById("notes-title");
    var notesContent = document.getElementById("notes-content");
    var fullscreenToggle = document.getElementById("fullscreen-toggle");
    var helpToggle = document.getElementById("help-toggle");
    var helpDialog = document.getElementById("help-dialog");
    var notesSlide = -1;

    function title(index) {
      return slides[index].getAttribute("data-title") || "Slide " + (index + 1);
    }

    function fit() {
      var scale = Math.min(viewport.clientWidth / 1280, viewport.clientHeight / 720);
      document.documentElement.style.setProperty("--scale", Math.max(0.01, scale));
    }

    function updateNotes() {
      if (!notesContent || !notesTitle || notesSlide === current) return;
      notesTitle.textContent = (current + 1) + " / " + total + "　" + title(current);
      var source = slides[current].querySelector(".speaker-notes");
      // Notes are trusted, local presentation content rather than user input.
      notesContent.innerHTML = source ? source.innerHTML : "<p>このページの原稿はありません。</p>";
      notesContent.scrollTop = 0;
      if (notesPanel) notesPanel.scrollTop = 0;
      notesSlide = current;
    }

    function updateHash() {
      var target = "#" + (current + 1);
      if (window.location.hash === target) return;
      try {
        window.history.replaceState(null, "", target);
      } catch (error) {
        // Some local-file browser contexts do not support history replacement.
        window.location.hash = target;
      }
    }

    function render() {
      slides.forEach(function (slide, index) {
        var active = index === current;
        slide.classList.toggle("active", active);
        slide.setAttribute("aria-hidden", active ? "false" : "true");
        slide.toggleAttribute("inert", !active);
        fragments[index].forEach(function (fragment, fragmentIndex) {
          var visible = active && fragmentIndex < revealed;
          fragment.classList.toggle("show", visible);
          fragment.setAttribute("aria-hidden", visible ? "false" : "true");
        });
      });
      if (counter) counter.textContent = (current + 1) + " / " + total;
      if (progress) {
        progress.style.width = ((current + 1) / total * 100) + "%";
        progress.setAttribute("aria-valuenow", String(current + 1));
        progress.setAttribute("aria-valuemin", "1");
        progress.setAttribute("aria-valuemax", String(total));
        progress.setAttribute("aria-valuetext", (current + 1) + " / " + total);
      }
      if (previousButton) previousButton.disabled = current === 0 && revealed === 0;
      if (nextButton) nextButton.disabled = current === total - 1 && revealed === fragments[current].length;
      overviewButtons.forEach(function (button, index) {
        if (index === current) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
      updateNotes();
      updateHash();
    }

    function goTo(page, showAll) {
      var requested = Number(page);
      if (!Number.isFinite(requested)) return;
      current = Math.max(0, Math.min(total - 1, Math.trunc(requested) - 1));
      revealed = showAll === false ? 0 : fragments[current].length;
      render();
    }

    function next() {
      if (revealed < fragments[current].length) revealed += 1;
      else if (current < total - 1) { current += 1; revealed = 0; }
      render();
    }

    function previous() {
      if (revealed > 0) revealed -= 1;
      else if (current > 0) { current -= 1; revealed = fragments[current].length; }
      render();
    }

    function setNotes(open, restoreFocus) {
      if (!notesPanel) return;
      notesOpen = Boolean(open);
      notesPanel.hidden = !notesOpen;
      document.body.classList.toggle("has-notes", notesOpen);
      if (notesToggle) notesToggle.setAttribute("aria-expanded", String(notesOpen));
      updateNotes();
      window.requestAnimationFrame(fit);
      if (!notesOpen && restoreFocus && notesToggle) notesToggle.focus();
    }

    function closeDialog(dialog) {
      if (dialog && dialog.open) dialog.close();
    }

    function toggleDialog(dialog, toggle) {
      if (!dialog) return;
      if (dialog.open) { closeDialog(dialog); return; }
      [overviewDialog, helpDialog].forEach(function (other) {
        if (other !== dialog) closeDialog(other);
      });
      dialog.showModal();
      if (toggle) toggle.setAttribute("aria-expanded", "true");
      if (dialog === overviewDialog && overviewButtons[current]) overviewButtons[current].focus();
    }

    function modalOpen() {
      return Boolean((overviewDialog && overviewDialog.open) || (helpDialog && helpDialog.open));
    }

    function fullscreen() {
      var result;
      if (document.fullscreenElement && document.exitFullscreen) result = document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) result = document.documentElement.requestFullscreen();
      if (result && typeof result.catch === "function") result.catch(function () {});
    }

    function onClick(id, handler) {
      var element = document.getElementById(id);
      if (element) element.addEventListener("click", handler);
    }

    if (overviewList) {
      slides.forEach(function (slide, index) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "overview-item";
        var number = document.createElement("span");
        number.className = "overview-number";
        number.textContent = String(index + 1).padStart(2, "0");
        var name = document.createElement("span");
        name.className = "overview-title";
        name.textContent = title(index);
        button.appendChild(number);
        button.appendChild(name);
        button.addEventListener("click", function () {
          goTo(index + 1, true);
          closeDialog(overviewDialog);
        });
        overviewList.appendChild(button);
        overviewButtons.push(button);
      });
    }

    [[overviewDialog, overviewToggle], [helpDialog, helpToggle]].forEach(function (pair) {
      var dialog = pair[0];
      var toggle = pair[1];
      if (!dialog) return;
      dialog.addEventListener("click", function (event) {
        if (event.target.closest("[data-close]")) closeDialog(dialog);
      });
      dialog.addEventListener("close", function () {
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      });
    });

    onClick("prev", previous);
    onClick("next", next);
    onClick("overview-toggle", function () { toggleDialog(overviewDialog, overviewToggle); });
    onClick("notes-toggle", function () { setNotes(!notesOpen, false); });
    onClick("notes-close", function () { setNotes(false, true); });
    onClick("fullscreen-toggle", fullscreen);
    onClick("print-button", function () { window.print(); });
    onClick("help-toggle", function () { toggleDialog(helpDialog, helpToggle); });

    document.addEventListener("keydown", function (event) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Escape") {
        if (modalOpen()) {
          event.preventDefault();
          closeDialog(overviewDialog);
          closeDialog(helpDialog);
        } else if (notesOpen) {
          event.preventDefault();
          setNotes(false, true);
        }
        return;
      }
      if (modalOpen()) return;
      var target = event.target;
      if (target && target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) return;
      if (event.shiftKey && event.key !== "?") return;
      if (target && target.closest("button, a, summary, [role='button']") &&
          [" ", "Enter"].indexOf(event.key) !== -1) return;
      // The notes pane is independently scrollable while reading a script.
      if (notesPanel && notesPanel.contains(target) &&
          [" ", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].indexOf(event.key) !== -1) return;
      switch (event.key) {
        case "ArrowRight": case " ": case "PageDown": event.preventDefault(); next(); break;
        case "ArrowLeft": case "PageUp": event.preventDefault(); previous(); break;
        case "Home": event.preventDefault(); goTo(1, false); break;
        case "End": event.preventDefault(); goTo(total, true); break;
        case "o": case "O": event.preventDefault(); toggleDialog(overviewDialog, overviewToggle); break;
        case "n": case "N": event.preventDefault(); setNotes(!notesOpen, false); break;
        case "f": case "F": event.preventDefault(); fullscreen(); break;
        case "p": case "P": event.preventDefault(); window.print(); break;
        case "?": event.preventDefault(); toggleDialog(helpDialog, helpToggle); break;
      }
    });

    var lastSwipe = 0;
    var touchStart = null;
    stage.addEventListener("click", function (event) {
      if (modalOpen() || event.button !== 0 || event.detail > 1 || Date.now() - lastSwipe < 500) return;
      if (event.target.closest("a, button, input, textarea, select, [contenteditable], [data-no-nav]")) return;
      if (String(window.getSelection()).trim()) return;
      var rect = stage.getBoundingClientRect();
      if (event.clientX - rect.left > rect.width / 2) next();
      else previous();
    });
    stage.addEventListener("touchstart", function (event) {
      if (event.touches.length !== 1 || event.target.closest("a, button, input, textarea, select, [data-no-nav]")) {
        touchStart = null;
        return;
      }
      touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }, { passive: true });
    stage.addEventListener("touchend", function (event) {
      if (!touchStart || event.changedTouches.length !== 1 || modalOpen()) return;
      var dx = event.changedTouches[0].clientX - touchStart.x;
      var dy = event.changedTouches[0].clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      lastSwipe = Date.now();
      if (dx < 0) next();
      else previous();
    }, { passive: true });
    stage.addEventListener("touchcancel", function () { touchStart = null; }, { passive: true });

    function pageFromHash() {
      var match = window.location.hash.match(/^#(?:slide-)?(\d+)$/);
      return match ? Number(match[1]) : 1;
    }

    window.addEventListener("hashchange", function () {
      var page = Math.max(1, Math.min(total, pageFromHash()));
      if (page !== current + 1) goTo(page, true);
    });
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    document.addEventListener("fullscreenchange", function () {
      if (fullscreenToggle) fullscreenToggle.setAttribute("aria-pressed", String(Boolean(document.fullscreenElement)));
      fit();
    });
    if (window.ResizeObserver) new ResizeObserver(fit).observe(viewport);

    slides.forEach(function (slide, index) {
      var pageNumber = slide.querySelector(".footer .pg");
      if (pageNumber) pageNumber.textContent = (index + 1) + " / " + total;
    });
    if (notesToggle) notesToggle.setAttribute("aria-expanded", "false");
    if (overviewToggle) overviewToggle.setAttribute("aria-expanded", "false");
    if (helpToggle) helpToggle.setAttribute("aria-expanded", "false");
    if (fullscreenToggle && !document.documentElement.requestFullscreen) fullscreenToggle.disabled = true;

    goTo(pageFromHash(), false);
    document.documentElement.classList.add("js");
    fit();
    window.Deck = {
      goTo: goTo,
      next: next,
      prev: previous,
      getState: function () {
        return { slide: current + 1, fragment: revealed, fragments: fragments[current].length, total: total, notesOpen: notesOpen };
      }
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

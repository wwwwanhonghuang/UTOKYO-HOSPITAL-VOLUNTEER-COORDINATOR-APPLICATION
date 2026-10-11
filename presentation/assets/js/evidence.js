(function () {
  'use strict';
  const dialog = document.getElementById('evidence-dialog');
  if (!dialog) return;
  const figure = document.getElementById('evidence-image');
  const caption = document.getElementById('evidence-caption');
  const pdf = document.getElementById('evidence-pdf');
  document.querySelectorAll('.evidence-open').forEach(button => {
    button.addEventListener('click', () => {
      figure.src = button.dataset.image;
      figure.alt = button.querySelector('img').alt;
      caption.textContent = button.dataset.caption;
      pdf.href = button.dataset.pdf;
      dialog.showModal();
    });
  });
  document.getElementById('evidence-close').addEventListener('click', () => dialog.close());
  document.addEventListener('keydown', event => {
    if (!dialog.open) return;
    event.stopImmediatePropagation();
    if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
  }, true);
})();

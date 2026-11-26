/* ui.js - V.08.01 - utilita' di interfaccia */
(function (root) {
  'use strict';
  const H = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function toast(testo, tipo) {
    const box = document.getElementById('toasts'); if (!box) return;
    const t = document.createElement('div'); t.className = 'toast ' + (tipo || 'info'); t.textContent = testo; box.appendChild(t);
    setTimeout(() => t.remove(), tipo === 'err' ? 7000 : 3500);
  }
  function errore(e) { toast((e && e.message) || String(e), 'err'); }
  root.UI = { H, toast, errore };
})(window);

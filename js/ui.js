/* ui.js - V.09.00 - utilita' di interfaccia */
(function (root) {
  'use strict';
  const H = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function toast(testo, tipo) {
    const box = document.getElementById('toasts'); if (!box) return;
    const t = document.createElement('div'); t.className = 'toast ' + (tipo || 'info'); t.textContent = testo; box.appendChild(t);
    setTimeout(() => t.remove(), tipo === 'err' ? 7000 : 3500);
  }
  function errore(e) { toast((e && e.message) || String(e), 'err'); }
  const nf = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });
  const pf = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 4 });
  const eur = v => (v == null || v === '') ? '–' : nf.format(Number(v)) + ' €';
  const pct = v => (v == null || v === '') ? '–' : pf.format(Math.round(Number(v) * 1000000) / 10000) + '%';
  const dataOra = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); };
  const data = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : (s || ''); };
  /* finestra di dialogo: ritorna l'elemento del contenuto */
  function chiudiModal() { const o = document.getElementById('overlay'); if (o) o.remove(); document.removeEventListener('keydown', escChiudi); }
  function escChiudi(e) { if (e.key === 'Escape') chiudiModal(); }
  function modal(html) {
    chiudiModal();
    const o = document.createElement('div'); o.id = 'overlay'; o.className = 'overlay';
    o.innerHTML = '<div class="dlg" role="dialog" aria-modal="true">' + html + '</div>';
    o.addEventListener('mousedown', e => { if (e.target === o) chiudiModal(); });
    document.body.appendChild(o); document.addEventListener('keydown', escChiudi);
    return o.firstChild;
  }
  root.UI = { H, toast, errore, eur, pct, dataOra, data, modal, chiudiModal };
})(window);

/* ui.js - V.10.00 - utilita' di interfaccia */
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
  /* dialogo di sblocco/blocco di una procedura (condiviso da Procedure e Generatore).
     p = riga con id, cig, scheda; dopo() a operazione riuscita; annulla() se si annulla */
  function dialogBlocco(p, sblocca, dopo, annulla) {
    const d = modal('<h2>' + (sblocca ? 'Sblocca' : 'Blocca') + ' la procedura ' + H(p.cig) + ' · ' + H(p.scheda) + '</h2>' +
      '<p>' + (sblocca ? 'La procedura è già stata liquidata. Sbloccandola si potrà modificare il gruppo di lavoro. L\'azione resta nel registro delle modifiche con la nota.' : 'La procedura tornerà bloccata: saranno modificabili solo i campi di liquidazione e il cronoprogramma. L\'azione resta nel registro.') + '</p>' +
      '<label>Nota' + (sblocca ? ' (obbligatoria, almeno 5 caratteri)' : ' (facoltativa)') + '</label><textarea id="bNota" placeholder="Motivo"></textarea><div id="bMsg"></div>' +
      '<div class="az"><button class="btn p" data-a="ok">' + (sblocca ? 'Sblocca' : 'Blocca') + '</button><button class="btn" data-a="annulla">Annulla</button></div>');
    d.querySelector('#bNota').focus();
    d.onclick = async ev => {
      const a = ev.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'annulla') { chiudiModal(); if (annulla) annulla(); return; }
      const nota = d.querySelector('#bNota').value.trim(), msg = d.querySelector('#bMsg');
      if (sblocca && nota.length < 5) { msg.innerHTML = '<div class="msg err">Scrivi una nota di almeno 5 caratteri.</div>'; return; }
      a.disabled = true;
      try {
        if (sblocca) await root.Dati.sbloccaProcedura(p.id, nota); else await root.Dati.bloccaProcedura(p.id, nota);
        toast(sblocca ? 'Procedura sbloccata.' : 'Procedura bloccata.', 'ok'); chiudiModal();
        if (dopo) await dopo();
      } catch (e) { msg.innerHTML = '<div class="msg err">' + H(e.message) + '</div>'; a.disabled = false; }
    };
  }
  root.UI = { H, toast, errore, eur, pct, dataOra, data, modal, chiudiModal, dialogBlocco };
})(window);

/* liquidazione.js - V.09.00
   Stato di liquidazione di una procedura: logica IDENTICA all'Estrattore V.07.06
   (cinque categorie, stessi colori). Condivisa da Procedure ed Estrattore. */
(function (root) {
  'use strict';
  const LIQ = {
    int: { t: 'Interamente liquidato', c: '#DCEFD8' }, tot: { t: 'In liquidazione totale', c: '#D3E6F5' }, par: { t: 'In liquidazione parziale', c: '#F6EBC6' },
    fut: { t: 'In liquidazione futura', c: '#E5DCF2' }, altro: { t: 'Altro', c: '#E3E5E8' } };
  const EPS = 1e-9;
  const n = v => v == null || v === '' ? null : Number(v);
  /* p: riga di procedura (perc_liquidabile, perc_liquidata) */
  function chiave(p) {
    const lb = n(p && p.perc_liquidabile);
    if (lb == null) return null;
    const lq = n(p.perc_liquidata) == null ? 0 : n(p.perc_liquidata);
    if (lq >= 1 - EPS) return 'int';
    if (lb >= 1 - EPS) return 'tot';
    if (lb > EPS && lb - lq > EPS) return 'par';
    if (lb <= EPS && 1 - lq > EPS) return 'fut';
    return 'altro';
  }
  const creAnomalia = p => !!p && !p.cre_approvato && n(p.perc_liquidabile) > EPS;
  const liquidataSuperiore = p => !!p && n(p.perc_liquidata) > n(p.perc_liquidabile) + EPS;
  /* avvisi testuali (stessi concetti dell'Estrattore) */
  function avvisi(p) {
    const a = [];
    if (creAnomalia(p)) a.push('CRE non approvato ma % liquidabile maggiore di 0.');
    if (liquidataSuperiore(p)) a.push('La % liquidata supera la % liquidabile.');
    return a;
  }
  /* una procedura e' bloccata dopo la prima liquidazione, finche' un admin non la sblocca */
  const bloccata = p => !!p && n(p.perc_liquidata) > EPS && !p.sbloccata;
  const pill = k => k ? '<span class="lp" style="background:' + LIQ[k].c + '">' + LIQ[k].t + '</span>' : '';
  /* ordinamento schede: BASE, BASE-2, MC1, MC1-2, MC2... (identico all'Estrattore) */
  const schedaOrd = x => { const m = /^(BASE|MC(\d+))(?:-(\d+))?$/.exec(String(x)); if (!m) return 1e6; return (m[2] ? parseInt(m[2], 10) : 0) * 1000 + (m[3] ? parseInt(m[3], 10) : 0); };
  root.Liq = { LIQ, EPS, chiave, creAnomalia, liquidataSuperiore, avvisi, bloccata, pill, schedaOrd };
})(window);

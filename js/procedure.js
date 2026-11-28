/* procedure.js - V.10.00 - anagrafica delle procedure (solo admin) */
(function (root) {
  'use strict';
  const H = UI.H;
  const LS_TIT = 'incentivi_titolo', LS_VISTA = 'incentivi_vista_procedure';
  const ls = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignora */ } };
  /* filtri: restano attivi finche' non si ricarica la pagina del browser */
  const F = { q: '', macro: new Set(), tipo: '', liq: '', cre: '', scheda: '', bloc: '', titolo: ls(LS_TIT) === 'compl' ? 'compl' : 'sint', vista: ls(LS_VISTA) === 'macro' ? 'macro' : 'tabella' };
  let ORD = { k: 'cig', dir: 1 };
  let LISTA = [], MACRO = [], box = null;
  const TIPI = ['LAVORI', 'SERVIZI', 'SERVIZI SPECIALI'];
  const SCHEDA_RE = /^(BASE|MC\d+)(-\d+)?$/;

  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const mname = p => { const m = p.macrocartelle; const o = Array.isArray(m) ? m[0] : m; return o && o.nome ? o.nome : ''; };
  const ordLiq = ['int', 'tot', 'par', 'fut', 'altro'];

  /* ---------- colonne ---------- */
  const COL = [
    { k: 'cig', t: 'CIG · scheda', v: p => p.cig + '|' + String(Liq.schedaOrd(p.scheda)).padStart(7, '0') },
    { k: 'gruppo', t: 'Nome gruppo', v: p => p.nome_gruppo || '' },
    { k: 'macro', t: 'Macrocartella', v: p => mname(p) },
    { k: 'tipo', t: 'Tipo', v: p => p.tipo_appalto },
    { k: 'titolo', t: 'Titolo', v: p => Titolo.completo(p.titolo) },
    { k: 'base', t: 'Base di calcolo', n: 1, v: p => p.base == null ? null : Number(p.base) },
    { k: 'cre', t: 'CRE', v: p => p.cre_approvato ? 1 : 0 },
    { k: 'lb', t: '% liquidabile', n: 1, v: p => Number(p.perc_liquidabile) },
    { k: 'lq', t: '% liquidata', n: 1, v: p => Number(p.perc_liquidata) },
    { k: 'stato', t: 'Stato liquidazione', v: p => ordLiq.indexOf(Liq.chiave(p)) },
    { k: 'blocco', t: 'Blocco', v: p => Liq.bloccata(p) ? 2 : (p.sbloccata ? 1 : 0) },
    { k: 'mod', t: 'Ultima modifica', v: p => p.updated_at || '' }
  ];
  function cmp(a, b) {
    if (a == null && b == null) return 0; if (a == null) return 1; if (b == null) return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), 'it', { numeric: true });
  }
  function ordina(arr) {
    const c = COL.find(x => x.k === ORD.k) || COL[0];
    return arr.slice().sort((x, y) => { const r = cmp(c.v(x), c.v(y)); return r ? r * ORD.dir : cmp(COL[0].v(x), COL[0].v(y)); });
  }

  /* ---------- filtri ---------- */
  function passa(p) {
    if (F.q && norm([p.cig, p.titolo, p.nome_gruppo, p.cup].join(' ')).indexOf(norm(F.q.trim())) < 0) return false;
    if (F.macro.size && !F.macro.has(p.macrocartella_id || '_none')) return false;
    if (F.tipo && p.tipo_appalto !== F.tipo) return false;
    if (F.liq && Liq.chiave(p) !== F.liq) return false;
    if (F.cre === 'si' && !p.cre_approvato) return false;
    if (F.cre === 'no' && p.cre_approvato) return false;
    if (F.scheda === 'base' && !/^BASE/.test(p.scheda)) return false;     // BASE e BASE-2
    if (F.scheda === 'mc' && !/^MC/.test(p.scheda)) return false;         // MC1, MC1-2...
    if (F.bloc === 'si' && !Liq.bloccata(p)) return false;
    if (F.bloc === 'no' && Liq.bloccata(p)) return false;
    return true;
  }
  const attivi = () => F.q || F.macro.size || F.tipo || F.liq || F.cre || F.scheda || F.bloc;

  /* ---------- HTML ---------- */
  function opt(v, t, sel) { return '<option value="' + H(v) + '"' + (sel === v ? ' selected' : '') + '>' + H(t) + '</option>'; }
  function chipsHtml() {
    const cnt = {}; LISTA.forEach(p => { const k = p.macrocartella_id || '_none'; cnt[k] = (cnt[k] || 0) + 1; });
    const ch = MACRO.map(m => [m.id, m.nome]); if (cnt._none) ch.push(['_none', 'Senza macrocartella']);
    return '<span class="hint">Macrocartelle:</span>' + ch.map(c => '<button type="button" class="chip' + (F.macro.has(c[0]) ? ' on' : '') + '" data-m="' + H(c[0]) + '">' + H(c[1]) + ' (' + (cnt[c[0]] || 0) + ')</button>').join('') +
      (F.macro.size ? ' <button type="button" class="btn sm" id="pTutte">Tutte</button>' : '');
  }
  function toolbarHtml() {
    return '<div class="panel" id="pTool"><div class="tool">' +
      '<label class="fl q">Cerca (CIG, titolo, gruppo, CUP)<input id="pQ" type="text" value="' + H(F.q) + '" placeholder="Cerca…" autocomplete="off"></label>' +
      '<label class="fl">Tipo<select data-f="tipo">' + opt('', 'Tutti', F.tipo) + TIPI.map(t => opt(t, t, F.tipo)).join('') + '</select></label>' +
      '<label class="fl">Stato liquidazione<select data-f="liq">' + opt('', 'Tutti', F.liq) + ordLiq.map(k => opt(k, Liq.LIQ[k].t, F.liq)).join('') + '</select></label>' +
      '<label class="fl">CRE approvato<select data-f="cre">' + opt('', 'Tutti', F.cre) + opt('si', 'SI', F.cre) + opt('no', 'NO', F.cre) + '</select></label>' +
      '<label class="fl">Schede<select data-f="scheda">' + opt('', 'Tutte', F.scheda) + opt('base', 'Solo BASE', F.scheda) + opt('mc', 'Solo MC', F.scheda) + '</select></label>' +
      '<label class="fl">Blocco<select data-f="bloc">' + opt('', 'Tutte', F.bloc) + opt('si', 'Solo bloccate', F.bloc) + opt('no', 'Non bloccate', F.bloc) + '</select></label>' +
      '<label class="fl">Titolo<select data-f="titolo">' + opt('sint', 'Sintetico', F.titolo) + opt('compl', 'Completo', F.titolo) + '</select></label>' +
      '<label class="fl">Vista<select data-f="vista">' + opt('tabella', 'Tabella', F.vista) + opt('macro', 'Per macrocartella', F.vista) + '</select></label>' +
      '<button type="button" class="btn" id="pReset">Azzera filtri</button>' +
      '<button type="button" class="btn" id="pRicarica" title="Rilegge i dati dal server">Aggiorna</button>' +
      '<button type="button" class="btn p" id="pNuova">+ Nuova procedura</button></div>' +
      '<div class="chips" id="pChips">' + chipsHtml() + '</div></div>';
  }
  function riga(p) {
    const k = Liq.chiave(p), av = Liq.avvisi(p), blk = Liq.bloccata(p);
    return '<tr data-id="' + H(p.id) + '"><td class="cs"' + (k ? ' style="background:' + Liq.LIQ[k].c + '"' : '') + '>' + H(p.cig) + '<br>' + H(p.scheda) + '</td>' +
      '<td>' + H(p.nome_gruppo || '') + '</td><td>' + H(mname(p)) + '</td><td>' + H(p.tipo_appalto) + '</td>' +
      '<td class="tit">' + H(Titolo.mostra(p.titolo, F.titolo)) + '</td>' +
      '<td class="n">' + UI.eur(p.base) + '</td><td>' + (p.cre_approvato ? 'SI' : 'NO') + '</td><td class="n">' + UI.pct(p.perc_liquidabile) + '</td><td class="n">' + UI.pct(p.perc_liquidata) + '</td>' +
      '<td>' + Liq.pill(k) + (av.length ? ' <span class="warn" title="' + H(av.join(' ')) + '">⚠</span>' : '') + '</td>' +
      '<td class="c">' + (blk ? '<span title="Bloccata: già liquidata">🔒</span>' : (p.sbloccata ? '<span title="Sbloccata da un admin">🔓</span>' : '')) + '</td>' +
      '<td class="mod">' + H(UI.dataOra(p.updated_at)) + '<br><span class="hint">' + H(p.updated_by_nome || '') + '</span></td></tr>';
  }
  function tabella(rows) {
    const th = COL.map(c => '<th class="sort' + (c.n ? ' n' : '') + '" data-k="' + c.k + '">' + H(c.t) + (ORD.k === c.k ? (ORD.dir > 0 ? ' ▲' : ' ▼') : '') + '</th>').join('');
    return '<div class="twrap"><table class="pt"><thead><tr>' + th + '</tr></thead><tbody>' + rows.map(riga).join('') + '</tbody></table></div>';
  }
  const somma = arr => arr.reduce((a, p) => a + (Number(p.base) || 0), 0);
  function aggiorna() {
    const ris = box.querySelector('#pRis'); if (!ris) return;
    const fl = ordina(LISTA.filter(passa));
    let h = '<div class="conta"><b>' + fl.length + '</b> di ' + LISTA.length + ' procedure · base di calcolo delle procedure mostrate: <b>' + UI.eur(somma(fl)) + '</b>' + (attivi() ? ' · filtri attivi' : '') + '</div>';
    if (!fl.length) h += '<div class="panel">Nessuna procedura corrisponde ai filtri.</div>';
    else if (F.vista === 'macro') {
      const gr = MACRO.map(m => [m.id, m.nome]); gr.push(['_none', 'Senza macrocartella']);
      gr.forEach(g => {
        const sub = fl.filter(p => (p.macrocartella_id || '_none') === g[0]); if (!sub.length) return;
        h += '<h3 class="gh">' + H(g[1]) + ' <small>· ' + sub.length + ' procedure · base ' + UI.eur(somma(sub)) + '</small></h3>' + tabella(sub);
      });
    } else h += tabella(fl);
    ris.innerHTML = h;
  }

  /* ---------- dettaglio ---------- */
  const kv = (t, v) => '<dt>' + H(t) + '</dt><dd>' + (v === '' || v == null ? '–' : v) + '</dd>';
  function dettaglioHtml(p) {
    const k = Liq.chiave(p), av = Liq.avvisi(p), blk = Liq.bloccata(p);
    const stBlocco = blk ? '🔒 <b>Bloccata</b>: già liquidata. Sono modificabili solo i campi di liquidazione; per cambiare il gruppo serve lo sblocco.' :
      (p.sbloccata ? '🔓 <b>Sbloccata</b> da un admin: il gruppo è modificabile. Si può bloccare di nuovo.' : '✏️ Modificabile (nessuna liquidazione effettuata).');
    return '<h2>' + H(p.cig) + ' · ' + H(p.scheda) + '</h2><div>' + Liq.pill(k) + '</div>' +
      '<dl class="kv">' + kv('Nome gruppo', H(p.nome_gruppo || '')) + kv('Macrocartella', H(mname(p))) + kv('Tipo di appalto', H(p.tipo_appalto)) +
      kv('Titolo sintetico', H(Titolo.sintetico(p.titolo))) + kv('Titolo completo', H(Titolo.completo(p.titolo))) + kv('CUP', H(p.cup || '')) + kv('Base di calcolo', UI.eur(p.base)) + '</dl><hr class="sep">' +
      '<b>Liquidazione</b><dl class="kv">' + kv('CRE approvato', p.cre_approvato ? 'SI' : 'NO') + kv('% liquidabile', UI.pct(p.perc_liquidabile)) + kv('% liquidata', UI.pct(p.perc_liquidata)) +
      kv('% da liquidare', UI.pct(1 - Number(p.perc_liquidata))) + kv('% in liquidazione', UI.pct(Number(p.perc_liquidabile) - Number(p.perc_liquidata))) +
      kv('Data aggiornamento', H(UI.data(p.data_liquidazione))) + kv('Note', H(p.note_liquidazione || '')) + '</dl>' +
      av.map(a => '<div class="msg warn">⚠ ' + H(a) + '</div>').join('') +
      '<hr class="sep"><div>' + stBlocco + '</div><dl class="kv">' + kv('Versione', String(p.versione)) + kv('Ultima modifica', H(UI.dataOra(p.updated_at)) + ' · ' + H(p.updated_by_nome || '')) + '</dl>' +
      '<div class="az"><a class="btn p" href="#/generatore/' + H(p.id) + '" id="dGen">Apri nel Generatore</a>' +
      (blk ? '<button class="btn" data-a="sblocca">Sblocca…</button>' : '') + (p.sbloccata ? '<button class="btn" data-a="blocca">Blocca…</button>' : '') +
      '<button class="btn" data-a="chiudi" style="margin-left:auto">Chiudi</button></div>';
  }
  function apriDettaglio(id) {
    const p = LISTA.find(x => x.id === id); if (!p) return;
    const d = UI.modal(dettaglioHtml(p));
    d.onclick = ev => {
      if (ev.target.closest('#dGen')) { UI.chiudiModal(); return; }
      const a = ev.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'chiudi') UI.chiudiModal();
      if (a.dataset.a === 'sblocca') formBlocco(p, true);
      if (a.dataset.a === 'blocca') formBlocco(p, false);
    };
  }
  function formBlocco(p, sblocca) {
    UI.dialogBlocco(p, sblocca, async () => { await ricarica(); apriDettaglio(p.id); }, () => apriDettaglio(p.id));
  }

  /* ---------- nuova procedura ---------- */
  function dialogNuova() {
    const d = UI.modal('<h2>Nuova procedura</h2><p class="hint">Crea la procedura con il gruppo di lavoro vuoto: si compila poi nel Generatore.</p>' +
      '<label>CIG</label><input id="nCig" type="text" maxlength="10" autocapitalize="characters" placeholder="10 caratteri">' +
      '<label>Scheda (BASE, MC1, MC2… con eventuale suffisso -2, per esempio BASE-2)</label><input id="nScheda" type="text" value="BASE" list="nSchede"><datalist id="nSchede"><option value="BASE"><option value="BASE-2"><option value="MC1"><option value="MC2"></datalist>' +
      '<label>Tipo di appalto</label><select id="nTipo">' + TIPI.map(t => '<option>' + H(t) + '</option>').join('') + '</select>' +
      '<label>Macrocartella</label><select id="nMacro"><option value="">— nessuna —</option>' + MACRO.map(m => '<option value="' + H(m.id) + '">' + H(m.nome) + '</option>').join('') + '</select>' +
      '<label>Nome gruppo (testo libero, per esempio «AQ ponti 2026»)</label><input id="nGruppo" type="text">' +
      '<label>Titolo / denominazione dell\'intervento</label><textarea id="nTitolo"></textarea><div id="nMsg"></div>' +
      '<div class="az"><button class="btn p" data-a="crea">Crea procedura</button><button class="btn" data-a="chiudi">Annulla</button></div>');
    d.querySelector('#nCig').focus();
    d.querySelector('#nCig').oninput = e => { e.target.value = e.target.value.toUpperCase(); };
    d.querySelector('#nScheda').oninput = e => { e.target.value = e.target.value.toUpperCase(); };
    d.onclick = async ev => {
      const a = ev.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'chiudi') { UI.chiudiModal(); return; }
      const g = id => d.querySelector(id).value.trim(), msg = d.querySelector('#nMsg');
      const cig = g('#nCig').toUpperCase(), scheda = (g('#nScheda') || 'BASE').toUpperCase();
      if (!cig) { msg.innerHTML = '<div class="msg err">Il CIG è obbligatorio.</div>'; return; }
      if (!SCHEDA_RE.test(scheda)) { msg.innerHTML = '<div class="msg err">Scheda non valida: scrivi BASE oppure MC1, MC2… (con eventuale suffisso -2).</div>'; return; }
      a.disabled = true;
      try {
        const nuova = await Dati.salvaProcedura({ cig, scheda, tipo_appalto: g('#nTipo'), macrocartella_id: g('#nMacro') || null, nome_gruppo: g('#nGruppo'), titolo: g('#nTitolo') });
        UI.toast('Procedura creata: ' + cig + ' · ' + scheda, 'ok');
        await ricarica(); apriDettaglio(nuova.id);
      } catch (e) { msg.innerHTML = '<div class="msg err">' + H(e.message) + '</div>'; a.disabled = false; }
    };
  }

  /* ---------- pagina ---------- */
  async function carica() { const r = await Promise.all([Dati.elencoProcedure(), Dati.macrocartelle()]); LISTA = r[0]; MACRO = r[1]; }
  async function ricarica() { await carica(); if (box && box.querySelector('#pRis')) { box.querySelector('#pChips').innerHTML = chipsHtml(); aggiorna(); } }
  function resetFiltri() { F.q = ''; F.macro = new Set(); F.tipo = F.liq = F.cre = F.scheda = F.bloc = ''; box.querySelector('#pTool').outerHTML = toolbarHtml(); aggiorna(); }
  function aggancia() {
    box.oninput = e => { if (e.target.id === 'pQ') { F.q = e.target.value; aggiorna(); } };
    box.onchange = e => {
      const f = e.target.dataset && e.target.dataset.f; if (!f) return;
      F[f] = e.target.value;
      if (f === 'titolo') lsSet(LS_TIT, F.titolo); if (f === 'vista') lsSet(LS_VISTA, F.vista);
      aggiorna();
    };
    box.onclick = async e => {
      const t = e.target;
      const chip = t.closest('.chip');
      if (chip) { const m = chip.dataset.m; if (F.macro.has(m)) F.macro.delete(m); else F.macro.add(m); box.querySelector('#pChips').innerHTML = chipsHtml(); aggiorna(); return; }
      if (t.id === 'pTutte') { F.macro = new Set(); box.querySelector('#pChips').innerHTML = chipsHtml(); aggiorna(); return; }
      if (t.id === 'pReset') { resetFiltri(); return; }
      if (t.id === 'pNuova') { dialogNuova(); return; }
      if (t.id === 'pRicarica') { try { await ricarica(); UI.toast('Dati aggiornati.', 'ok'); } catch (x) { UI.errore(x); } return; }
      const th = t.closest('th.sort');
      if (th) { const k = th.dataset.k; if (ORD.k === k) ORD.dir = -ORD.dir; else ORD = { k, dir: 1 }; aggiorna(); return; }
      const tr = t.closest('tbody tr[data-id]'); if (tr) apriDettaglio(tr.dataset.id);
    };
  }
  async function render(b) {
    box = b; box.innerHTML = '<div class="panel"><h2>Procedure</h2><p>Caricamento…</p></div>';
    try { await carica(); }
    catch (e) {
      box.innerHTML = '<div class="panel"><h2>Procedure</h2><div class="msg err">' + H(e.message) + '</div><p><button class="btn" id="pRetry">Riprova</button></p></div>';
      box.onclick = ev => { if (ev.target.id === 'pRetry') render(box); }; return;
    }
    box.innerHTML = toolbarHtml() + '<div id="pRis"></div>';
    aggancia(); aggiorna();
  }
  root.PaginaProcedure = { render };
})(window);

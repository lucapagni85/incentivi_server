/* generatore.js - V.10.01 - Generatore su database (consegna 4B: Excel, stampa, registro modifiche).
   Schermate, calcoli e controlli ripresi dal Generatore V.07.04 (js/core.js identico); cambia solo
   da dove arrivano e dove vanno i dati: Supabase tramite js/dati.js, niente piu' file Excel di lavoro. */
(function (root) {
  'use strict';
  const H = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const STATI = ['Interno', 'Esterno', 'Non previsto', 'Riduzione art. 18'];
  const eur = n => (Number(n) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const pct = x => { const v = (x * 100); return (Math.round(v * 10000) / 10000).toString().replace('.', ',') + '%'; };
  const pctIn = x => String(Math.round(x * 1000000) / 10000);     // numero in % per i campi di input
  const TIPI = ['LAVORI', 'SERVIZI', 'SERVIZI SPECIALI'];
  const TIPO_LABEL = { 'LAVORI': 'Lavori', 'SERVIZI': 'Servizi e forniture', 'SERVIZI SPECIALI': 'Servizi e forniture speciali' };
  const TIPOLOGIE = { 'LAVORI': ['LAVORI_aff dir / negoziate', 'LAVORI_AQ', 'LAVORI_SOMME URGENZE'], 'SERVIZI': ['SERVIZI', 'FORNITURE'], 'SERVIZI SPECIALI': ['SERVIZI', 'FORNITURE'] };
  const HTML_GEN = "\n  <div id=\"gbar\" class=\"panel gbar\"><div><div class=\"gt\" id=\"gTit\"></div><div id=\"gStato\"></div></div><div class=\"gx\"><button class=\"b\" id=\"gIndietro\">\u2190 Procedure</button><button class=\"b\" id=\"gRicarica\" title=\"Rilegge la procedura dal server\">Ricarica dal server</button><button class=\"b p\" id=\"gSalva\" disabled>Salva</button></div></div>\n  <div id=\"gLock\" class=\"msg warn\" hidden></div>\n  <div id=\"avvisi\" class=\"panel\" hidden></div>\n  <nav class=\"tabs\">\n    <button data-tab=\"1\" class=\"on\">1 \u00b7 Anagrafica</button>\n    <button data-tab=\"2\">2 \u00b7 Gruppo di lavoro</button>\n    <button data-tab=\"3\">3 \u00b7 Cronoprogramma e liquidazione</button>\n    <button data-tab=\"4\">4 \u00b7 Verifica e genera</button>\n  </nav>\n\n  <section id=\"p1\">\n    <div class=\"panel\">\n      <label for=\"f_tipo\">Tipo di appalto</label>\n      <select id=\"f_tipo\"><option value=\"LAVORI\">Lavori</option><option value=\"SERVIZI\">Servizi e forniture</option><option value=\"SERVIZI SPECIALI\">Servizi e forniture speciali</option></select>\n      <label for=\"f_titolo\">Titolo / denominazione dell'intervento</label>\n      <textarea id=\"f_titolo\" data-t=\"titolo\"></textarea>\n      <div class=\"grid\">\n        <div><label for=\"f_cig\">CIG</label><input id=\"f_cig\" data-t=\"cig\" maxlength=\"10\" autocapitalize=\"characters\"></div>\n        <div><label for=\"f_cup\">CUP</label><input id=\"f_cup\" data-t=\"cup\" maxlength=\"15\" autocapitalize=\"characters\"></div>\n        <div><label for=\"f_base\">Base di calcolo (\u20ac, IVA esclusa)</label><input id=\"f_base\" data-t=\"base\" type=\"number\" min=\"0\" step=\"0.01\" inputmode=\"decimal\"></div>\n        <div><label for=\"f_tipologia\">Tipologia di intervento</label>\n          <select id=\"f_tipologia\" data-t=\"tipologia\"></select></div>\n        <div><label for=\"f_risorse\">Tipo di risorse</label>\n          <select id=\"f_risorse\" data-t=\"risorse\"><option>NON VINCOLATE</option><option>VINCOLATE</option><option>MISTE</option></select></div>\n        <div><label for=\"f_innov\">% fondo innovazione applicabile (art. 7)</label><input id=\"f_innov\" data-t=\"innov\" type=\"number\" min=\"0\" max=\"100\" step=\"0.01\"></div>\n        <div><label for=\"f_versione\">Versione</label><input id=\"f_versione\" data-t=\"versione\"></div>\n        <div><label for=\"f_scheda\">Scheda (BASE oppure MC1, MC2\u2026; -2 per una seconda procedura con lo stesso CIG)</label><input id=\"f_scheda\" data-t=\"scheda\" list=\"schede\" autocapitalize=\"characters\"></div>\n        <div><label for=\"f_data\">Data</label><input id=\"f_data\" data-t=\"data\" type=\"date\"></div>\n        <div><label for=\"f_macro\">Macrocartella</label><select id=\"f_macro\" data-m=\"macrocartella_id\"></select></div>\n        <div><label for=\"f_gruppo\">Nome gruppo (testo libero)</label><input id=\"f_gruppo\" data-m=\"nome_gruppo\" placeholder=\"es. AQ ponti 2026\"></div>\n      </div>\n      <div id=\"avvisoBase\" class=\"warnc\" style=\"margin-top:10px\"></div>\n      <div class=\"live\" id=\"live\"></div>\n    </div>\n  </section>\n\n  <section id=\"p2\" hidden>\n    <div class=\"panel\"><b>Gruppo di lavoro.</b> Per ogni sub-attivit\u00e0 indica chi la svolge, lo stato e la quota di ciascuno (la somma delle quote deve fare 100%). La % effettiva pu\u00f2 variare al massimo del \u00b120% rispetto alla tabella (art. 12 c. 7), lasciando invariato il totale.\n      <div id=\"sumPct\" style=\"margin-top:8px\"></div>\n      <div id=\"nonRis\" style=\"margin-top:8px\"></div>\n      <div style=\"margin-top:8px\"><button class=\"b\" id=\"gNuovoSogg\">+ Nuovo soggetto in anagrafica\u2026</button> <span class=\"rng\">Le persone si scelgono dall'anagrafica: un nuovo assunto si aggiunge da qui. Gli esterni usano il soggetto generico \u00abEsterno\u00bb.</span></div>\n      <div class=\"rng\" style=\"margin-top:6px;font-size:13px\">L'importo a destra della quota \u00e8 il <b>lordo</b> della persona su quella riga (colonna J dell'Excel); le righe non \u00abInterno\u00bb sono in grigio.</div></div>\n    <div id=\"groups\"></div>\n    <div class=\"panel\" id=\"totLordo\"></div>\n  </section>\n\n  <section id=\"p3\" hidden>\n    <div class=\"panel\"><b>Cronoprogramma.</b> Per ogni fase puoi scrivere testo libero (date, estremi dell'atto, note). Resta salvato nel database e compare in stampa solo se compilato. Resta modificabile anche dopo la liquidazione.</div>\n    <div class=\"panel\" id=\"cronoBox\"></div>\n    <div class=\"panel\" id=\"liqBox\"><h3 style=\"margin-top:0\">Liquidazione</h3>\n      <div class=\"grid\">\n        <div><label for=\"l_cre\">CRE approvato</label><select id=\"l_cre\" data-m=\"cre\"><option>NO</option><option>SI</option></select></div>\n        <div><label for=\"l_lb\">% liquidabile (cumulativa)</label><input id=\"l_lb\" data-m=\"lb\" type=\"number\" min=\"0\" max=\"100\" step=\"0.0001\"></div>\n        <div><label for=\"l_lq\">% liquidata (cumulativa)</label><input id=\"l_lq\" data-m=\"lq\" type=\"number\" min=\"0\" max=\"100\" step=\"0.0001\"></div>\n        <div><label for=\"l_data\">Data aggiornamento</label><input id=\"l_data\" data-m=\"data_liq\" type=\"date\"></div>\n      </div>\n      <label for=\"l_note\">Note</label><textarea id=\"l_note\" data-m=\"note_liq\"></textarea>\n      <div id=\"liqOut\" style=\"margin-top:10px\"></div>\n    </div>\n  </section>\n\n  <section id=\"p4\" hidden>\n    <div class=\"panel\"><h3 style=\"margin-top:0\">Verifiche</h3><ul class=\"chk\" id=\"checks\"></ul></div>\n    <div class=\"panel\"><h3 style=\"margin-top:0\">Anteprima importi</h3><table class=\"r\" id=\"riep\"></table></div>\n    <div class=\"panel\"><label for=\"f_file\">Nome del file Excel</label><input id=\"f_file\">\n      <p style=\"margin-top:14px\"><button class=\"b p\" id=\"gGenera\">Genera e scarica Excel</button> <button class=\"b\" id=\"gStampa\">Stampa / Salva in PDF</button></p>\n      <p class=\"rng\" style=\"font-size:13px\">Prima di scaricare o stampare le modifiche vengono salvate. Nel file Excel e nel PDF non compaiono avvisi: le verifiche restano solo a video.</p>\n      <div id=\"avvisoErr\"></div><div id=\"genMsg\" style=\"margin-top:6px\"></div></div>\n    <div class=\"panel\" id=\"regBox\" hidden><h3 style=\"margin-top:0\">Registro delle modifiche</h3><div id=\"regOut\"><p class=\"hint\">Caricamento…</p></div></div>\n  </section>\n\n<datalist id=\"rubrica\"></datalist>\n<datalist id=\"schede\"><option value=\"BASE\"><option value=\"BASE-2\"><option value=\"MC1\"><option value=\"MC2\"><option value=\"MC3\"><option value=\"MC4\"></datalist>\n";
  let GEN = null, TPL = null, S = null, REGOLE = null, TIPO = 'LAVORI', tab = 1;
  let TPLS = null; const REGOLES = {}; const REGOLE_ORIGINE = 'regole incorporate';
  let FILE_MAN = false, CUR = null, DIRTY = false, LOCK = false, SALVANDO = false, TOKEN = 0, MACRO = [];
  let SOGG = [], SOGG_ID = {}, SOGG_NOME = {}, GENERICO = null;
  const EV = []; const on = (t, f) => EV.push([t, f]);
  const $ = s => GEN.querySelector(s), $$ = s => Array.from(GEN.querySelectorAll(s));
  const normN = s => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const nomeCompleto = s => (String(s.cognome || '') + ' ' + String(s.nome || '')).trim();
  const ha = r => (r.stato === 'Interno' && String(r.nom || '').trim() !== '') || r.stato === 'Esterno';
  const nomeR = r => r.stato === 'Esterno' ? 'Esterno' : String(r.nom || '');
  const SCHEDA_RE = /^(BASE|MC\d+)(-\d+)?$/;
  function renderAnag() {
    $('#f_tipo').value = TIPO;
    $$('[data-t]').forEach(e => {
      const k = e.dataset.t; let v = S.testata[k];
      if (k === 'innov') v = (v === '' || v == null) ? 100 : Math.round(v * 10000) / 100;
      e.value = v == null ? '' : v;
    });
  }
  function ruoloHtml(sub, val) {
    const opz = REGOLE && REGOLE.ruoli_sub && REGOLE.ruoli_sub[sub];
    if (!opz) return '<input data-f="ruolo" placeholder="Ruolo / specifica" value="' + H(val) + '">';
    const extra = val && opz.indexOf(val) < 0 ? '<option selected>' + H(val) + '</option>' : '';
    return '<select data-f="ruolo"><option value="">— scegli il ruolo —</option>' + opz.map(o => '<option' + (o === val ? ' selected' : '') + '>' + H(o) + '</option>').join('') + extra + '</select>';
  }
  function cardNormal(i) {
    const s = S.subs[i], t = TPL.subs[i];
    const rows = s.righe.map((r, j) =>
      '<div class="riga" data-ri="' + j + '">' +
      '' + nomInput(r) + '' +
      ruoloHtml(t.sub, r.ruolo) +
      '<select data-f="stato">' + STATI.map(x => '<option' + (x === r.stato ? ' selected' : '') + '>' + x + '</option>').join('') + '</select>' +
      '<input data-f="quota" type="number" min="0" max="100" step="0.0001" title="Quota nella sub-attività (%)" value="' + pctIn(r.quota) + '">' +
      '<input class="lordo" data-lordo readonly tabindex="-1" title="Lordo = quota × % effettiva × quota personale" aria-label="Lordo in euro">' +
      '<button class="b" data-act="del" title="Elimina riga"' + (s.righe.length < 2 ? ' disabled' : '') + '>✕</button>' +
      '<input class="note" data-f="note" placeholder="Note (motivazioni, variazioni…)" value="' + H(r.note) + '"></div>').join('');
    return '<div class="card" data-si="' + i + '"><div class="chead"><div class="t">' + H(t.sub) + ' <span class="pill">tabella ' + pct(t.pctTab) + '</span></div>' + flagHtml(i) +
      '<div class="e"><span>% effettiva</span><input data-f="pctEff" type="number" step="0.001" value="' + pctIn(s.pctEff) + '"><span class="rng">(' + pct(t.pctTab * 0.8) + ' – ' + pct(t.pctTab * 1.2) + ')</span></div></div>' +
      rows + '<div class="cfoot"><button class="b" data-act="add">+ Aggiungi persona</button><button class="b" data-act="eq">Quote uguali</button><span class="sumq"></span><span class="sumL"></span></div></div>';
  }
  function headHtml(i) {
    const s = S.subs[i], t = TPL.subs[i];
    return '<div class="chead"><div class="t">' + H(t.sub) + ' <span class="pill">tabella ' + pct(t.pctTab) + '</span></div>' + flagHtml(i) +
      '<div class="e"><span>% effettiva</span><input data-f="pctEff" type="number" step="0.001" value="' + pctIn(s.pctEff) + '"><span class="rng">(' + pct(t.pctTab * 0.8) + ' – ' + pct(t.pctTab * 1.2) + ')</span></div></div>';
  }
  function cardSg(i) {
    const s = S.subs[i];
    const gr = s.gruppi.map((g, j) =>
      '<div class="grp" data-gi="' + j + '"><div class="ghead"><input data-g="nome" placeholder="Nome sottogruppo (es. Supporto attività dirette)" value="' + H(g.nome) + '">' +
      '<label class="gp">% sottogruppo <input data-g="pct" type="number" min="0" step="0.001" value="' + pctIn(g.pct) + '"></label>' +
      '<button class="b" data-act="delg"' + (s.gruppi.length < 2 ? ' disabled' : '') + ' title="Elimina il sottogruppo">Elimina sottogruppo</button></div>' +
      g.righe.map((r, k) =>
        '<div class="riga sg" data-ri="' + k + '">' + nomInput(r) + '' +
        '<select data-f="stato">' + STATI.map(x => '<option' + (x === r.stato ? ' selected' : '') + '>' + x + '</option>').join('') + '</select>' +
        '<input data-f="quota" type="number" min="0" max="100" step="0.0001" title="Quota nel sottogruppo (%)" value="' + pctIn(r.quota) + '">' +
        '<input class="lordo" data-lordo readonly tabindex="-1" title="Lordo = quota × % sottogruppo × quota personale" aria-label="Lordo in euro">' +
        '<button class="b" data-act="delp" title="Elimina riga"' + (g.righe.length < 2 ? ' disabled' : '') + '>✕</button>' +
        '<input class="note" data-f="note" placeholder="Note" value="' + H(r.note) + '"></div>').join('') +
      '<div class="cfoot"><button class="b" data-act="addp">+ Aggiungi persona</button><button class="b" data-act="eqg">Quote uguali</button><span class="sumg"></span></div></div>').join('');
    return '<div class="card" data-si="' + i + '">' + headHtml(i) + gr +
      '<div class="cfoot"><button class="b p2" data-act="addg">+ Aggiungi sottogruppo</button><span class="sumq"></span><span class="sumL"></span></div></div>';
  }
  function cardHtml(i) { return S.subs[i].gruppi ? cardSg(i) : cardNormal(i); }
  function flagHtml(i) {
    const t = TPL.subs[i]; if (REGOLE && REGOLE.ruoli_sub && REGOLE.ruoli_sub[t.sub]) return '';
    return '<label class="flag"><input type="checkbox" data-act="sgflag"' + (S.subs[i].gruppi ? ' checked' : '') + '> Presenza sottogruppi</label>';
  }
  function toggleSg(i, on) {
    const s = S.subs[i];
    if (on && !s.gruppi) {
      s.gruppi = [{ nome: 'Sottogruppo 1', pct: s.pctEff, righe: s.righe.map(r => ({ nom: r.nom, sid: r.sid, stato: r.stato, quota: r.quota, note: [r.ruolo, r.note].filter(Boolean).join(' - ') })) }];
      delete s.righe;
    } else if (!on && s.gruppi) {
      if (s.gruppi.length > 1 && !confirm('I sottogruppi verranno uniti in un\'unica lista: le quote delle persone saranno ricalcolate per mantenere gli stessi importi e il nome del sottogruppo diventerà il ruolo. Continuare?')) return false;
      const G = Core.num(s.pctEff);
      s.righe = s.gruppi.flatMap(g => g.righe.map(r => ({ nom: r.nom, sid: r.sid, ruolo: String(g.nome || '').trim(), stato: r.stato, quota: G === 0 ? 0 : Core.num(g.pct) * Core.num(r.quota) / G, note: r.note })));
      delete s.gruppi;
    }
    return true;
  }
  on('change', e => {
    const el = e.target; if (!(el.dataset && el.dataset.act === 'sgflag')) return;
    const card = el.closest('.card'), i = +card.dataset.si;
    if (!toggleSg(i, el.checked)) { el.checked = !el.checked; return; }
    card.outerHTML = cardHtml(i); save(); refresh();
  });
  function renderGroups() {
    const macros = [];
    TPL.subs.forEach((s, i) => { let m = macros.find(x => x.n === s.macro); if (!m) { m = { n: s.macro, items: [], tot: 0 }; macros.push(m); } m.items.push(i); m.tot += s.pctTab; });
    $('#groups').innerHTML = macros.map(m => '<details class="macro" open><summary>' + H(m.n) + '<span class="pill">' + pct(m.tot) + '</span></summary>' + m.items.map(cardHtml).join('') + '</details>').join('');
  }
  function renderCrono() {
    const tx = v => v == null ? '' : (typeof v === 'number' ? String(v) : String(v));
    S.crono = TPL.fasi.map((f, i) => { const r = (S.crono && S.crono[i]) || []; return [tx(r[0]), tx(r[1]), tx(r[2]), tx(r[3])]; });
    $('#cronoBox').innerHTML = TPL.fasi.map((f, i) => '<div class="crc" data-ci="' + i + '"><div class="t">' + H(f) + '</div><div class="grid">' +
      ['Scadenza prevista', 'Scadenza effettiva', 'Atto di approvazione', 'Note'].map((l, k) => '<div><label>' + l + '</label><input data-cr="' + k + '" value="' + H(S.crono[i][k]) + '"></div>').join('') + '</div></div>').join('');
  }
  function renderAll() { renderAnag(); renderMeta(); renderGroups(); renderCrono(); renderLiq(); setTab(tab); refresh(); applicaBlocco(); }
  function setTab(n) {
    tab = n; $$('.tabs button').forEach(b => b.classList.toggle('on', +b.dataset.tab === n));
    [1, 2, 3, 4].forEach(k => $('#p' + k).hidden = k !== n);
    if (n === 4) { refresh(); const f = $('#f_file'); if (f && !FILE_MAN) f.value = nomeFile(); caricaRegistro(); }
  }
  function nomeFile() { return ('INCENTIVI_' + (S.testata.cig || 'SENZA-CIG') + (S.testata.scheda && S.testata.scheda !== 'BASE' ? '_' + S.testata.scheda : '') + '_' + (S.testata.versione || 'REV_00')).replace(/[^\w.\-]+/g, '_') + '.xlsx'; }

  function checks(c) {
    const out = [], t = S.testata, base = Core.num(t.base);
    const add = (l, x) => out.push({ l, x });
    if (!(base > 0)) add('err', 'Base di calcolo mancante.');
    else if (base < 40000) add('warn', TIPO === 'LAVORI' ? 'Importo inferiore a 40.000 €: i lavori sotto soglia sono esclusi dall\'incentivo (art. 5 c. 1 lett. b), salvo accordi quadro o valutazione del Dirigente.' : 'Importo inferiore a 40.000 €: per servizi e forniture il regolamento si applica dai 40.000 € (art. 13 e art. 27 c. 3).');
    if (TIPO !== 'LAVORI') {
      const iD = TPL.subs.findIndex(x => x.sub === 'DIREZIONE ESECUZIONE DEL CONTRATTO');
      if (iD >= 0 && !Core.itemsOf(TPL, S, iD).some(({ r }) => ha(r))) add('warn', 'Nessun direttore dell\'esecuzione indicato: per servizi e forniture l\'incentivo spetta solo se è nominato (art. 5 c. 1 lett. c e art. 13).');
    }
    if (!t.titolo) add('warn', 'Titolo dell\'intervento mancante.');
    if (!/^[A-Za-z0-9]{10}$/.test(t.cig || '')) add('warn', 'CIG mancante o non di 10 caratteri.');
    if (!/^(BASE|MC\d+)(-\d+)?$/.test(t.scheda || 'BASE')) add('err', 'Scheda non valida: scrivi BASE oppure MC1, MC2… (con eventuale suffisso -2, per esempio BASE-2)');
    if (Math.abs(c.sumPct - 1) > 0.000001) add('err', 'Il totale delle % effettive è ' + pct(c.sumPct) + ' (deve restare 100%).');
    S.subs.forEach((s, i) => {
      const t0 = TPL.subs[i], nm = t0.sub, o = c.subsOut[i];
      const lo = t0.pctTab * 0.8 - 1e-9, hi = t0.pctTab * 1.2 + 1e-9, pe = Core.num(s.pctEff);
      if (pe < lo || pe > hi) add('err', nm + ': % effettiva ' + pct(pe) + ' fuori dal ±20% consentito.');
      if (o.isg) {
        const seen = {};
        s.gruppi.forEach(g => {
          const k = String(g.nome || '').trim().toLowerCase();
          if (!k) add('err', nm + ': un sottogruppo non ha il nome.');
          else if (seen[k]) add('err', nm + ': due sottogruppi hanno lo stesso nome ("' + g.nome + '").'); seen[k] = 1;
          const sq = g.righe.reduce((a, r) => a + Core.num(r.quota), 0);
          if (Math.abs(sq - 1) > 1e-6) add('err', nm + ' – "' + (g.nome || '?') + '": le quote sommano ' + pct(sq) + ' (devono fare 100%).');
        });
        if (Math.abs(o.sumP - pe) > 1e-6) add('err', nm + ': i sottogruppi sommano ' + pct(o.sumP) + ' (devono fare ' + pct(pe) + ').');
      } else if (o.qErr) add('err', nm + ': le quote sommano ' + pct(o.sumQ) + ' (devono fare 100%).');
      Core.itemsOf(TPL, S, i).forEach(({ r }) => {
        if (r.stato === 'Interno' && !String(r.nom || '').trim()) add('err', nm + ': manca il nominativo di una riga "Interno".');
        else if (r.stato === 'Interno' && !r.sid) add('err', nm + ': "' + r.nom + '" non è in anagrafica: sceglilo dall\'elenco o aggiungilo.');
      });
    });
    const inc = Core.verificaIncompatibilita(S, TPL, REGOLE);
    inc.violazioni.forEach(v => add('err', 'Incompatibilità – ' + v.testo));
    inc.note.forEach(n => add('warn', n));
    S.subs.forEach((s, i) => {
      const opz = REGOLE.ruoli_sub && REGOLE.ruoli_sub[TPL.subs[i].sub];
      if (opz && s.righe) s.righe.forEach(r => { if (ha(r) && opz.indexOf(r.ruolo) < 0) add('err', TPL.subs[i].sub.slice(0, 40) + '…: per "' + nomeR(r) + '" indica il ruolo (' + opz.join(' / ') + ').'); });
    });
    add('info', 'Controllo delle incompatibilità attivo (' + REGOLE_ORIGINE + '). ' + (inc.riferimento ? 'Rif.: ' + inc.riferimento + '.' : ''));
    if (!out.some(o => o.l === 'err' || o.l === 'warn')) out.unshift({ l: 'ok', x: 'Nessuna anomalia rilevata.' });
    return out;
  }
  function refreshBase() {
    if (!TPL || !S) return;
    const c = Core.compute(S, TPL);
    $('#live').innerHTML = [['Percentuale applicata', pct(c.B26)], ['Fondo incentivo', eur(c.B27)], ['Quota personale (80%)', eur(c.B28)], ['Quota fondo innovazione', eur(c.B29)]]
      .map(a => '<div class="kpi"><small>' + a[0] + '</small><b>' + a[1] + '</b></div>').join('');
    const b = Core.num(S.testata.base);
    $('#avvisoBase').textContent = (b > 0 && b < 40000) ? (TIPO === 'LAVORI' ? 'Attenzione: sotto i 40.000 € i lavori sono esclusi dall\'incentivo (art. 5 c. 1 lett. b).' : 'Attenzione: sotto i 40.000 € servizi e forniture non rientrano nel regolamento (art. 13 e art. 27 c. 3).') : '';
    $('#sumPct').innerHTML = 'Totale % effettive: <b class="' + (Math.abs(c.sumPct - 1) < 1e-6 ? 'ok' : 'errc') + '">' + pct(c.sumPct) + '</b>';
    { const dif = c.B33 - c.B28, okT = Math.abs(dif) < 0.01;
      $('#totLordo').innerHTML = '<b>Totale lordo di tutte le righe:</b> ' + eur(c.B33) + ' · Quota personale (80%) in Anagrafica: ' + eur(c.B28) + ' · ' +
        (okT ? '<b class="ok">coincide</b>' : '<b class="errc">differenza di ' + eur(dif) + '</b> (controlla che il totale delle % effettive sia 100%)'); }
    $$('.riga.viol').forEach(e => { e.classList.remove('viol'); e.removeAttribute('title'); });
    Core.verificaIncompatibilita(S, TPL, REGOLE).violazioni.forEach(v => v.refs.forEach(rf => {
      const card = $('.card[data-si="' + rf.si + '"]'); if (!card) return;
      const cont = rf.gi >= 0 ? card.querySelectorAll('.grp')[rf.gi] : card; const row = cont && cont.querySelectorAll('.riga')[rf.ri];
      if (row) { row.classList.add('viol'); row.title = v.testo; }
    }));
    $$('.card').forEach(el => {
      const i = +el.dataset.si, o = c.subsOut[i], t0 = TPL.subs[i], pe = Core.num(S.subs[i].pctEff);
      const q = el.querySelector('.sumq');
      if (o.isg) {
        const rest = pe - o.sumP, ok = Math.abs(rest) < 1e-6;
        q.textContent = 'Sottogruppi: ' + pct(o.sumP) + ' su ' + pct(pe) + (ok ? '' : ' · ' + (rest > 0 ? 'restano da assegnare ' : 'eccedenza di ') + pct(Math.abs(rest)));
        q.className = 'sumq ' + (ok ? 'ok' : 'errc');
        el.querySelectorAll('.grp').forEach(ge => {
          const g = S.subs[i].gruppi[+ge.dataset.gi], sq = g.righe.reduce((a, r) => a + Core.num(r.quota), 0), ok2 = Math.abs(sq - 1) < 1e-6;
          const sg = ge.querySelector('.sumg'); sg.textContent = 'Somma quote: ' + pct(sq) + ' · sul fondo: ' + pct(Core.num(g.pct)) ; sg.className = 'sumg ' + (ok2 ? 'ok' : 'errc');
        });
      } else { q.textContent = 'Somma quote: ' + pct(o.sumQ); q.className = 'sumq ' + (o.qErr ? 'errc' : 'ok'); }
      const its = Core.itemsOf(TPL, S, i);
      el.querySelectorAll('.riga').forEach((rw, k) => { const inp = rw.querySelector('[data-lordo]'), v = o.rows[k]; if (!inp || !v) return; inp.value = eur(v.J); inp.classList.toggle('off', its[k].r.stato !== 'Interno'); });
      const sl = el.querySelector('.sumL'); if (sl) sl.innerHTML = 'Lordo sub-attività: <b>' + eur(o.rows.reduce((a, x) => a + x.J, 0)) + '</b>';
      el.querySelector('[data-f=pctEff]').classList.toggle('bad', pe < t0.pctTab * 0.8 - 1e-9 || pe > t0.pctTab * 1.2 + 1e-9);
    });
    if (tab === 4) {
      const ck = checks(c), ne = ck.filter(o => o.l === 'err').length;
      $('#checks').innerHTML = ck.map(o => '<li class="' + o.l + '">' + H(o.x) + '</li>').join('');
      $('#avvisoErr').innerHTML = ne ? '<span class="errc">Sono presenti ' + ne + ' errori: puoi comunque salvare, scaricare e stampare: gli errori restano segnalati solo a video e non compaiono nel file Excel né nel PDF.</span>' : '';
      const rows = [['Percentuale applicata', pct(c.B26)], ['Importo fondo incentivo', eur(c.B27)], ['Quota personale', eur(c.B28)], ['Economie (lordo)', eur(c.B30)],
        ['Da impegnare al personale interno', eur(c.B31)], ['Fondo innovazione da impegnare', eur(c.B32)], ['Totale lordo assegnato', eur(c.B33)],
        ['Totale netto', eur(c.B34)], ['Oneri riflessi', eur(c.B35)], ['IRAP', eur(c.B36)]];
      $('#riep').innerHTML = rows.map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('');
    }
  }

  on('input', e => {
    const el = e.target;
    if (el.id === 'f_file') { FILE_MAN = true; return; }
    if (LOCK && !(el.dataset && (el.dataset.m !== undefined || el.dataset.cr !== undefined))) return;
    if (el.dataset && el.dataset.m !== undefined) { metaInput(el); return; }
    if (el.dataset && el.dataset.t) {
      const k = el.dataset.t; let v = el.value;
      if (k === 'cig' || k === 'cup' || k === 'scheda') { v = v.toUpperCase(); if (el.value !== v) el.value = v; }
      if (k === 'base') v = v === '' ? '' : parseFloat(v);
      if (k === 'innov') v = v === '' ? 1 : Math.min(100, Math.max(0, parseFloat(v) || 0)) / 100;
      S.testata[k] = v; save(); refresh(); return;
    }
    if (el.dataset && el.dataset.cr !== undefined) { const ci = +el.closest('[data-ci]').dataset.ci; S.crono[ci][+el.dataset.cr] = el.value; save(); return; }
    const card = el.closest && el.closest('.card'); if (!card) return;
    const s = S.subs[+card.dataset.si];
    if (el.dataset.g) {
      const g = s.gruppi[+el.closest('.grp').dataset.gi];
      if (el.dataset.g === 'nome') { const v = el.value.replace(/[*?~<>=]/g, ''); if (v !== el.value) el.value = v; g.nome = v; }
      else g.pct = (parseFloat(el.value) || 0) / 100;
      save(); refresh(); return;
    }
    if (!el.dataset.f) return;
    const f = el.dataset.f;
    if (f === 'pctEff') s.pctEff = (parseFloat(el.value) || 0) / 100;
    else {
      const grp = el.closest('.grp'), arr = grp ? s.gruppi[+grp.dataset.gi].righe : s.righe;
      const row = el.closest('.riga'), r = arr[+row.dataset.ri];
      if (f === 'quota') r.quota = (parseFloat(el.value) || 0) / 100;
      else if (f === 'stato') cambiaStato(r, row, el.value);
      else {
        r[f] = el.value;
        if (f === 'nom') { if (el.value.trim() && r.stato === 'Non previsto') { r.stato = 'Interno'; row.querySelector('[data-f=stato]').value = 'Interno'; } risolvi(r, el); }
      }
    }
    save(); refresh();
  });
  on('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tab) { setTab(+b.dataset.tab); return; }
    const card = b.closest('.card');
    if (card && b.dataset.act) {
      if (LOCK) return;
      const i = +card.dataset.si, s = S.subs[i], act = b.dataset.act, grp = b.closest('.grp');
      const gi = grp ? +grp.dataset.gi : -1;
      if (act === 'add') s.righe.push({ nom: '', ruolo: '', stato: 'Interno', quota: 0, note: '' });
      if (act === 'del') s.righe.splice(+b.closest('.riga').dataset.ri, 1);
      if (act === 'eq') { const q = 1 / s.righe.length; s.righe.forEach(r => r.quota = q); }
      if (act === 'addg') {
        const sumP = s.gruppi.reduce((a, g) => a + Core.num(g.pct), 0), rest = Math.max(0, Math.round((s.pctEff - sumP) * 1e9) / 1e9);
        s.gruppi.push({ nome: 'Sottogruppo ' + (s.gruppi.length + 1), pct: rest, righe: [{ nom: '', stato: 'Non previsto', quota: 1, note: '' }] });
      }
      if (act === 'delg') s.gruppi.splice(gi, 1);
      if (act === 'addp') s.gruppi[gi].righe.push({ nom: '', stato: 'Interno', quota: 0, note: '' });
      if (act === 'delp') s.gruppi[gi].righe.splice(+b.closest('.riga').dataset.ri, 1);
      if (act === 'eqg') { const q = 1 / s.gruppi[gi].righe.length; s.gruppi[gi].righe.forEach(r => r.quota = q); }
      card.outerHTML = cardHtml(i); save(); refresh(); return;
    }
    if (clickExtra(b)) return;
  });
  function mostraAvvisiTesto(avv) {
    const box = $('#avvisi'); box.hidden = false;
    box.innerHTML = '<ul style="margin:0">' + avv.map(n => '<li class="warnc">' + H(n) + '</li>').join('') + '</ul> <button class="b" id="chiudiAvvisi" style="margin-top:8px">Chiudi</button>';
    $('#chiudiAvvisi').onclick = () => { box.hidden = true; };
  }
  function brevi(x) {
    const u = String(x).toUpperCase();
    if (u.indexOf('COLLAUDATORE TECNICO AMMINISTRATIVO') === 0) return 'Collaudo / CRE';
    if (u.indexOf('RDF FASE PROGRAMMAZIONE') === 0) return 'RDF fase programmazione/progettazione/esecuzione';
    if (u.indexOf('COLLABORATORI PER PROGRAMMAZIONE') === 0) return 'Collaboratori programmazione/progettazione/esecuzione';
    const t = u.charAt(0) + u.slice(1).toLowerCase(); return t.length > 60 ? t.slice(0, 58) + '…' : t;
  }
  function stampaHtml() {
    const c = Core.compute(S, TPL), t = S.testata;
    const dIt = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
    const nn = n => (Number(n) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const ee = n => (Number(n) || 0) === 0 ? '' : nn(n);
    const lg = document.querySelector('header.top img.logo'), logo = (lg && lg.complete && lg.naturalWidth > 0 && lg.src) ? '<img class="plogo" src="' + lg.src + '">' : '';
    let h = '<div class="pr"><div class="ph">' + logo + '<div><div class="ente">Provincia di Pisa</div><div class="set">Settore Viabilità trasporti e protezione civile</div><h1>Incentivi funzioni tecniche – ripartizione dell\'incentivo</h1><div class="nm">art. 45 D.Lgs. 36/2023 e Regolamento della Provincia di Pisa</div></div></div>';
    h += '<h2>Dati dell\'intervento</h2><table class="kv"><tr><td>Titolo</td><td colspan="3">' + H(t.titolo) + '</td></tr>' +
      '<tr><td>CIG</td><td>' + H(t.cig) + '</td><td style="width:14%;background:#F6F7F9;font-weight:bold">CUP</td><td>' + H(t.cup) + '</td></tr>' +
      '<tr><td>Base di calcolo (IVA esclusa)</td><td>' + (t.base === '' ? '' : nn(t.base) + ' €') + '</td><td style="background:#F6F7F9;font-weight:bold">Tipologia</td><td>' + H(t.tipologia) + '</td></tr>' +
      '<tr><td>Tipo di risorse</td><td>' + H(t.risorse) + '</td><td style="background:#F6F7F9;font-weight:bold">% fondo innovazione</td><td>' + pct(t.innov === '' || t.innov == null ? 1 : t.innov) + '</td></tr>' +
      '<tr><td>Versione</td><td>' + H(t.versione) + '</td><td style="background:#F6F7F9;font-weight:bold">Data</td><td>' + dIt(t.data) + '</td></tr>' +
      '<tr><td>Tipo di appalto</td><td>' + H(TIPO_LABEL[TIPO] || TIPO) + '</td><td style="background:#F6F7F9;font-weight:bold">Scheda</td><td>' + H(t.scheda || 'BASE') + '</td></tr></table>';
    h += '<h2>Quadro economico</h2><div class="quad"><table class="kv">' + [['Percentuale applicata (art. 8)', pct(c.B26)], ['Importo del fondo', nn(c.B27) + ' €'], ['Quota personale', nn(c.B28) + ' €'], ['Quota fondo innovazione (art. 7)', nn(c.B29) + ' €'], ['Economie (lordo)', nn(c.B30) + ' €']].map(r => '<tr><td>' + r[0] + '</td><td class="n">' + r[1] + '</td></tr>').join('') +
      '</table><table class="kv">' + [['Da impegnare al personale interno', nn(c.B31) + ' €'], ['Fondo innovazione da impegnare', nn(c.B32) + ' €'], ['Totale lordo assegnato', nn(c.B33) + ' €'], ['Totale netto', nn(c.B34) + ' €'], ['Oneri riflessi', nn(c.B35) + ' €'], ['IRAP', nn(c.B36) + ' €']].map(r => '<tr><td>' + r[0] + '</td><td class="n">' + r[1] + '</td></tr>').join('') + '</table></div>';
    h += '<h2 class="np">Ripartizione per funzione</h2><table><thead><tr><th class="mc">Macro funzione</th><th>Nominativo</th><th>Ruolo / sottogruppo</th><th>Stato</th><th class="n">Quota</th><th class="n">% sul totale</th><th class="n">Lordo €</th><th class="n">Netto €</th><th class="n">Oneri €</th><th class="n">Economie €</th></tr></thead>';
    const macros = [];
    TPL.subs.forEach((s, i) => { let m = macros.find(x => x.n === s.macro); if (!m) { m = { n: s.macro, items: [] }; macros.push(m); } m.items.push(i); });
    const tot = { I: 0, J: 0, L: 0, M: 0, K: 0 }, pers = {};
    const MACRO_COL = ['#A7C0E0', '#B9D3EA', '#9FB4DC', '#B4C7E8', '#A3CBE0', '#8FB0D8', '#C0D4EC', '#9CC0DE'];
    const mix = (hex, t) => '#' + [1, 3, 5].map(q => Math.round(parseInt(hex.substr(q, 2), 16) * (1 - t) + 255 * t).toString(16).padStart(2, '0')).join('');
    macros.forEach((m, mi) => {
      const mt = { I: 0, J: 0, L: 0, M: 0, K: 0, tab: 0 };
      const startG = h.length;
      m.items.forEach(i => {
        const s = S.subs[i], t0 = TPL.subs[i], o = c.subsOut[i], items = Core.itemsOf(TPL, S, i); mt.tab += t0.pctTab;
        h += '<tr class="sh"><td colspan="9">' + H(t0.sub) + ' – % da tabella ' + pct(t0.pctTab) + ' · % effettiva ' + pct(Core.num(s.pctEff)) + '</td></tr>';
        let lastG = null;
        items.forEach(({ g, r }, k) => {
          const v = o.rows[k];
          if (g && g !== lastG) { h += '<tr class="gh"><td colspan="9">Sottogruppo: ' + H(g.nome) + ' – ' + pct(Core.num(g.pct)) + '</td></tr>'; lastG = g; }
          const interno = r.stato === 'Interno';
          h += '<tr><td>' + (H(nomeR(r)) || '—') + '</td><td>' + H(g ? '' : r.ruolo) + (r.note ? '<div style="font-size:8pt;color:#555">' + H(r.note) + '</div>' : '') + '</td><td>' + H(r.stato) + '</td><td class="n">' + pct(Core.num(r.quota)) + '</td><td class="n">' + pct(v.I) + '</td><td class="n">' + nn(v.J) + '</td><td class="n">' + (interno ? nn(v.L) : '') + '</td><td class="n">' + (interno ? nn(v.M) : '') + '</td><td class="n">' + ee(v.K) + '</td></tr>';
          mt.I += v.I; mt.J += v.J; mt.L += v.L; mt.M += v.M; mt.K += v.K;
          if (interno && String(r.nom).trim()) {
            const key = String(r.nom).trim().toLowerCase().replace(/\s+/g, ' ');
            const p = pers[key] || (pers[key] = { nome: String(r.nom).trim(), f: [], I: 0, J: 0, L: 0, M: 0 });
            if (p.f.indexOf(t0.sub) < 0) p.f.push(t0.sub); p.I += v.I; p.J += v.J; p.L += v.L; p.M += v.M;
          }
        });
      });
      h += '<tr class="mt"><td colspan="3">Totale ' + H(m.n) + ' (tabella ' + pct(mt.tab) + ')</td><td></td><td class="n">' + pct(mt.I) + '</td><td class="n">' + nn(mt.J) + '</td><td class="n">' + nn(mt.L) + '</td><td class="n">' + nn(mt.M) + '</td><td class="n">' + ee(mt.K) + '</td></tr>';
      { const seg = h.slice(startG), nr = (seg.match(/<tr/g) || []).length, i1 = seg.indexOf('>') + 1, col = MACRO_COL[mi % MACRO_COL.length];
        const sty = '--c0:' + col + ';--c1:' + mix(col, 0.25) + ';--c2:' + mix(col, 0.45) + ';--c3:' + mix(col, 0.65) + ';--cp:' + mix(col, 0.8);
        h = h.slice(0, startG) + '<tbody class="g" style="' + sty + '">' + seg.slice(0, i1) + '<td class="mc" rowspan="' + nr + '">' + H(m.n) + '</td>' + seg.slice(i1) + '</tbody>'; }
      Object.keys(tot).forEach(k => tot[k] += mt[k]);
    });
    h += '<tbody><tr class="tt"><td></td><td colspan="3">TOTALE</td><td></td><td class="n">' + pct(tot.I) + '</td><td class="n">' + nn(tot.J) + '</td><td class="n">' + nn(tot.L) + '</td><td class="n">' + nn(tot.M) + '</td><td class="n">' + ee(tot.K) + '</td></tr></tbody></table>';
    const pl = Object.keys(pers).map(k => pers[k]).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    if (pl.length) {
      h += '<h2 class="np">Riepilogo per soggetto (personale interno)</h2><table><thead><tr><th>Nominativo</th><th>Funzioni</th><th class="n">% sul totale</th><th class="n">Lordo €</th><th class="n">Netto €</th><th class="n">Oneri €</th></tr></thead><tbody>' +
        pl.map(p => '<tr><td>' + H(p.nome) + '</td><td>' + H(p.f.map(brevi).join('; ')) + '</td><td class="n">' + pct(p.I) + '</td><td class="n">' + nn(p.J) + '</td><td class="n">' + nn(p.L) + '</td><td class="n">' + nn(p.M) + '</td></tr>').join('') + '</tbody></table>';
    }
    if ((S.crono || []).some(r => r.some(v => v != null && String(v).trim() !== ''))) h += '<div style="break-inside:avoid"><h2>Cronoprogramma</h2><table><thead><tr><th>Fase</th><th>Scadenza prevista</th><th>Scadenza effettiva</th><th>Atto di approvazione</th><th>Note</th></tr></thead><tbody>' +
      TPL.fasi.map((f, i) => {
        const cr = (S.crono && S.crono[i]) || [null, null, null, null], dd = v => v == null || v === '' ? '' : (typeof v === 'number' ? dIt(Core.serialToIso(v)) : H(v));
        return '<tr><td>' + H(f) + '</td><td>' + dd(cr[0]) + '</td><td>' + dd(cr[1]) + '</td><td>' + dd(cr[2]) + '</td><td>' + dd(cr[3]) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    const now = new Date();
    h += '<div class="ft">Stampato il ' + now.toLocaleDateString('it-IT') + ' alle ' + now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + ' · CIG ' + H(t.cig) + ' · versione ' + H(t.versione) + ' · tracciato ' + H(TPL.tracciato) + ' · programma ' + ((root.__app && root.__app.VERSIONE) || 'V.10.01') + '<br>© 2026 Provincia di Pisa · Sviluppato da Ing. Luca Pagni</div></div>';
    return h;
  }

  /* =================== NOVITA' V.10.00 (database, blocco, anagrafica) =================== */

  /* ---------- modelli incorporati ---------- */
  async function iniziaModelli() {
    if (TPLS) return;
    if (!root.JSZip) throw new Error('Libreria JSZip non trovata (lib/jszip.min.js).');
    if (!root.MODELLI) throw new Error('Modelli non trovati (js/modelli.js).');
    const t = {};
    for (const tipo of TIPI) {
      const b64 = root.MODELLI[tipo]; if (!b64) continue;
      const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const tp = await Core.readTemplate(root.JSZip, u.buffer);
      if (tp.tipo !== tipo) throw new Error('Modello ' + tipo + ': tipo "' + tp.tipo + '" inatteso.');
      t[tipo] = tp;
    }
    if (!t.LAVORI) throw new Error('Modello dei lavori mancante.');
    TPLS = t;
    REGOLES.LAVORI = Core.regoleDefault; REGOLES.SERVIZI = Core.regoleServiziDefault; REGOLES['SERVIZI SPECIALI'] = Core.regoleServiziDefault;
  }
  function setTipo(t) {
    TIPO = t; TPL = TPLS[t]; REGOLE = REGOLES[t];
    $('#f_tipologia').innerHTML = TIPOLOGIE[t].map(x => '<option>' + H(x) + '</option>').join('');
    $('#f_tipo').value = t;
  }
  function nuovoStato(t, vecchia) {
    const st = Core.newState(TPLS[t]); st.tipo = t; st.testata.tipologia = TIPOLOGIE[t][0];
    if (vecchia) ['titolo', 'cig', 'cup', 'base', 'risorse', 'innov', 'versione', 'data', 'scheda'].forEach(k => { st.testata[k] = vecchia[k]; });
    return st;
  }

  /* ---------- anagrafica soggetti ---------- */
  function indicizza(list) {
    SOGG = list; SOGG_ID = {}; SOGG_NOME = {}; GENERICO = null;
    list.forEach(s => { SOGG_ID[s.id] = s; if (s.generico) GENERICO = s; else if (s.attivo && s.tipo === 'interno') SOGG_NOME[normN(nomeCompleto(s))] = s; });
    if (GEN) $('#rubrica').innerHTML = list.filter(s => !s.generico && s.attivo && s.tipo === 'interno').map(s => nomeCompleto(s)).sort((a, b) => a.localeCompare(b, 'it')).map(n => '<option value="' + H(n) + '">').join('');
  }
  const righeDi = (st, f) => st.subs.forEach(s => (s.gruppi ? s.gruppi.flatMap(g => g.righe) : (s.righe || [])).forEach(f));
  /* dai dati salvati (soggetto_id) allo stato di lavoro (nom + sid) */
  function idrata(st) {
    righeDi(st, r => {
      if (r.stato === 'Interno') { const so = SOGG_ID[r.soggetto_id]; r.sid = so ? so.id : null; r.nom = so ? nomeCompleto(so) : String(r.nom || ''); }
      else if (r.stato === 'Esterno') { r.sid = GENERICO ? GENERICO.id : null; r.nom = ''; }
      else { r.sid = null; r.nom = ''; }
      delete r.soggetto_id;
    });
  }
  /* dallo stato di lavoro ai dati da salvare */
  function serializza() {
    const subs = JSON.parse(JSON.stringify(S.subs)), t = S.testata;
    righeDi({ subs }, r => {
      r.soggetto_id = r.stato === 'Interno' ? (r.sid || null) : (r.stato === 'Esterno' ? (GENERICO ? GENERICO.id : null) : null);
      if (r.stato !== 'Interno') r.nom = '';
      delete r.sid;
    });
    const d = { tracciato: TPL.tracciato, testata: { tipologia: t.tipologia, risorse: t.risorse, innov: t.innov, versione: t.versione, data: t.data }, subs, crono: S.crono };
    if (S.params) d.params = S.params;
    return d;
  }
  const arr6 = x => Math.round(Number(x) * 1e6) / 1e6;
  function colonne() {
    const t = S.testata, m = S.meta;
    return { cig: String(t.cig || '').trim(), scheda: (t.scheda || 'BASE'), tipo_appalto: TIPO, titolo: t.titolo, cup: t.cup, base: t.base === '' || t.base == null ? null : Number(t.base),
      nome_gruppo: m.nome_gruppo, macrocartella_id: m.macrocartella_id || null,
      cre_approvato: !!m.cre, perc_liquidabile: arr6(m.lb), perc_liquidata: arr6(m.lq), data_liquidazione: m.data_liq || null, note_liquidazione: m.note_liq };
  }
  function statoDaRiga(row) {
    const tipo = TPLS[row.tipo_appalto] ? row.tipo_appalto : 'LAVORI', tp = TPLS[tipo], d = row.dati && Object.keys(row.dati).length ? row.dati : null;
    const st = Core.newState(tp); st.tipo = tipo; st.testata.tipologia = TIPOLOGIE[tipo][0];
    let avviso = '';
    if (d && Array.isArray(d.subs) && d.subs.length === tp.subs.length) {
      st.subs = JSON.parse(JSON.stringify(d.subs));
      if (Array.isArray(d.crono)) st.crono = JSON.parse(JSON.stringify(d.crono));
      if (d.params) st.params = d.params;
    } else if (d) avviso = 'I dati salvati non corrispondono al modello attuale: il gruppo di lavoro è stato ricreato vuoto.';
    const t = st.testata, dt = (d && d.testata) || {};
    t.titolo = row.titolo || ''; t.cig = row.cig || ''; t.cup = row.cup || ''; t.base = row.base == null ? '' : Number(row.base); t.scheda = row.scheda || 'BASE';
    t.tipologia = dt.tipologia || TIPOLOGIE[tipo][0]; t.risorse = dt.risorse || 'NON VINCOLATE'; t.innov = dt.innov == null ? 1 : dt.innov;
    t.versione = dt.versione || 'REV_00'; t.data = dt.data || new Date().toISOString().slice(0, 10);
    st.meta = { nome_gruppo: row.nome_gruppo || '', macrocartella_id: row.macrocartella_id || '', cre: !!row.cre_approvato, lb: Number(row.perc_liquidabile) || 0, lq: Number(row.perc_liquidata) || 0, data_liq: row.data_liquidazione || '', note_liq: row.note_liquidazione || '' };
    st._avviso = avviso;
    return st;
  }

  /* ---------- scelta della persona ---------- */
  function nomInput(r) {
    if (r.stato === 'Esterno') return '<input data-f="nom" value="Esterno (generico)" disabled class="gen" aria-label="Soggetto generico">';
    if (r.stato === 'Riduzione art. 18') return '<input data-f="nom" value="" placeholder="—" disabled>';
    const bad = String(r.nom || '').trim() && !r.sid;
    return '<input data-f="nom" list="rubrica" placeholder="Cognome Nome" value="' + H(r.nom) + '"' + (bad ? ' class="bad"' : '') + '>';
  }
  function risolvi(r, el) {
    const key = normN(r.nom); let so = key ? SOGG_NOME[key] : null;
    if (!so && key && r.sid && SOGG_ID[r.sid] && normN(nomeCompleto(SOGG_ID[r.sid])) === key) so = SOGG_ID[r.sid];   // soggetto disattivato gia' presente nel gruppo
    r.sid = so ? so.id : null;
    if (el) el.classList.toggle('bad', key !== '' && !so);
  }
  function cambiaStato(r, row, val) {
    const prec = r.stato; r.stato = val;
    const inp = row.querySelector('[data-f=nom]');
    if (val === 'Esterno') { r.nom = ''; r.sid = GENERICO ? GENERICO.id : null; inp.value = 'Esterno (generico)'; inp.disabled = true; inp.classList.remove('bad'); inp.classList.add('gen'); }
    else if (val === 'Riduzione art. 18') { r.nom = ''; r.sid = null; inp.value = ''; inp.disabled = true; inp.placeholder = '—'; inp.classList.remove('bad', 'gen'); }
    else {
      if (val === 'Non previsto' || prec === 'Esterno' || prec === 'Riduzione art. 18') { r.nom = ''; r.sid = null; inp.value = ''; }
      inp.disabled = false; inp.classList.remove('bad', 'gen'); inp.setAttribute('list', 'rubrica'); inp.placeholder = 'Cognome Nome';
    }
  }
  function nonRisolti() {
    const m = new Map();
    S.subs.forEach((s, i) => Core.itemsOf(TPL, S, i).forEach(({ r }) => { if (r.stato === 'Interno' && String(r.nom || '').trim() && !r.sid) m.set(normN(r.nom), String(r.nom).trim()); }));
    return Array.from(m.values());
  }
  function aggiornaNonRis() {
    const l = nonRisolti(), box = $('#nonRis'); if (!box) return;
    box.innerHTML = l.length ? '<div class="msg err nr"><b>Nominativi non in anagrafica</b> (il salvataggio è bloccato finché non li risolvi):<br>' +
      l.map(n => { const ina = SOGG.find(s => !s.generico && !s.attivo && normN(nomeCompleto(s)) === normN(n)); return H(n) + (ina ? ' <i>(disattivato in anagrafica)</i>' : ' <button class="b" data-add="' + H(n) + '">Aggiungi all\'anagrafica…</button>'); }).join('<br>') + '</div>' : '';
  }
  function risolviTutti() { righeDi(S, r => { if (r.stato === 'Interno') risolvi(r, null); }); }
  function dialogSoggetto(prefill) {
    const parti = String(prefill || '').trim().split(/\s+/).filter(Boolean), cogn = parti.shift() || '', nome = parti.join(' ');
    const d = UI.modal('<h2>Aggiungi un soggetto all\'anagrafica</h2><p class="hint">Nuovo dipendente (interno). Si scrive prima il Cognome, poi il Nome.</p>' +
      '<label>Cognome</label><input id="sCogn" type="text" value="' + H(cogn) + '"><label>Nome</label><input id="sNome" type="text" value="' + H(nome) + '"><div id="sMsg"></div>' +
      '<div class="az"><button class="btn p" data-a="ok">Aggiungi</button><button class="btn" data-a="x">Annulla</button></div>');
    d.querySelector('#sCogn').focus();
    d.onclick = async ev => {
      const a = ev.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'x') { UI.chiudiModal(); return; }
      const c = d.querySelector('#sCogn').value.trim(), n = d.querySelector('#sNome').value.trim(), msg = d.querySelector('#sMsg');
      if (!c) { msg.innerHTML = '<div class="msg err">Il cognome è obbligatorio.</div>'; return; }
      a.disabled = true;
      try {
        await Dati.creaSoggetto({ cognome: c, nome: n });
        indicizza(await Dati.soggetti());
        const prima = JSON.stringify(S.subs); risolviTutti();
        UI.chiudiModal(); UI.toast('Soggetto aggiunto all\'anagrafica.', 'ok');
        if (JSON.stringify(S.subs) !== prima) { save(); renderGroups(); applicaBlocco(); }
        refresh();
      } catch (e) { msg.innerHTML = '<div class="msg err">' + H(e.message) + '</div>'; a.disabled = false; }
    };
  }

  /* ---------- anagrafica estesa e liquidazione ---------- */
  function renderMeta() {
    $('#f_gruppo').value = S.meta.nome_gruppo;
    $('#f_macro').innerHTML = '<option value="">— nessuna —</option>' + MACRO.map(m => '<option value="' + H(m.id) + '">' + H(m.nome) + '</option>').join('');
    $('#f_macro').value = S.meta.macrocartella_id || '';
  }
  function renderLiq() {
    const m = S.meta; $('#l_cre').value = m.cre ? 'SI' : 'NO'; $('#l_lb').value = pctIn(m.lb); $('#l_lq').value = pctIn(m.lq); $('#l_data').value = m.data_liq || ''; $('#l_note').value = m.note_liq || '';
  }
  function metaInput(el) {
    const k = el.dataset.m; let v = el.value;
    if (k === 'lb' || k === 'lq') v = Math.round(Math.min(100, Math.max(0, parseFloat(v) || 0)) * 10000) / 1000000;
    else if (k === 'cre') v = (v === 'SI');
    S.meta[k] = v; save(); refresh();
  }
  function aggiornaLiq() {
    const m = S.meta, box = $('#liqOut'); if (!box) return;
    const p = { perc_liquidabile: m.lb, perc_liquidata: m.lq, cre_approvato: m.cre, sbloccata: CUR.sbloccata };
    box.innerHTML = '<div>Stato: ' + Liq.pill(Liq.chiave(p)) + '</div><div class="rng" style="font-size:13px;margin-top:4px">% da liquidare: ' + pct(1 - m.lq) + ' · % in liquidazione: ' + pct(m.lb - m.lq) + '</div>' +
      Liq.avvisi(p).map(a => '<div class="msg warn">⚠ ' + H(a) + '</div>').join('') +
      (!LOCK && m.lq > 0 ? '<div class="msg warn">Salvando con una % liquidata maggiore di 0 la procedura verrà <b>bloccata</b>: per modificare ancora il gruppo di lavoro servirà lo sblocco da un admin.</div>' : '');
  }

  /* ---------- blocco, barra di stato, salvataggio ---------- */
  function applicaBlocco() {
    /* gli elementi statici (anagrafica e pulsante soggetti) si riabilitano quando la procedura non e' piu' bloccata;
       le schede del gruppo vengono ricreate da renderGroups con il loro stato corretto */
    if (!LOCK) { $$('#p1 input,#p1 select,#p1 textarea,#gNuovoSogg').forEach(e => { e.disabled = false; }); return; }
    $$('#p1 input,#p1 select,#p1 textarea,#p2 input,#p2 select,#p2 textarea,#p2 button').forEach(e => { if (!e.hasAttribute('data-lordo')) e.disabled = true; });
  }
  function refresh() { refreshBase(); aggiornaBarra(); aggiornaNonRis(); aggiornaLiq(); }
  function save() { DIRTY = true; if (GEN) aggiornaBarra(); }
  function aggiornaBarra() {
    $('#gTit').innerHTML = H(S.testata.cig || '(senza CIG)') + ' · ' + H(S.testata.scheda || 'BASE') + ' <span class="hint">' + H(TIPO_LABEL[TIPO]) + '</span>';
    $('#gStato').innerHTML = (DIRTY ? '<span class="warnc">● Modifiche non salvate</span>' : '<span class="ok">● Salvato</span>') +
      ' <span class="hint">· versione ' + H(CUR.versione) + ' · ultima modifica ' + H(UI.dataOra(CUR.updated_at)) + (CUR.updated_by_nome ? ' · ' + H(CUR.updated_by_nome) : '') + '</span>';
    $('#gSalva').disabled = !DIRTY || SALVANDO;
    const lk = $('#gLock');
    if (LOCK) { lk.hidden = false; lk.innerHTML = '🔒 <b>Procedura bloccata</b>: già liquidata. Sono modificabili solo il cronoprogramma e la liquidazione. <button class="b" id="gSblocca">Sblocca…</button>'; }
    else if (CUR.sbloccata) { lk.hidden = false; lk.innerHTML = '🔓 Procedura <b>sbloccata</b> da un admin: il gruppo è modificabile. <button class="b" id="gBlocca">Blocca…</button>'; }
    else lk.hidden = true;
  }
  const hasEsterno = () => S.subs.some((s, i) => Core.itemsOf(TPL, S, i).some(({ r }) => r.stato === 'Esterno'));
  async function salva() {
    if (SALVANDO) return false;
    if (!DIRTY) return true;
    const nr = nonRisolti();
    if (nr.length) { UI.toast('Nominativi non in anagrafica: ' + nr.join(', ') + '. Scegli dall\'elenco o aggiungili all\'anagrafica.', 'err'); setTab(2); return false; }
    if (!LOCK) {
      if (!String(S.testata.cig || '').trim()) { UI.toast('Il CIG è obbligatorio.', 'err'); setTab(1); return false; }
      if (!SCHEDA_RE.test(S.testata.scheda || 'BASE')) { UI.toast('Scheda non valida: BASE oppure MC1, MC2… (con eventuale suffisso -2).', 'err'); setTab(1); return false; }
      if (hasEsterno() && !GENERICO) { UI.toast('Manca il soggetto generico «Esterno» in anagrafica (script SQL 03).', 'err'); return false; }
    }
    SALVANDO = true; aggiornaBarra();
    try {
      const c = colonne(), liq = { cre_approvato: c.cre_approvato, perc_liquidabile: c.perc_liquidabile, perc_liquidata: c.perc_liquidata, data_liquidazione: c.data_liquidazione, note_liquidazione: c.note_liquidazione };
      /* procedura bloccata: si inviano solo liquidazione e cronoprogramma (il resto del gruppo resta com'e') */
      const payload = LOCK ? Object.assign({ id: CUR.id, versione: CUR.versione, dati: Object.assign({}, CUR.dati, { crono: S.crono }) }, liq)
                           : Object.assign({ id: CUR.id, versione: CUR.versione }, c, { dati: serializza() });
      const eraBloccata = LOCK;
      CUR = await Dati.salvaProcedura(payload); DIRTY = false; LOCK = Liq.bloccata(CUR);
      UI.toast('Salvato.', 'ok');
      if (LOCK !== eraBloccata) { if (LOCK) UI.toast('Procedura bloccata: già liquidata. Per modificare il gruppo serve lo sblocco.', 'info'); renderAll(); }
      if (tab === 4) caricaRegistro();
      return true;
    } catch (e) { erroreSalvataggio(e); return false; }
    finally { SALVANDO = false; if (GEN) aggiornaBarra(); }
  }
  function erroreSalvataggio(e) {
    if (e.tipo !== 'conflitto' && e.tipo !== 'bloccata') { UI.errore(e); return; }
    const d = UI.modal('<h2>' + (e.tipo === 'conflitto' ? 'Procedura modificata da un altro utente' : 'Procedura bloccata') + '</h2><p>' + H(e.message) + '</p>' +
      '<p>Le tue modifiche <b>non sono state salvate</b>. Puoi scaricarle in un file, ricaricare i dati dal server (le tue modifiche andranno perse) oppure restare qui.</p>' +
      '<div class="az"><button class="btn" data-a="json">Scarica le mie modifiche</button><button class="btn p" data-a="ricarica">Ricarica dal server</button><button class="btn" data-a="resta">Resta qui</button></div>');
    d.onclick = async ev => {
      const a = ev.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'json') scaricaJson();
      if (a.dataset.a === 'ricarica') { UI.chiudiModal(); await ricaricaDaServer(true); }
      if (a.dataset.a === 'resta') UI.chiudiModal();
    };
  }
  function scaricaJson() {
    const out = { nota: 'Modifiche non salvate - Incentivi funzioni tecniche', procedura: { cig: S.testata.cig, scheda: S.testata.scheda }, colonne: colonne(), dati: serializza() };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }));
    a.download = ('modifiche_non_salvate_' + (S.testata.cig || 'procedura') + '_' + (S.testata.scheda || 'BASE') + '.json').replace(/[^\w.\-]+/g, '_'); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function ricaricaDaServer(forza) {
    if (!forza && DIRTY && !confirm('Ci sono modifiche non salvate: ricaricando andranno perse. Continuare?')) return;
    const token = TOKEN;
    try {
      const r = await Promise.all([Dati.leggiProcedura(CUR.id), Dati.soggetti(), Dati.macrocartelle()]);
      if (token !== TOKEN || !GEN) return;
      MACRO = r[2]; indicizza(r[1]); applicaRiga(r[0]); UI.toast('Dati ricaricati dal server.', 'ok');
    } catch (e) { UI.errore(e); }
  }
  function bloccoDialog(sblocca) {
    if (DIRTY) { UI.toast('Salva (o ricarica) prima di cambiare il blocco: ci sono modifiche non salvate.', 'err'); return; }
    UI.dialogBlocco(CUR, sblocca, async () => { await ricaricaDaServer(true); }, null);
  }
  function clickExtra(b) {
    switch (b.id) {
      case 'gSalva': salva(); return true;
      case 'gGenera': conSalvataggio('scaricare il file Excel', scaricaExcel); return true;
      case 'gStampa': conSalvataggio('stampare', stampa); return true;
      case 'gRicarica': ricaricaDaServer(false); return true;
      case 'gIndietro': location.hash = '#/procedure'; return true;
      case 'gNuovoSogg': dialogSoggetto(''); return true;
      case 'gSblocca': bloccoDialog(true); return true;
      case 'gBlocca': bloccoDialog(false); return true;
      case 'chiudiAvvisi': $('#avvisi').hidden = true; return true;
    }
    if (b.dataset.reg !== undefined) { confrontaReg(b.dataset.reg); return true; }
    if (b.dataset.add !== undefined) { dialogSoggetto(b.dataset.add); return true; }
    return false;
  }
  function cambiaTipo(t) {
    if (t === TIPO) return;
    if (!TPLS[t]) { alert('Manca il modello per questo tipo.'); $('#f_tipo').value = TIPO; return; }
    const pieno = S.subs.some(s => Core.itemsOf(TPL, S, S.subs.indexOf(s)).some(({ r }) => String(r.nom || '').trim()));
    if (pieno && !confirm('Cambiando il tipo di appalto il gruppo di lavoro viene azzerato (l\'anagrafica resta). Continuare?')) { $('#f_tipo').value = TIPO; return; }
    const vecchia = S.testata, vcrono = S.crono, meta = S.meta;
    S = nuovoStato(t, vecchia); S.meta = meta; if (vcrono) S.crono = vcrono; setTipo(t); save(); renderAll();
  }
  on('change', e => { if (e.target.id === 'f_tipo' && !LOCK) cambiaTipo(e.target.value); });


  /* =================== NOVITA' V.10.01 (Excel, stampa, registro modifiche) =================== */

  /* Prima di scaricare o stampare si chiede sempre di salvare le modifiche pendenti. */
  function conSalvataggio(verbo, azione) {
    if (!DIRTY) { azione(); return; }
    const d = UI.modal('<h2>Salvare le modifiche?</h2><p>Ci sono modifiche non salvate. Prima di ' + H(verbo) + ' vanno salvate, così il documento corrisponde ai dati nel database.</p>' +
      '<div class="az"><button class="btn p" data-a="s">Salva e continua</button><button class="btn" data-a="x">Annulla</button></div>');
    d.onclick = async ev => {
      const a = ev.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'x') { UI.chiudiModal(); return; }
      a.disabled = true;
      const ok = await salva();
      if (d.isConnected) UI.chiudiModal();     // se il salvataggio ha aperto un altro dialogo (conflitto) non lo chiudo
      if (ok && GEN) azione();
    };
  }

  /* stato per l'Excel: nel file i nominativi sono testo (dall'anagrafica); l'esterno e' sempre «Esterno» */
  function statoPerExcel() {
    const st = JSON.parse(JSON.stringify(S));
    righeDi(st, r => {
      if (r.stato === 'Interno') { const so = SOGG_ID[r.sid]; r.nom = so ? nomeCompleto(so) : String(r.nom || ''); }
      else if (r.stato === 'Esterno') r.nom = 'Esterno';
      else r.nom = '';
    });
    return st;
  }
  async function scaricaExcel() {
    const msg = $('#genMsg');
    try {
      const out = await Core.generate(TPL, statoPerExcel());
      let nome = (($('#f_file') && $('#f_file').value) || nomeFile()).trim(); if (!/\.xlsx$/i.test(nome)) nome += '.xlsx';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      if (msg) msg.innerHTML = '<span class="ok">File generato: ' + H(nome) + '</span>';
    } catch (e) { if (msg) msg.innerHTML = '<span class="errc">Errore nella generazione: ' + H(e.message) + '</span>'; }
  }
  function stampa() {
    let pa = document.getElementById('printArea');
    if (!pa) { pa = document.createElement('div'); pa.id = 'printArea'; document.body.appendChild(pa); }
    pa.innerHTML = stampaHtml();
    window.addEventListener('afterprint', () => { pa.innerHTML = ''; }, { once: true });
    window.print();
  }

  /* ---------- registro delle modifiche (solo admin) ---------- */
  const OP = { creazione: 'Creazione', modifica: 'Modifica', sblocco: 'Sblocco', blocco: 'Blocco', eliminazione: 'Eliminazione' };
  const isAdmin = () => !!(root.Auth && Auth.ruolo && Auth.ruolo() === 'admin');
  async function caricaRegistro() {
    const box = $('#regBox'); if (!box) return;
    if (!isAdmin()) { box.hidden = true; return; }
    box.hidden = false;
    const token = TOKEN, out = $('#regOut');
    try {
      const rows = await Dati.registro({ proceduraId: CUR.id, limite: 50 });
      if (token !== TOKEN || !GEN) return;
      out.innerHTML = rows.length ? '<table class="r reg"><thead><tr><th>Quando</th><th>Chi</th><th>Operazione</th><th>Nota</th><th></th></tr></thead><tbody>' +
        rows.map(r => '<tr><td>' + H(UI.dataOra(r.at)) + '</td><td>' + H(r.utente_nome || '') + '</td><td>' + H(OP[r.operazione] || r.operazione) + '</td><td>' + H(r.nota || '') + '</td>' +
          '<td>' + (r.operazione === 'eliminazione' ? '' : '<button class="b" data-reg="' + H(r.id) + '">Confronta</button>') + '</td></tr>').join('') + '</tbody></table>' +
        '<p class="hint">Ultime ' + rows.length + ' operazioni, dalla più recente.</p>' : '<p class="hint">Nessuna operazione registrata.</p>';
    } catch (e) { if (token === TOKEN && GEN) out.innerHTML = '<div class="msg err">' + H(e.message) + '</div>'; }
  }
  /* descrizione leggibile delle righe di una sub-attivita' (per il confronto) */
  function nomeDaId(r) {
    if (r.stato === 'Esterno') return 'Esterno';
    if (r.stato === 'Interno') { const so = SOGG_ID[r.soggetto_id]; return so ? nomeCompleto(so) : (r.soggetto_id ? '(soggetto non più in anagrafica)' : '(nominativo mancante)'); }
    return '—';
  }
  function righeTesto(sub) {
    const out = [];
    const rr = (r, pre) => out.push((pre ? pre + ' · ' : '') + nomeDaId(r) + (r.ruolo ? ' (' + r.ruolo + ')' : '') + ' · ' + r.stato + ' · quota ' + pct(Number(r.quota) || 0) + (r.note ? ' · nota: ' + r.note : ''));
    if (sub.gruppi) sub.gruppi.forEach(g => (g.righe || []).forEach(r => rr(r, 'Sottogruppo «' + g.nome + '» ' + pct(Number(g.pct) || 0))));
    else (sub.righe || []).forEach(r => rr(r, ''));
    return out;
  }
  function differenze(pr, dp) {
    const d = [], add = (c, a, b) => { if (String(a) !== String(b)) d.push([c, a, b]); };
    const f = (x, k) => (x && x[k] != null && x[k] !== '') ? x[k] : '–';
    const macro = id => { const m = MACRO.find(x => x.id === id); return id ? (m ? m.nome : '(altra macrocartella)') : '–'; };
    const sino = v => v ? 'SI' : 'NO';
    ['cig', 'scheda', 'nome_gruppo', 'tipo_appalto', 'titolo', 'cup'].forEach(k => add(k === 'nome_gruppo' ? 'Nome gruppo' : k === 'tipo_appalto' ? 'Tipo di appalto' : k.charAt(0).toUpperCase() + k.slice(1), f(pr, k), f(dp, k)));
    add('Macrocartella', macro(pr.macrocartella_id), macro(dp.macrocartella_id));
    add('Base di calcolo', pr.base == null ? '–' : UI.eur(pr.base), dp.base == null ? '–' : UI.eur(dp.base));
    const tp = pr.dati && pr.dati.testata || {}, td = dp.dati && dp.dati.testata || {};
    add('Tipologia', f(tp, 'tipologia'), f(td, 'tipologia')); add('Tipo di risorse', f(tp, 'risorse'), f(td, 'risorse'));
    add('% fondo innovazione', tp.innov == null ? '–' : pct(tp.innov), td.innov == null ? '–' : pct(td.innov));
    add('Versione (etichetta)', f(tp, 'versione'), f(td, 'versione')); add('Data', f(tp, 'data'), f(td, 'data'));
    add('CRE approvato', sino(pr.cre_approvato), sino(dp.cre_approvato));
    add('% liquidabile', UI.pct(pr.perc_liquidabile), UI.pct(dp.perc_liquidabile)); add('% liquidata', UI.pct(pr.perc_liquidata), UI.pct(dp.perc_liquidata));
    add('Data liquidazione', f(pr, 'data_liquidazione'), f(dp, 'data_liquidazione')); add('Note liquidazione', f(pr, 'note_liquidazione'), f(dp, 'note_liquidazione'));
    add('Sbloccata', sino(pr.sbloccata), sino(dp.sbloccata));
    const sp = (pr.dati && pr.dati.subs) || [], sd = (dp.dati && dp.dati.subs) || [], tpl = TPLS[dp.tipo_appalto] || TPL;
    const vuoto = !sp.length;     // stato precedente senza gruppo di lavoro salvato (procedura appena creata)
    for (let i = 0; i < Math.max(sp.length, sd.length); i++) {
      const nm = (tpl.subs[i] && tpl.subs[i].sub) || ('Attività ' + (i + 1)), a = vuoto ? { righe: [] } : sp[i], b = sd[i];
      if (!a || !b) { add(nm, a ? 'presente' : 'assente', b ? 'presente' : 'assente'); continue; }
      if (!vuoto && Math.abs((Number(a.pctEff) || 0) - (Number(b.pctEff) || 0)) > 1e-9) d.push([nm + ' – % effettiva', pct(Number(a.pctEff) || 0), pct(Number(b.pctEff) || 0)]);
      const ra = righeTesto(a), rb = righeTesto(b).filter(x => !vuoto || x.indexOf('· Non previsto ·') < 0), cb = rb.slice();
      const tolte = [];
      ra.forEach(x => { const j = cb.indexOf(x); if (j >= 0) cb.splice(j, 1); else tolte.push(x); });
      if (tolte.length || cb.length) d.push([nm, tolte.join('\n') || '–', cb.join('\n') || '–']);
    }
    const ca = (pr.dati && pr.dati.crono) || [], cn = (dp.dati && dp.dati.crono) || [], col = ['Scadenza prevista', 'Scadenza effettiva', 'Atto di approvazione', 'Note'], fasi = tpl.fasi || [];
    for (let i = 0; i < Math.max(ca.length, cn.length); i++) for (let k = 0; k < 4; k++) {
      const x = ca[i] && ca[i][k] != null && ca[i][k] !== '' ? ca[i][k] : '–', y = cn[i] && cn[i][k] != null && cn[i][k] !== '' ? cn[i][k] : '–';
      add('Cronoprogramma · ' + (fasi[i] || 'fase ' + (i + 1)) + ' · ' + col[k], x, y);
    }
    return d;
  }
  async function confrontaReg(id) {
    let r;
    try { r = await Dati.registroDettaglio(id); } catch (e) { UI.errore(e); return; }
    const cella = t => H(t).replace(/\n/g, '<br>');
    let corpo;
    if (!r.prima && r.dopo) corpo = '<p class="hint">Creazione della procedura: non c\'è uno stato precedente da confrontare.</p>';
    else if (r.prima && r.dopo) {
      const d = differenze(r.prima, r.dopo);
      corpo = d.length ? '<div class="regdiff"><table class="r"><thead><tr><th>Campo</th><th>Prima</th><th>Dopo</th></tr></thead><tbody>' + d.map(x => '<tr><td>' + H(x[0]) + '</td><td>' + cella(x[1]) + '</td><td>' + cella(x[2]) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="hint">Nessuna differenza nei dati della procedura' + (r.nota ? ' (cambia soltanto lo stato di blocco registrato con la nota).' : '.') + '</p>';
    } else corpo = '<p class="hint">Stato non disponibile.</p>';
    const dlg = UI.modal('<h2>' + H(OP[r.operazione] || r.operazione) + ' · ' + H(UI.dataOra(r.at)) + '</h2><p>' + H(r.utente_nome || '') + (r.nota ? ' · nota: ' + H(r.nota) : '') + '</p>' + corpo + '<div class="az"><button class="btn" data-a="x">Chiudi</button></div>');
    dlg.style.maxWidth = '920px'; dlg.style.width = '92vw';
    dlg.onclick = ev => { if (ev.target.closest('[data-a]')) UI.chiudiModal(); };
  }

  /* ---------- apertura e chiusura ---------- */
  const beforeUnload = e => { if (DIRTY) { e.preventDefault(); e.returnValue = ''; } };
  function applicaRiga(row) {
    CUR = row; S = statoDaRiga(row); const avv = S._avviso; delete S._avviso;
    setTipo(S.tipo); idrata(S); LOCK = Liq.bloccata(row); DIRTY = false;
    $('#avvisi').hidden = true; if (avv) mostraAvvisiTesto([avv]);
    renderAll();
  }
  async function render(box, id) {
    const token = ++TOKEN; DIRTY = false; GEN = null;
    window.removeEventListener('beforeunload', beforeUnload);
    if (!id) { box.innerHTML = '<div class="panel"><h2>Generatore</h2><p>Per aprire il Generatore scegli una procedura dall\'elenco e premi «Apri nel Generatore», oppure crea una nuova procedura.</p><p><a class="btn p" href="#/procedure">Vai a Procedure</a></p></div>'; return; }
    box.innerHTML = '<div class="panel"><h2>Generatore</h2><p>Caricamento…</p></div>';
    let r;
    try { await iniziaModelli(); r = await Promise.all([Dati.leggiProcedura(id), Dati.soggetti(), Dati.macrocartelle()]); }
    catch (e) { if (token !== TOKEN) return; box.innerHTML = '<div class="panel"><h2>Generatore</h2><div class="msg err">' + H(e.message) + '</div><p><a class="btn" href="#/procedure">← Procedure</a></p></div>'; return; }
    if (token !== TOKEN) return;
    GEN = document.createElement('div'); GEN.id = 'gen'; GEN.innerHTML = HTML_GEN;
    box.innerHTML = ''; box.appendChild(GEN);
    EV.forEach(x => GEN.addEventListener(x[0], x[1]));
    tab = 1; FILE_MAN = false; MACRO = r[2]; indicizza(r[1]); applicaRiga(r[0]);
    window.addEventListener('beforeunload', beforeUnload);
  }
  function chiudi() { TOKEN++; DIRTY = false; GEN = null; window.removeEventListener('beforeunload', beforeUnload); if (root.UI) UI.chiudiModal(); }
  root.Generatore = { render, chiudi, sporco: () => !!GEN && DIRTY, idCorrente: () => (GEN && CUR) ? CUR.id : null,
    _test: { get S() { return S; }, get CUR() { return CUR; }, get LOCK() { return LOCK; }, serializza, colonne, nonRisolti } };
})(window);

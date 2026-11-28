/* core.js - V.10.00 - nucleo di calcolo del Generatore V.07.04, copiato IDENTICO (lettura modello, calcoli, incompatibilità). */
/* Nucleo: lettura del modello Excel, calcoli e generazione del file .xlsx (nessun accesso al DOM) */
(function (root) {
  'use strict';
  const R0 = 52, RMAX = 2000;
  const RIGHE_FISSE = 51;           // le righe 1-51 del modello restano come sono (testata, parametri, risultati, cronoprogramma)
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const unesc = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&');
  const num = v => (v === '' || v === null || v === undefined || isNaN(+v)) ? 0 : +v;
  const numXml = n => String(n);

  function parseSST(xml) {
    const out = [];
    const re = /<si>([\s\S]*?)<\/si>/g; let m;
    while ((m = re.exec(xml))) {
      let t = ''; const r2 = /<t[^>]*>([\s\S]*?)<\/t>/g; let k;
      while ((k = r2.exec(m[1]))) t += k[1];
      out.push(unesc(t));
    }
    return out;
  }
  function getCell(xml, ref) {
    const re = new RegExp('<c r="' + ref + '"([^>]*?)(?:/>|>([\\s\\S]*?)</c>)');
    const m = re.exec(xml); if (!m) return null;
    const attrs = m[1] || '', inner = m[2] || '';
    const s = (/ s="(\d+)"/.exec(attrs) || [])[1];
    const t = (/ t="(\w+)"/.exec(attrs) || [])[1];
    const v = (/<v>([\s\S]*?)<\/v>/.exec(inner) || [])[1];
    const f = (/<f[^>]*>([\s\S]*?)<\/f>/.exec(inner) || [])[1];
    const is = (/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/.exec(inner) || [])[1];
    return { s, t, v, f, is, raw: m[0] };
  }
  function cellValue(xml, ref, sst) {
    const c = getCell(xml, ref); if (!c) return null;
    if (c.t === 'inlineStr') return c.is === undefined ? '' : unesc(c.is);
    if (c.v === undefined || c.v === '') return null;
    if (c.t === 's') return sst[+c.v];
    if (c.t === 'str') return unesc(c.v);
    return parseFloat(c.v);
  }
  function patchCell(xml, ref, build) {
    const c = getCell(xml, ref); if (!c) throw new Error('Cella ' + ref + ' non trovata nel modello');
    return xml.replace(c.raw, build(c));
  }
  const cStr = (ref, s, text) => '<c r="' + ref + '"' + (s !== undefined ? ' s="' + s + '"' : '') + ' t="inlineStr"><is><t xml:space="preserve">' + esc(text) + '</t></is></c>';
  const cNum = (ref, s, n) => '<c r="' + ref + '"' + (s !== undefined ? ' s="' + s + '"' : '') + '><v>' + numXml(n) + '</v></c>';
  const cEmpty = (ref, s) => '<c r="' + ref + '"' + (s !== undefined ? ' s="' + s + '"' : '') + '/>';
  const cFor = (ref, s, f, val) => {
    if (typeof val === 'string') return '<c r="' + ref + '"' + (s !== undefined ? ' s="' + s + '"' : '') + ' t="str"><f>' + esc(f) + '</f><v>' + esc(val) + '</v></c>';
    return '<c r="' + ref + '"' + (s !== undefined ? ' s="' + s + '"' : '') + '><f>' + esc(f) + '</f><v>' + numXml(val) + '</v></c>';
  };
  function excelSerial(iso) {            // 'AAAA-MM-GG' -> numero seriale di Excel
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); if (!m) return null;
    return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000);
  }
  function serialToIso(n) {
    if (n === null || n === undefined || isNaN(n)) return '';
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
    return d.toISOString().slice(0, 10);
  }

  /* ---- lettura del modello ---- */
  async function readTemplate(JSZip, buf) {
    const zip = await JSZip.loadAsync(buf);
    const f = zip.file('xl/worksheets/sheet1.xml'); if (!f) throw new Error('Il modello non contiene il foglio INCENTIVO');
    const sheetXml = await f.async('string');
    const sf = zip.file('xl/sharedStrings.xml');
    const sst = sf ? parseSST(await sf.async('string')) : [];
    const V = ref => cellValue(sheetXml, ref, sst);
    const tracciato = V('B1'), tipo = V('B2');
    if (!/^(LAV|SERV)-/.test(String(tracciato))) throw new Error('Il file non è un modello valido (tracciato ' + tracciato + ')');
    const params = { soglia: V('B14'), l1: V('B15'), p1: V('B16'), p2: V('B17'), p3: V('B18'), l4: V('B19'), p4: V('B20'), quota80: V('B21'), oneri: V('B22'), irap: V('B23') };
    const subs = []; let rN = null, rS = null;
    for (let r = R0; r < R0 + 200; r++) {
      const a = V('A' + r); if (!a) break;
      const sg = V('P' + r) !== null;           // % sottogruppo presente nella riga prototipo = l'attività ammette sottogruppi
      subs.push({ macro: a, sub: V('B' + r), pctTab: V('F' + r), sg });
      if (sg && rS === null) rS = r; if (!sg && rN === null) rN = r;
    }
    const stOf = r => { const o = {}; 'ABCDEFGHIJKLMNOPQ'.split('').forEach(c => { const g = getCell(sheetXml, c + r); o[c] = g ? g.s : undefined; }); return o; };
    const styles = stOf(rN === null ? R0 : rN), stylesS = rS === null ? styles : stOf(rS);
    const fasi = [];
    for (let r = 42; r <= 49; r++) fasi.push(V('A' + r));
    return { zip, sheetXml, sst, tracciato, tipo, params, subs, styles, stylesS, fasi, hasScheda: getCell(sheetXml, 'B12') !== null };
  }

  /* ---- tipo di appalto di un file (B1 tracciato, B2 tipo) senza leggerlo tutto ---- */
  async function peekTipo(JSZip, buf) {
    const zip = await JSZip.loadAsync(buf);
    let f = zip.file('xl/worksheets/sheet1.xml');
    if (!f) { const k = Object.keys(zip.files).find(n => /^xl\/worksheets\/[^/]+\.xml$/.test(n)); f = k && zip.file(k); }
    if (!f) throw new Error('Il file non contiene fogli di lavoro');
    const xml = await f.async('string');
    const sf = zip.file('xl/sharedStrings.xml'), sst = sf ? parseSST(await sf.async('string')) : [];
    const tracciato = cellValue(xml, 'B1', sst), tipo = cellValue(xml, 'B2', sst);
    if (!/^(LAV|SERV)-/.test(String(tracciato))) throw new Error('Non è un file generato da questo programma (tracciato "' + (tracciato || 'assente') + '").');
    return { tracciato: String(tracciato), tipo: tipo ? String(tipo) : 'LAVORI' };
  }

  /* ---- calcolo (replica le formule del modello) ---- */
  const TOL = 0.000001;
  const gKey = n => String(n || '').trim().toLowerCase();
  function itemsOf(tpl, state, i) {          // righe della sub-attività, con eventuale sottogruppo
    const s = state.subs[i];
    if (s.gruppi) return s.gruppi.flatMap(g => g.righe.map(r => ({ g, r })));
    return (s.righe || []).map(r => ({ g: null, r }));
  }
  function compute(state, tpl) {
    const P = state.params || tpl.params, t = state.testata;
    const base = num(t.base), innov = (t.innov === '' || t.innov == null) ? 1 : num(t.innov);
    const vinc = t.risorse === 'VINCOLATE';
    const B27 = base > 0 ? Math.min(base, P.l1) * P.p1 + Math.max(0, Math.min(base, P.soglia) - P.l1) * P.p2 + Math.max(0, Math.min(base, P.l4) - P.soglia) * P.p3 + Math.max(0, base - P.l4) * P.p4 : 0;
    const B26 = base > 0 ? B27 / base : 0;
    const B28 = B27 * P.quota80;
    const B29 = vinc ? 0 : B27 * (1 - P.quota80) * innov;
    let sI = 0, sJ = 0, sK = 0, sL = 0, sM = 0, errRows = 0;
    const subsOut = state.subs.map((s, i) => {
      const G = num(s.pctEff), items = itemsOf(tpl, state, i), isg = !!s.gruppi;
      const sumQg = {};                                   // somma delle quote per sottogruppo (chiave = nome)
      items.forEach(({ g, r }) => { if (g) { const k = gKey(g.nome); sumQg[k] = (sumQg[k] || 0) + num(r.quota); } });
      const Hs = items.map(({ g, r }) => g ? (G === 0 ? 0 : num(g.pct) * num(r.quota) / G) : num(r.quota));
      const sumH = Hs.reduce((a, x) => a + x, 0), qErr = Math.abs(sumH - 1) > TOL;
      let gErr = false;
      const rows = items.map(({ g, r }, k) => {
        const H = Hs[k], I = G * H, J = I * B28;
        const interno = r.stato === 'Interno';
        const K = interno ? 0 : J, L = interno ? J / (1 + P.oneri) : 0, M = interno ? J - L : 0;
        sI += I; sJ += J; sK += K; sL += L; sM += M;
        let O = '';
        if (qErr) O = 'Quote diverse da 100%';
        else if (g) { if (!String(g.nome || '').trim()) O = 'Sottogruppo senza nome'; else if (Math.abs(sumQg[gKey(g.nome)] - 1) > TOL) O = 'Quote del sottogruppo diverse da 100%'; }
        if (O) { errRows++; gErr = true; }
        return { G, H, I, J, K, L, M, O, P: g ? num(g.pct) : null, Q: g ? num(r.quota) : null };
      });
      const sumP = isg ? (s.gruppi || []).reduce((a, g) => a + num(g.pct), 0) : null;
      return { sumQ: sumH, qErr: qErr || gErr, rows, sumP, sumQg, isg };
    });
    const B30 = sK, B31 = B28 - B30, B32 = vinc ? 0 : B29 + B30 * innov;
    const B33 = sJ, B34 = sL, B35 = sM, B36 = B34 * P.irap;
    const B37 = Math.abs(sI - 1) < TOL ? 'OK' : 'ERRORE: totale % = ' + (Math.round(sI * 10000) / 100) + '%';
    const B38 = errRows === 0 ? 'OK' : 'ERRORE: ' + errRows + ' righe con quote o sottogruppi non validi (colonna O)';
    return { B26, B27, B28, B29, B30, B31, B32, B33, B34, B35, B36, B37, B38, sumPct: sI, subsOut };
  }

  /* ---- generazione del file ---- */
  async function generate(tpl, state) {
    const c = compute(state, tpl), t = state.testata, st = tpl.styles;
    let xml = tpl.sheetXml;
    const setS = (ref, text) => { xml = patchCell(xml, ref, g => (text === '' || text == null) ? cEmpty(ref, g.s) : cStr(ref, g.s, text)); };
    const setN = (ref, n) => { xml = patchCell(xml, ref, g => (n === '' || n == null || isNaN(n)) ? cEmpty(ref, g.s) : cNum(ref, g.s, +n)); };
    setS('B3', t.titolo); setS('B4', t.cig); setS('B5', t.cup);
    setN('B6', t.base === '' ? null : num(t.base)); setS('B7', t.tipologia); setS('B8', t.risorse);
    setN('B9', (t.innov === '' || t.innov == null) ? 1 : num(t.innov)); setS('B10', t.versione);
    const ser = excelSerial(t.data); setN('B11', ser);
    if (tpl.hasScheda) setS('B12', t.scheda || 'BASE');
    if (state.params) {     // parametri "fotografati" nel file riaperto: restano quelli del file
      const Pp = state.params, map = { B14: Pp.soglia, B15: Pp.l1, B16: Pp.p1, B17: Pp.p2, B18: Pp.p3, B19: Pp.l4, B20: Pp.p4, B21: Pp.quota80, B22: Pp.oneri, B23: Pp.irap };
      Object.keys(map).forEach(ref => { xml = patchCell(xml, ref, g => cNum(ref, g.s, map[ref])); });
    }
    // colonna Note (E) del cronoprogramma: se il modello non la ha, si aggiunge copiando lo stile della colonna D
    for (let rr = 41; rr <= 49; rr++) {
      if (!getCell(xml, 'E' + rr)) { const d = getCell(xml, 'D' + rr); if (d) xml = xml.replace(d.raw, d.raw + (rr === 41 ? cStr('E41', d.s, 'Note') : cEmpty('E' + rr, d.s))); }
    }
    if (state.crono) {      // il cronoprogramma si conserva (campi di testo libero)
      state.crono.forEach((row, i) => ['B', 'C', 'D', 'E'].forEach((col, k) => {
        const ref = col + (42 + i), v = row[k];
        xml = patchCell(xml, ref, g => (v === null || v === undefined || v === '') ? cEmpty(ref, g.s) : (typeof v === 'number' ? cNum(ref, g.s, v) : cStr(ref, g.s, v)));
      }));
    }
    ['B26', 'B27', 'B28', 'B29', 'B30', 'B31', 'B32', 'B33', 'B34', 'B35', 'B36', 'B37', 'B38'].forEach(ref => {
      xml = patchCell(xml, ref, g => cFor(ref, g.s, unesc(g.f), c[ref]));
    });
    // tabella: si riscrivono tutte le righe dalla 52 in poi
    const rowsXml = []; let r = R0;
    state.subs.forEach((s, si) => {
      const first = r, ts = tpl.subs[si], sg = !!state.subs[si].gruppi, st = sg ? tpl.stylesS : tpl.styles;
      itemsOf(tpl, state, si).forEach(({ g, r: rg }, ri) => {
        const o = c.subsOut[si].rows[ri];
        const ruolo = sg ? String(g.nome || '').trim() : rg.ruolo;
        const baseChk = 'ABS(SUMIF($B$' + R0 + ':$B$' + RMAX + ',B' + r + ',$H$' + R0 + ':$H$' + RMAX + ')-1)>0.000001';
        const fO = sg
          ? 'IF(' + baseChk + ',"Quote diverse da 100%",IF(D' + r + '="","Sottogruppo senza nome",IF(ABS(SUMIFS($Q$' + R0 + ':$Q$' + RMAX + ',$B$' + R0 + ':$B$' + RMAX + ',B' + r + ',$D$' + R0 + ':$D$' + RMAX + ',D' + r + ')-1)>0.000001,"Quote del sottogruppo diverse da 100%","")))'
          : 'IF(' + baseChk + ',"Quote diverse da 100%","")';
        const cells = [
          cStr('A' + r, st.A, ts.macro), cStr('B' + r, st.B, ts.sub),
          rg.nom ? cStr('C' + r, st.C, rg.nom) : cEmpty('C' + r, st.C),
          ruolo ? cStr('D' + r, st.D, ruolo) : cEmpty('D' + r, st.D),
          cStr('E' + r, st.E, rg.stato),
          cNum('F' + r, st.F, ts.pctTab),
          ri === 0 ? cNum('G' + r, st.G, num(s.pctEff)) : cFor('G' + r, st.F, '$G$' + first, o.G),
          sg ? cFor('H' + r, st.H, 'IF(G' + r + '=0,0,P' + r + '*Q' + r + '/G' + r + ')', o.H) : cNum('H' + r, st.H, num(rg.quota)),
          cFor('I' + r, st.F, 'G' + r + '*H' + r, o.I),
          cFor('J' + r, st.J, 'I' + r + '*$B$28', o.J),
          cFor('K' + r, st.K, 'IF(E' + r + '<>"Interno",J' + r + ',0)', o.K),
          cFor('L' + r, st.L, 'IF(E' + r + '="Interno",J' + r + '/(1+$B$22),0)', o.L),
          cFor('M' + r, st.M, 'IF(E' + r + '="Interno",J' + r + '-L' + r + ',0)', o.M),
          rg.note ? cStr('N' + r, st.N, rg.note) : cEmpty('N' + r, st.N),
          cFor('O' + r, st.O, fO, o.O),
          sg ? cNum('P' + r, st.P, num(g.pct)) : cEmpty('P' + r, st.P),
          sg ? cNum('Q' + r, st.Q, num(rg.quota)) : cEmpty('Q' + r, st.Q)
        ];
        rowsXml.push('<row r="' + r + '">' + cells.join('') + '</row>'); r++;
      });
    });
    const last = r - 1;
    // si tolgono le righe >= 52 del modello e si aggiungono le nuove
    xml = xml.replace(/<row r="(\d+)"[^>]*>[\s\S]*?<\/row>/g, (m, n) => (+n >= R0 ? '' : m));
    xml = xml.replace('</sheetData>', rowsXml.join('') + '</sheetData>');
    xml = xml.replace(/<dimension ref="[^"]*"\/>/, '<dimension ref="A1:Q' + last + '"/>');
    tpl.zip.file('xl/worksheets/sheet1.xml', xml);
    return tpl.zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  }

  /* ---- riapertura di un file già generato ---- */
  const STATI = ['Interno', 'Esterno', 'Non previsto', 'Riduzione art. 18'];
  function parseCells(xml, sst) {
    const out = {}, re = /<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; let m;
    while ((m = re.exec(xml))) {
      const attrs = m[2] || '', inner = m[3] || '';
      const t = (/ t="(\w+)"/.exec(attrs) || [])[1], v = (/<v>([\s\S]*?)<\/v>/.exec(inner) || [])[1];
      let val = null;
      if (t === 'inlineStr') { const x = /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/.exec(inner); val = x ? unesc(x[1]) : ''; }
      else if (v !== undefined && v !== '') {
        if (t === 's') val = sst[+v]; else if (t === 'str' || t === 'e') val = unesc(v); else if (t === 'b') val = v === '1'; else val = parseFloat(v);
      }
      out[m[1]] = val;
    }
    return out;
  }
  async function readFile(JSZip, buf, tpl) {
    const zip = await JSZip.loadAsync(buf);
    let f = zip.file('xl/worksheets/sheet1.xml');
    if (!f) { const k = Object.keys(zip.files).find(n => /^xl\/worksheets\/[^/]+\.xml$/.test(n)); f = k && zip.file(k); }
    if (!f) throw new Error('Il file non contiene fogli di lavoro');
    const xml = await f.async('string');
    const sf = zip.file('xl/sharedStrings.xml'), sst = sf ? parseSST(await sf.async('string')) : [];
    const C = parseCells(xml, sst), V = ref => (C[ref] === undefined ? null : C[ref]);
    const tracciato = V('B1');
    if (!/^(LAV|SERV)-/.test(String(tracciato))) throw new Error('Non è un file generato da questo programma (tracciato "' + (tracciato || 'assente') + '").');
    const tipoF = V('B2') === null ? 'LAVORI' : String(V('B2'));
    if (tpl.tipo && tipoF !== tpl.tipo) throw new Error('Il file è di tipo "' + tipoF + '", il modello caricato è "' + tpl.tipo + '".');
    const notices = [];
    if (V('B12') !== null && !/^(BASE|MC\d+)(-\d+)?$/i.test(String(V('B12')).trim())) notices.push('Scheda "' + V('B12') + '" non valida (BASE oppure MC1, MC2…): impostata BASE.');
    const str = ref => { const v = V(ref); return v === null ? '' : String(v); };
    const st = {
      testata: { titolo: str('B3'), cig: str('B4'), cup: str('B5'), base: V('B6') === null ? '' : num(V('B6')), tipologia: str('B7') || 'LAVORI_aff dir / negoziate', risorse: str('B8') || 'NON VINCOLATE',
        innov: V('B9') === null ? 1 : num(V('B9')), versione: str('B10'), data: serialToIso(V('B11')), scheda: (/^(BASE|MC\d+)(-\d+)?$/i.test(str('B12').trim()) ? str('B12').trim().toUpperCase() : 'BASE') },
      subs: []
    };
    const pv = ['B14', 'B15', 'B16', 'B17', 'B18', 'B19', 'B20', 'B21', 'B22', 'B23'].map(V);
    if (pv.every(x => typeof x === 'number')) {
      const P = { soglia: pv[0], l1: pv[1], p1: pv[2], p2: pv[3], p3: pv[4], l4: pv[5], p4: pv[6], quota80: pv[7], oneri: pv[8], irap: pv[9] };
      st.params = P;
      const diff = Object.keys(P).filter(k => Math.abs(P[k] - tpl.params[k]) > 1e-12);
      if (diff.length) notices.push('I parametri di calcolo del file (' + diff.join(', ') + ') sono diversi da quelli del modello attuale: sono stati mantenuti quelli del file.');
    }
    st.crono = [];
    const cv = v => v === null || v === undefined ? '' : (typeof v === 'number' ? (v > 20000 && v < 100000 ? (d => d.slice(8) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4))(serialToIso(v)) : String(v)) : String(v));
    for (let i = 0; i < 8; i++) st.crono.push(['B', 'C', 'D', 'E'].map(c => cv(V(c + (42 + i)))));
    const rows = [];
    for (let r = Core_R0; r < Core_R0 + 5000; r++) {
      const a = V('A' + r); if (a === null || a === '') break;
      rows.push({ r, sub: String(V('B' + r) || '').trim(), nom: V('C' + r), ruolo: V('D' + r), stato: V('E' + r), G: V('G' + r), H: V('H' + r), note: V('N' + r), P: V('P' + r), Q: V('Q' + r) });
    }
    const known = new Set(tpl.subs.map(x => x.sub));
    const unk = Array.from(new Set(rows.filter(x => !known.has(x.sub)).map(x => x.sub)));
    if (unk.length) notices.push('Righe di sub-attività non riconosciute e NON caricate: ' + unk.join('; ') + '.');
    st.subs = tpl.subs.map(ts => {
      const items = rows.filter(x => x.sub === ts.sub);
      if (!items.length) { notices.push('Attività assente nel file, ripristinata vuota: ' + ts.sub + '.'); return newSub(ts); }
      const pctEff = items[0].G === null ? ts.pctTab : num(items[0].G);
      const stato = x => { const v = String(x.stato || ''); if (STATI.indexOf(v) >= 0) return v; notices.push(ts.sub + ': stato "' + v + '" non valido, impostato "Non previsto".'); return 'Non previsto'; };
      const hasP = items.some(x => x.P !== null && x.P !== undefined);
      if (!ts.sg && !hasP) return { pctEff, righe: items.map(x => ({ nom: x.nom == null ? '' : String(x.nom), ruolo: x.ruolo == null ? '' : String(x.ruolo), stato: stato(x), quota: num(x.H), note: x.note == null ? '' : String(x.note) })) };
      if (!hasP) {                // tracciato 1.0: nessun sottogruppo nel file
        notices.push('Il file ha il tracciato ' + tracciato + ': i collaboratori di "' + ts.sub + '" sono stati caricati in un unico sottogruppo (verifica le percentuali).');
        return { pctEff, gruppi: [{ nome: 'Sottogruppo 1', pct: pctEff, righe: items.map(x => ({ nom: x.nom == null ? '' : String(x.nom), stato: stato(x), quota: num(x.H), note: [x.ruolo, x.note].filter(y => y != null && y !== '').join(' - ') })) }] };
      }
      const gruppi = [];
      items.forEach(x => {
        const nome = x.ruolo == null ? '' : String(x.ruolo).trim();
        let g = gruppi.find(y => y.nome.toLowerCase() === nome.toLowerCase());
        if (!g) { g = { nome, pct: num(x.P), righe: [] }; gruppi.push(g); }
        g.righe.push({ nom: x.nom == null ? '' : String(x.nom), stato: stato(x), quota: num(x.Q), note: x.note == null ? '' : String(x.note) });
      });
      return { pctEff, gruppi };
    });
    if (tracciato !== tpl.tracciato) notices.push('Il file ha il tracciato ' + tracciato + ': generandolo di nuovo passerà al tracciato ' + tpl.tracciato + '.');
    return { state: st, notices, tracciato };
  }
  const Core_R0 = R0;
  function newSub(ts) {
    return ts.sg ? { pctEff: ts.pctTab, gruppi: [{ nome: 'Sottogruppo 1', pct: ts.pctTab, righe: [{ nom: '', stato: 'Non previsto', quota: 1, note: '' }] }] }
                 : { pctEff: ts.pctTab, righe: [{ nom: '', ruolo: '', stato: 'Non previsto', quota: 1, note: '' }] };
  }

  /* ---- controllo delle incompatibilità tra funzioni (regole in tabella, modificabili da file) ---- */
  const COLLAUDATORE = 'Collaudatore tecnico-amministrativo', EMETTITORE = 'Emettitore del certificato di regolare esecuzione';
  const SUB_COLLAUDO = 'COLLAUDATORE TECNICO AMMINISTRATIVO / EMETTITORE DEL CERTIFICATO DI REGOLARE ESECUZIONE';
  const regoleDefault = {
    tipo: 'LAVORI', versione: '2',
    riferimento: 'Regolamento incentivi, art. 3 c. 9 (incompatibilità e conflitto di interessi) e art. 18 (cumulo di funzioni)',
    funzioni: [
      { codice: 'RUP', nome: 'RUP', macro: ['RUP'], escludi_sub: ['RDF FASE DI AFFIDAMENTO'] },
      { codice: 'RDF_AFF', nome: 'RDF fase di affidamento', sub: ['RDF FASE DI AFFIDAMENTO'] },
      { codice: 'CENTRALE', nome: 'Centrale di committenza', macro: ['CENTRALE DI COMMITTENZA'] },
      { codice: 'PROGETTAZIONE', nome: 'Progettazione', macro: ['PROGETTAZIONE'] },
      { codice: 'CSP', nome: 'Coordinatore sicurezza in progettazione', macro: ['COORDINATORE DELLA SICUREZZA IN FASE DI PROGETTAZIONE'] },
      { codice: 'VERIFICA', nome: 'Verifica del progetto', macro: ['VERIFICA DEL PROGETTO'] },
      { codice: 'DL', nome: 'Direzione dei lavori', macro: ['DIREZIONE DEI LAVORI'] },
      { codice: 'CSE', nome: 'Coordinatore sicurezza in esecuzione', macro: ['COORDINAMENTO DELLA SICUREZZA IN FASE DI ESECUZIONE'] },
      { codice: 'COLLAUDO', nome: 'Collaudo / certificato di regolare esecuzione', macro: ['COLLAUDO O CERTIFICATO DI REGOLARE ESECUZIONE'] }
    ],
    tag: [{ tag: 'CRE', sub: SUB_COLLAUDO, ruolo_contiene: 'EMETTITORE' }, { tag: 'CRE', sub: 'COLLABORATORI TECNICI', ruolo_contiene: 'EMETTITORE' }],
    ruoli_sub: { [SUB_COLLAUDO]: [COLLAUDATORE, EMETTITORE], 'COLLABORATORI TECNICI': ['Collaboratore del collaudatore', "Collaboratore dell'emettitore del CRE"] },
    divieti: [
      { id: 'D1', a: 'VERIFICA', contro: ['PROGETTAZIONE', 'DL', 'CSP', 'CSE', 'COLLAUDO'] },
      { id: 'D2', a: 'COLLAUDO', contro: ['PROGETTAZIONE', 'DL', 'CSP', 'CSE'],
        eccezione: { se_solo_tag: 'CRE', e_ha: 'DL', testo: "l'emettitore del certificato di regolare esecuzione (e il suo collaboratore) è ammesso solo insieme al ruolo di direzione dei lavori" } },
      { id: 'D3', a: 'CENTRALE', contro: ['RUP', 'PROGETTAZIONE', 'DL', 'CSP', 'CSE', 'COLLAUDO', 'VERIFICA'] }
    ],
    cumuli: [
      { id: 'C1', a: 'RUP', sub_a: ['RUP'], b: 'VERIFICA', testo: 'cumulo RUP + verifica del progetto: l\'art. 18 c. 2 lett. a) prevede l\'abbattimento del 40% sulla percentuale minore (stato "Riduzione art. 18")' }
    ]
  };
  const regoleServiziDefault = {"tipo": "SERVIZI", "versione": "1", "riferimento": "Regolamento incentivi, art. 3 c. 9 (incompatibilità e conflitto di interessi) e art. 18 (cumulo di funzioni)", "funzioni": [{"codice": "RUP", "nome": "RUP", "macro": ["RUP"], "escludi_sub": ["RDF FASE DI AFFIDAMENTO"]}, {"codice": "RDF_AFF", "nome": "RDF fase di affidamento", "sub": ["RDF FASE DI AFFIDAMENTO"]}, {"codice": "CENTRALE", "nome": "Centrale di committenza", "macro": ["CENTRALE DI COMMITTENZA"]}, {"codice": "PROGETTAZIONE", "nome": "Progettazione", "macro": ["PROGETTAZIONE"]}, {"codice": "DEC", "nome": "Direzione dell'esecuzione del contratto", "macro": ["DIREZIONE ESECUZIONE DEL CONTRATTO"]}, {"codice": "VERIFICA_CONF", "nome": "Verifica di conformità / certificato di regolare esecuzione", "macro": ["VERIFICA DI CONFORMITA / CERTIFICATO REGOLARE ESECUZIONE"]}], "tag": [], "ruoli_sub": {}, "divieti": [{"id": "D1", "a": "CENTRALE", "contro": ["RUP", "PROGETTAZIONE", "DEC", "VERIFICA_CONF"]}], "cumuli": [{"id": "C1", "a": "RUP", "sub_a": ["RUP"], "b": "VERIFICA_CONF", "testo": "cumulo RUP + verifica di conformità: l'art. 18 c. 2 lett. b) prevede l'abbattimento del 40% sulla percentuale minore (stato \"Riduzione art. 18\")"}, {"id": "C2", "a": "RUP", "sub_a": ["RUP"], "b": "DEC", "testo": "cumulo RUP + direttore dell'esecuzione: l'art. 18 c. 2 lett. c) prevede l'abbattimento del 40% sulla percentuale minore (stato \"Riduzione art. 18\")"}, {"id": "C3", "a": "DEC", "b": "VERIFICA_CONF", "testo": "cumulo direttore dell'esecuzione + verifica di conformità: l'art. 18 c. 2 lett. d) prevede l'abbattimento del 40% sulla percentuale minore (stato \"Riduzione art. 18\")"}]};
  const nz = x => String(x || '').toUpperCase().replace(/[’`]/g, "'").replace(/\s*\/\s*/g, ' / ').replace(/\s+/g, ' ').trim();
  function verificaIncompatibilita(state, tpl, regole) {
    regole = regole || regoleDefault;
    const nomeF = c => { const f = regole.funzioni.find(x => x.codice === c); return f ? f.nome : c; };
    const persone = {};
    state.subs.forEach((s, si) => {
      const ts = tpl.subs[si];
      const codes = [];
      regole.funzioni.forEach(f => {
        const inMacro = (f.macro || []).some(m => nz(m) === nz(ts.macro)) && !(f.escludi_sub || []).some(x => nz(x) === nz(ts.sub));
        const inSub = (f.sub || []).some(x => nz(x) === nz(ts.sub));
        if (inMacro || inSub) codes.push(f.codice);
      });
      if (!codes.length) return;
      itemsOf(tpl, state, si).forEach(({ g, r }, k) => {
        const nom = String(r.nom || '').trim();
        if (!nom || (r.stato !== 'Interno' && r.stato !== 'Esterno')) return;
        const tags = new Set();
        (regole.tag || []).forEach(t => { if (nz(t.sub) === nz(ts.sub) && nz(r.ruolo).indexOf(nz(t.ruolo_contiene)) >= 0) tags.add(t.tag); });
        const gi = g ? state.subs[si].gruppi.indexOf(g) : -1;
        const ri = g ? g.righe.indexOf(r) : state.subs[si].righe.indexOf(r);
        const key = nom.toLowerCase().replace(/\s+/g, ' ');
        (persone[key] = persone[key] || { nome: nom, ass: [] }).ass.push({ codes, tags, sub: ts.sub, ref: { si, gi, ri } });
      });
    });
    const violazioni = [], note = [], visti = new Set();
    const di = (p, c, filtro) => p.ass.filter(x => x.codes.indexOf(c) >= 0 && (!filtro || filtro.some(y => nz(y) === nz(x.sub))));
    const elenco = a => Array.from(new Set(a.map(x => x.sub))).map(x => x.length > 30 ? x.slice(0, 28) + '…' : x).join(', ');
    Object.keys(persone).forEach(k => {
      const p = persone[k], F = new Set(); p.ass.forEach(x => x.codes.forEach(c => F.add(c)));
      regole.divieti.forEach(d => {
        d.contro.forEach(B => {
          if (!F.has(d.a) || !F.has(B)) return;
          const key = k + '|' + [d.a, B].sort().join('|'); if (visti.has(key)) return;
          const A1 = di(p, d.a), B1 = di(p, B);
          if (d.eccezione && A1.every(x => x.tags.has(d.eccezione.se_solo_tag)) && F.has(d.eccezione.e_ha)) return;   // eccezione soddisfatta
          visti.add(key);
          violazioni.push({ persona: p.nome, regola: d.id, a: d.a, b: B, refs: A1.concat(B1).map(x => x.ref),
            testo: p.nome + ': ' + nomeF(d.a) + ' (' + elenco(A1) + ') è incompatibile con ' + nomeF(B) + ' (' + elenco(B1) + ')' + (d.eccezione ? ' – ' + d.eccezione.testo : '') + '.' });
        });
      });
      (regole.cumuli || []).forEach(c => {
        if (di(p, c.a, c.sub_a).length && F.has(c.b)) note.push(p.nome + ': ' + c.testo + '.');
      });
    });
    return { violazioni, note, riferimento: regole.riferimento || '' };
  }

  /* ---- stato iniziale (una riga "Non previsto" per ogni sub-attività) ---- */
  function newState(tpl) {
    return {
      testata: { titolo: '', cig: '', cup: '', base: '', tipologia: 'LAVORI_aff dir / negoziate', risorse: 'NON VINCOLATE', innov: 1, versione: 'REV_00', data: '', scheda: 'BASE' },
      subs: tpl.subs.map(s => s.sg
        ? { pctEff: s.pctTab, gruppi: [{ nome: 'Sottogruppo 1', pct: s.pctTab, righe: [{ nom: '', stato: 'Non previsto', quota: 1, note: '' }] }] }
        : { pctEff: s.pctTab, righe: [{ nom: '', ruolo: '', stato: 'Non previsto', quota: 1, note: '' }] }),
      crono: Array.from({ length: 8 }, () => ['', '', '', ''])
    };
  }

  root.Core = { R0, RMAX, readTemplate, readFile, compute, generate, newState, verificaIncompatibilita, regoleDefault, regoleServiziDefault, peekTipo, excelSerial, serialToIso, num, itemsOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Core;
})(typeof window !== 'undefined' ? window : globalThis);

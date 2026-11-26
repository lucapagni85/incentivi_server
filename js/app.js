/* app.js - V.08.01 - schermate, menu e navigazione */
(function () {
  'use strict';
  const H = UI.H;
  const VERSIONE = 'V.08.01';
  const SCHEMA_RICHIESTO = '1.2';
  const STORICO = [
    { v: 'V.08.01', d: '26/11/2026', m: ['Configurazione del progetto Supabase già inserita in config.js; l\'indirizzo del progetto viene accettato anche con /rest/v1/ finale.'] },
    { v: 'V.08.00', d: '26/11/2026', m: [
      'Prima versione dell\'applicazione unica con server (Supabase): accesso con email e password, ruoli lettore e admin, menu e navigazione.',
      'Livello dati separato (js/dati.js) con messaggi d\'errore in italiano; pagina Diagnostica per gli admin.',
      'Generatore, Procedure, Estrattore e Amministrazione sono segnaposto: arrivano negli step successivi. Schema database richiesto: ' + SCHEMA_RICHIESTO + '.'] }
  ];
  const MENU = [['procedure', 'Procedure'], ['generatore', 'Generatore'], ['estrattore', 'Estrattore'], ['amministrazione', 'Amministrazione'], ['diagnostica', 'Diagnostica']];
  const SEGNAPOSTO = {
    procedure: ['Procedure', 'step 3', 'Anagrafica grafica di tutte le procedure salvate: stato di liquidazione, filtri per CIG e macrocartella, modifica del gruppo.'],
    generatore: ['Generatore', 'step 4', 'Creazione e modifica del gruppo di lavoro, cronoprogramma e liquidazione, con salvataggio su database e controllo dei conflitti.'],
    estrattore: ['Estrattore', 'step 5', 'Schede per soggetto, report di liquidazione e vista completa di una procedura, calcolati dai dati del database.'],
    amministrazione: ['Amministrazione', 'step 6', 'Anagrafica soggetti, macrocartelle, utenti e ruoli, eliminazione delle procedure, registro delle modifiche.']
  };
  const root = document.getElementById('root');
  const LOGO = '<img class="logo" src="logo.png" alt="Provincia di Pisa" onerror="this.style.display=\'none\'">';

  /* ---------- schermate di servizio ---------- */
  function schermataSetup(e) {
    const istr = {
      lib: 'Scarica la libreria Supabase e salvala come <b>lib/supabase.js</b>: le istruzioni sono in <b>lib/LEGGIMI.txt</b>.',
      config: 'Apri <b>config.js</b> e inserisci URL del progetto e chiave <b>anon</b> (Supabase, Project Settings, API).',
      chiave: 'Sostituisci la chiave in <b>config.js</b> con quella <b>anon / publishable</b>. Quella segreta non va mai messa nell\'app.'
    };
    root.innerHTML = '<div class="centro"><div class="card"><h1>Configurazione necessaria</h1><div class="msg warn">' + H(e.message) + '</div><p>' + (istr[e.setup] || '') + '</p></div></div>';
  }
  function schermataLogin(msg) {
    root.innerHTML = '<div class="centro"><div class="card">' + LOGO + '<div class="ente">Provincia di Pisa</div><div class="sub">Settore Viabilità trasporti e protezione civile</div>' +
      '<h1>Incentivi funzioni tecniche</h1><div class="sub">Accedi con le tue credenziali</div>' +
      '<form id="fLogin"><label for="lEmail">Email</label><input id="lEmail" type="email" autocomplete="username" required>' +
      '<label for="lPass">Password</label><input id="lPass" type="password" autocomplete="current-password" required>' +
      '<p><button class="btn p" id="lGo" type="submit" style="width:100%">Accedi</button></p></form>' +
      '<div id="lMsg">' + (msg ? '<div class="msg ' + (msg.tipo || 'err') + '">' + H(msg.testo) + '</div>' : '') + '</div>' +
      '<p class="ver" style="text-align:center;margin-bottom:0">' + VERSIONE + '</p></div></div>';
    document.getElementById('lEmail').focus();
    document.getElementById('fLogin').addEventListener('submit', async ev => {
      ev.preventDefault();
      const btn = document.getElementById('lGo'), box = document.getElementById('lMsg'); btn.disabled = true; box.innerHTML = '';
      try {
        const esito = await Auth.accedi(document.getElementById('lEmail').value, document.getElementById('lPass').value);
        if (esito === 'ok') { avviaApp(); return; }
        if (esito === 'senzaprofilo') { schermataSenzaProfilo(); return; }
        box.innerHTML = '<div class="msg err">Accesso non riuscito.</div>';
      } catch (e) { box.innerHTML = '<div class="msg err">' + H(e.message) + '</div>'; }
      btn.disabled = false;
    });
  }
  function schermataSenzaProfilo() {
    root.innerHTML = '<div class="centro"><div class="card"><h1>Utente non abilitato</h1><div class="msg warn">L\'utente <b>' + H(Auth.email) + '</b> non ha un profilo nell\'applicazione. Contatta l\'amministratore.</div>' +
      '<p><button class="btn" id="bEsci">Esci</button></p></div></div>';
    document.getElementById('bEsci').onclick = async () => { await Auth.esci(); schermataLogin(); };
  }

  /* ---------- applicazione ---------- */
  function rottaCorrente() { const r = (location.hash || '').replace(/^#\/?/, '').split('/')[0]; return r; }
  function avviaApp() {
    root.innerHTML = '<header class="top"><div class="hwrap">' + LOGO +
      '<div><div class="ente">Provincia di Pisa</div><div class="settore">Settore Viabilità trasporti e protezione civile</div><div class="htit">Incentivi funzioni tecniche · art. 45 D.Lgs. 36/2023</div></div>' +
      '<div class="hdx"><div><b>' + H(Auth.nome()) + '</b> · ' + H(Auth.ruolo()) + '</div><div class="ver">' + VERSIONE + ' <button class="btn sm" id="bStorico">Storico versioni</button> <button class="btn sm" id="bEsci">Esci</button></div></div></div></header>' +
      '<nav class="menu"><div class="in" id="menu"></div></nav><main><div id="storico" class="panel storico" hidden></div><div id="pagina"></div></main>';
    document.getElementById('bEsci').onclick = async () => { await Auth.esci(); location.hash = ''; schermataLogin(); };
    document.getElementById('bStorico').onclick = () => {
      const b = document.getElementById('storico'); b.hidden = !b.hidden;
      if (!b.hidden) b.innerHTML = '<b>Storico delle versioni</b>' + STORICO.map(x => '<h4>' + H(x.v) + ' · ' + H(x.d) + '</h4><ul>' + x.m.map(t => '<li>' + H(t) + '</li>').join('') + '</ul>').join('');
    };
    if (!rottaCorrente() || !Auth.puoVedere(rottaCorrente())) location.replace('#/' + Auth.rottaIniziale());
    disegna();
  }
  function disegna() {
    if (!Auth.profilo || !document.getElementById('pagina')) return;
    let r = rottaCorrente();
    if (!Auth.puoVedere(r)) { r = Auth.rottaIniziale(); location.replace('#/' + r); return; }
    document.getElementById('menu').innerHTML = MENU.filter(m => Auth.puoVedere(m[0])).map(m => '<a href="#/' + m[0] + '"' + (m[0] === r ? ' class="on"' : '') + '>' + m[1] + '</a>').join('');
    const box = document.getElementById('pagina');
    if (r === 'diagnostica') { paginaDiagnostica(box); return; }
    const s = SEGNAPOSTO[r];
    box.innerHTML = '<div class="panel"><h2>' + H(s[0]) + '</h2><p>' + H(s[2]) + '</p><p class="hint">Sezione in preparazione (' + H(s[1]) + ').</p></div>';
  }

  /* ---------- diagnostica (solo admin) ---------- */
  function cmpVer(a, b) {
    const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; }
    return 0;
  }
  async function paginaDiagnostica(box) {
    box.innerHTML = '<div class="panel"><h2>Diagnostica</h2><p>Verifica in corso…</p></div>';
    const righe = [];
    const add = (liv, et, val) => righe.push({ liv, et, val });
    add('info', 'Applicazione', VERSIONE);
    add('info', 'Utente', Auth.email + ' · ruolo ' + Auth.ruolo());
    try {
      const v = await Dati.versioniSchema(), ultima = v.map(x => x.versione).sort(cmpVer).pop();
      add('ok', 'Connessione al database', 'riuscita');
      if (!ultima) add('err', 'Versione schema', 'nessuna versione registrata: lancia gli script SQL');
      else if (cmpVer(ultima, SCHEMA_RICHIESTO) >= 0) add('ok', 'Versione schema', ultima + ' (richiesta ' + SCHEMA_RICHIESTO + ')');
      else add('err', 'Versione schema', ultima + ': serve la ' + SCHEMA_RICHIESTO + ', lancia gli aggiornamenti SQL');
    } catch (e) { add('err', 'Connessione / versione schema', e.message); }
    for (const [t, et] of [['macrocartelle', 'Macrocartelle'], ['soggetti', 'Soggetti'], ['procedure', 'Procedure'], ['profiles', 'Utenti (profili)'], ['registro_modifiche', 'Registro modifiche']]) {
      try { add('ok', et, (await Dati.conteggio(t)) + ' righe'); } catch (e) { add('err', et, e.message); }
    }
    try {
      const s = await Dati.soggetti(), gen = s.filter(x => x.generico), int = s.filter(x => x.tipo === 'interno'), att = int.filter(x => x.attivo).length;
      add(gen.length === 1 ? 'ok' : 'err', 'Soggetto generico "Esterno"', gen.length === 1 ? 'presente' : 'trovati ' + gen.length + ' (deve essere 1)');
      add('info', 'Soggetti interni', int.length + ' (attivi ' + att + ')');
    } catch (e) { add('err', 'Soggetti', e.message); }
    try {
      const p = await Dati.elencoProfili(), ad = p.filter(x => x.ruolo === 'admin').length;
      add(ad > 0 ? 'ok' : 'warn', 'Utenti admin', ad + ' su ' + p.length);
    } catch (e) { add('err', 'Profili', e.message); }
    const sim = { ok: '●', err: '●', warn: '●', info: '○' };
    box.innerHTML = '<div class="panel"><h2>Diagnostica</h2><table class="t"><tbody>' + righe.map(r => '<tr><td class="st ' + r.liv + '">' + sim[r.liv] + '</td><td>' + H(r.et) + '</td><td>' + H(r.val) + '</td></tr>').join('') + '</tbody></table>' +
      '<p class="hint">Verde = ok, arancio = da controllare, rosso = errore, grigio = informazione.</p></div>';
  }

  /* ---------- avvio ---------- */
  async function avvio() {
    try { Dati.init(); } catch (e) { schermataSetup(e); return; }
    Dati.onCambio(ev => { if (ev === 'SIGNED_OUT') setTimeout(() => { if (Auth.profilo) { Auth.azzera(); schermataLogin({ tipo: 'warn', testo: 'Sessione terminata: accedi di nuovo.' }); } }, 0); });
    window.addEventListener('hashchange', disegna);
    try {
      const esito = await Auth.carica();
      if (esito === 'ok') avviaApp(); else if (esito === 'senzaprofilo') schermataSenzaProfilo(); else schermataLogin();
    } catch (e) { schermataLogin({ tipo: 'err', testo: e.message }); }
  }
  window.addEventListener('DOMContentLoaded', avvio);
  window.__app = { VERSIONE, SCHEMA_RICHIESTO };
})();

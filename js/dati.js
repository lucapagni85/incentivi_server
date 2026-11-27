/* dati.js - V.09.00
   UNICO file che conosce Supabase. Per passare al server dell'Ente
   si modifica solo questo file (e config.js). */
(function (root) {
  'use strict';
  let sb = null;

  /* ---------- errori del database -> messaggi italiani ---------- */
  function mappa(err) {
    const m = String((err && err.message) || ''), code = String((err && err.code) || '');
    let tipo = 'errore', testo = 'Errore imprevisto: ' + (m || code || 'sconosciuto');
    if (/^CONFLITTO_VERSIONE/.test(m)) { tipo = 'conflitto'; testo = m.replace(/^CONFLITTO_VERSIONE:\s*/, ''); }
    else if (/^PROCEDURA_BLOCCATA/.test(m)) { tipo = 'bloccata'; testo = m.replace(/^PROCEDURA_BLOCCATA:\s*/, ''); }
    else if (/^SOGGETTO_(IN_USO|GENERICO|INESISTENTE|ID_NON_VALIDO)/.test(m)) { tipo = 'soggetto'; testo = m.replace(/^SOGGETTO_\w+:\s*/, ''); }
    else if (code === 'PT403') { tipo = 'permesso'; testo = m || 'Operazione non consentita.'; }
    else if (code === 'PT400') { tipo = 'richiesta'; testo = m || 'Richiesta non valida.'; }
    else if (code === '42501' || /row-level security|permission denied/i.test(m)) { tipo = 'permesso'; testo = 'Non hai i permessi per questa operazione.'; }
    else if (code === '23505') { tipo = 'duplicato'; testo = 'Esiste già un elemento con gli stessi dati (CIG + scheda oppure nome già presente).'; }
    else if (code === '23503') { tipo = 'riferimento'; testo = 'Operazione non possibile: l\'elemento è collegato ad altri dati (per esempio una macrocartella usata da procedure).'; }
    else if (code === '23514') { tipo = 'valore'; testo = 'Valore non ammesso' + (err.details ? ': ' + err.details : '.'); }
    else if (code === 'PGRST301' || /JWT/i.test(m)) { tipo = 'sessione'; testo = 'Sessione scaduta: accedi di nuovo.'; }
    else if (/Failed to fetch|NetworkError|Load failed/i.test(m)) { tipo = 'rete'; testo = 'Server non raggiungibile: controlla la connessione.'; }
    const e = new Error(testo); e.tipo = tipo; e.originale = err; return e;
  }
  async function esegui(promessa) {
    let r;
    try { r = await promessa; } catch (x) { throw mappa(x); }
    if (r.error) throw mappa(r.error);
    return r;
  }

  /* ---------- inizializzazione ---------- */
  function init() {
    if (!root.supabase || !root.supabase.createClient) throw Object.assign(new Error('Libreria Supabase non trovata (lib/supabase.js).'), { setup: 'lib' });
    const c = root.APP_CONFIG || {};
    if (!c.SUPABASE_URL || !c.SUPABASE_ANON_KEY || /INSERISCI/.test(c.SUPABASE_URL + c.SUPABASE_ANON_KEY))
      throw Object.assign(new Error('Configurazione mancante: compila config.js.'), { setup: 'config' });
    c.SUPABASE_URL = String(c.SUPABASE_URL).trim().replace(/\/+$/, '').replace(/\/(rest|auth)\/v1$/, '');   // accetta anche l'indirizzo con /rest/v1/
    if (/^sb_secret_/.test(c.SUPABASE_ANON_KEY)) throw Object.assign(new Error('In config.js c\'è una chiave segreta: va usata solo la chiave anon/publishable.'), { setup: 'chiave' });
    try {
      const p = c.SUPABASE_ANON_KEY.split('.')[1];
      if (p) { const j = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/'))); if (j.role === 'service_role') throw Object.assign(new Error('In config.js c\'è la chiave service_role: va usata solo la chiave anon.'), { setup: 'chiave' }); }
    } catch (x) { if (x.setup) throw x; }
    sb = root.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    return { host: c.SUPABASE_URL.replace(/^https?:\/\//, '') };
  }

  /* ---------- accesso ---------- */
  async function accedi(email, password) {
    let r;
    try { r = await sb.auth.signInWithPassword({ email: String(email).trim(), password }); } catch (x) { throw mappa(x); }
    if (r.error) {
      const m = r.error.message || '';
      const e = new Error(/Invalid login/i.test(m) ? 'Email o password non corretti.' : /not confirmed/i.test(m) ? 'Account non confermato: contatta l\'amministratore.' : mappa(r.error).message);
      e.tipo = 'login'; throw e;
    }
    return r.data;
  }
  async function esci() { try { await sb.auth.signOut(); } catch (x) { /* ignora */ } }
  async function sessione() { const r = await sb.auth.getSession(); return r.data && r.data.session ? r.data.session : null; }
  /* ATTENZIONE: dentro la callback non fare chiamate a Supabase senza setTimeout */
  function onCambio(cb) { sb.auth.onAuthStateChange((ev, s) => cb(ev, s)); }

  /* ---------- profili ---------- */
  async function profilo(id) {
    const r = await esegui(sb.from('profiles').select('id,email,nome,ruolo').eq('id', id).maybeSingle());
    return r.data;
  }
  async function elencoProfili() { return (await esegui(sb.from('profiles').select('id,email,nome,ruolo,created_at').order('email'))).data; }
  async function aggiornaProfilo(id, campi) {
    const c = {}; if ('ruolo' in campi) c.ruolo = campi.ruolo; if ('nome' in campi) c.nome = campi.nome;
    const r = await esegui(sb.from('profiles').update(c).eq('id', id).select());
    if (!r.data || !r.data.length) { const e = new Error('Modifica non consentita (non puoi cambiare il tuo stesso profilo).'); e.tipo = 'permesso'; throw e; }
    return r.data[0];
  }

  /* ---------- macrocartelle ---------- */
  async function macrocartelle() { return (await esegui(sb.from('macrocartelle').select('id,nome').order('nome'))).data; }
  async function creaMacrocartella(nome) { return (await esegui(sb.from('macrocartelle').insert({ nome: String(nome).trim() }).select().single())).data; }
  async function rinominaMacrocartella(id, nome) {
    const r = await esegui(sb.from('macrocartelle').update({ nome: String(nome).trim() }).eq('id', id).select());
    if (!r.data.length) throw Object.assign(new Error('Macrocartella non trovata o permessi insufficienti.'), { tipo: 'permesso' });
    return r.data[0];
  }
  async function eliminaMacrocartella(id) { await esegui(sb.from('macrocartelle').delete().eq('id', id)); }

  /* ---------- soggetti ---------- */
  async function soggetti() { return (await esegui(sb.from('soggetti').select('id,cognome,nome,tipo,codice,generico,attivo').order('cognome').order('nome'))).data; }
  async function creaSoggetto(s) {
    const o = { cognome: String(s.cognome || '').trim(), nome: String(s.nome || '').trim(), tipo: 'interno', attivo: true };
    if (s.codice) o.codice = String(s.codice).trim();
    return (await esegui(sb.from('soggetti').insert(o).select().single())).data;
  }
  async function aggiornaSoggetto(id, campi) {
    const c = {}; ['cognome', 'nome', 'codice', 'attivo'].forEach(k => { if (k in campi) c[k] = campi[k]; });
    const r = await esegui(sb.from('soggetti').update(c).eq('id', id).select());
    if (!r.data.length) throw Object.assign(new Error('Soggetto non trovato o permessi insufficienti.'), { tipo: 'permesso' });
    return r.data[0];
  }
  async function eliminaSoggetto(id) { await esegui(sb.from('soggetti').delete().eq('id', id)); }

  /* ---------- procedure ---------- */
  const COL_ELENCO = 'id,cig,scheda,nome_gruppo,macrocartella_id,tipo_appalto,titolo,cup,base,cre_approvato,perc_liquidabile,perc_liquidata,data_liquidazione,note_liquidazione,sbloccata,versione,updated_at,updated_by_nome,macrocartelle(nome)';
  const CAMPI = ['cig', 'scheda', 'nome_gruppo', 'macrocartella_id', 'tipo_appalto', 'titolo', 'cup', 'base', 'cre_approvato', 'perc_liquidabile', 'perc_liquidata', 'data_liquidazione', 'note_liquidazione', 'dati'];
  async function elencoProcedure() { return (await esegui(sb.from('procedure').select(COL_ELENCO).order('cig').order('scheda'))).data; }
  async function leggiProcedura(id) { return (await esegui(sb.from('procedure').select('*').eq('id', id).single())).data; }
  async function tutteLeProcedure() { return (await esegui(sb.from('procedure').select('*, macrocartelle(nome)').order('cig').order('scheda'))).data; }
  function normalizza(p) {
    const c = {};
    CAMPI.forEach(k => { if (k in p) c[k] = p[k]; });
    ['data_liquidazione', 'macrocartella_id', 'base', 'nome_gruppo', 'titolo', 'cup', 'note_liquidazione'].forEach(k => { if (k in c && (c[k] === '' || c[k] === undefined)) c[k] = null; });
    return c;
  }
  /* Nuova procedura: senza id. Modifica: con id e versione letta (controllo conflitti). */
  async function salvaProcedura(p) {
    const corpo = normalizza(p);
    if (!p.id) return (await esegui(sb.from('procedure').insert(corpo).select().single())).data;
    if (typeof p.versione !== 'number') throw new Error('Versione mancante: ricarica la procedura prima di salvare.');
    corpo.versione = p.versione;
    const r = await esegui(sb.from('procedure').update(corpo).eq('id', p.id).select());
    if (!r.data || !r.data.length) throw Object.assign(new Error('Procedura non trovata o permessi insufficienti.'), { tipo: 'permesso' });
    return r.data[0];
  }
  async function eliminaProcedura(id) { await esegui(sb.from('procedure').delete().eq('id', id)); }
  async function sbloccaProcedura(id, nota) { await esegui(sb.rpc('sblocca_procedura', { p_id: id, p_nota: nota })); }
  async function bloccaProcedura(id, nota) { await esegui(sb.rpc('blocca_procedura', { p_id: id, p_nota: nota || null })); }

  /* ---------- registro modifiche (solo admin) ---------- */
  async function registro(opz) {
    opz = opz || {};
    let q = sb.from('registro_modifiche').select('id,at,utente_nome,operazione,procedura_id,cig,scheda,nota').order('at', { ascending: false }).limit(opz.limite || 100);
    if (opz.proceduraId) q = q.eq('procedura_id', opz.proceduraId);
    return (await esegui(q)).data;
  }
  async function registroDettaglio(id) { return (await esegui(sb.from('registro_modifiche').select('*').eq('id', id).single())).data; }

  /* ---------- diagnostica ---------- */
  async function versioniSchema() { return (await esegui(sb.from('schema_versione').select('versione,descrizione,applicata_il').order('applicata_il'))).data; }
  async function conteggio(tabella) { const r = await esegui(sb.from(tabella).select('*', { count: 'exact', head: true })); return r.count; }

  root.Dati = { init, accedi, esci, sessione, onCambio, profilo, elencoProfili, aggiornaProfilo,
    macrocartelle, creaMacrocartella, rinominaMacrocartella, eliminaMacrocartella,
    soggetti, creaSoggetto, aggiornaSoggetto, eliminaSoggetto,
    elencoProcedure, leggiProcedura, tutteLeProcedure, salvaProcedura, eliminaProcedura, sbloccaProcedura, bloccaProcedura,
    registro, registroDettaglio, versioniSchema, conteggio, _mappa: mappa };
})(typeof window !== 'undefined' ? window : globalThis);

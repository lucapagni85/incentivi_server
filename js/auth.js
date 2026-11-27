/* auth.js - V.09.00 - stato dell'utente e permessi di navigazione.
   Il menu e' una comodita': la protezione vera e' nel database (RLS). */
(function (root) {
  'use strict';
  const ROTTE = {
    procedure: ['admin'], generatore: ['admin'], estrattore: ['admin', 'lettore'],
    amministrazione: ['admin'], diagnostica: ['admin']
  };
  const Auth = {
    email: '', profilo: null, ROTTE,
    ruolo() { return this.profilo ? this.profilo.ruolo : null; },
    isAdmin() { return this.ruolo() === 'admin'; },
    nome() { return this.profilo ? (this.profilo.nome || this.email) : ''; },
    puoVedere(rotta) { return (ROTTE[rotta] || []).indexOf(this.ruolo()) >= 0; },
    rottaIniziale() { return this.isAdmin() ? 'procedure' : 'estrattore'; },
    azzera() { this.email = ''; this.profilo = null; },
    /* Carica il profilo della sessione attiva. Esiti: 'ok' | 'nessuna' | 'senzaprofilo' */
    async carica() {
      const s = await root.Dati.sessione();
      if (!s) return 'nessuna';
      const p = await root.Dati.profilo(s.user.id);
      if (!p) { this.email = s.user.email || ''; this.profilo = null; return 'senzaprofilo'; }
      this.email = s.user.email || p.email || ''; this.profilo = p; return 'ok';
    },
    async accedi(email, password) { await root.Dati.accedi(email, password); return this.carica(); },
    async esci() { await root.Dati.esci(); this.azzera(); }
  };
  root.Auth = Auth;
})(window);

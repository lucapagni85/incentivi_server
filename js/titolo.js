/* titolo.js - V.10.00
   Titolo sintetico: codice COPIATO IDENTICO dall'Estrattore V.07.06 (funzione titoloSintetico e TITOLO_TOGLI).
   Toglie le parti standard (procedura START, CIG, CUP, CUI, CPV, RUP, formule ripetute) e tiene la ditta in coda.
   Le formule da togliere sono in TITOLO_TOGLI: ampliabile. Il titolo completo resta sempre disponibile. */
(function (root) {
  'use strict';
const TITOLO_TOGLI = [   // frasi ricorrenti da eliminare (espressioni regolari, senza distinzione di maiuscole): ampliabile
  /\s+IN GESTIONE (?:ALLA|DELLA) PROVINCIA DI PI-?SA/gi,
  /\s+DELLA PROVINCIA DI PISA(?=\s+AREA|\s*$)/gi
];
function titoloSintetico(orig) {
  let t = String(orig == null ? '' : orig).replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const completo = t;
  let marker = ''; const mm = /^\(\s*(?:MOD|MC)\s*\d+\s*\)\s*/i.exec(t); if (mm) { marker = mm[0].trim() + ' '; t = t.slice(mm[0].length); }
  t = t.replace(/[“”«»"]/g, '');
  /* ditta */
  let ditta = '';
  const FORMA = '(?:S\\.?P\\.?A|S\\.?R\\.?L|S\\.?N\\.?C|S\\.?A\\.?S)\\b';
  const FINE = '(?=\\s+PER\\s|\\s+[-–]\\s+(?!' + FORMA + '|PROTEZIONI CIVILI)|\\s*,|\\s+CON SEDE|\\s+VIA\\s|\\s+P\\.?\\s?IVA|\\s+CF:|\\s+CUP|\\s+CIG|\\s+CUI|\\s+RUP|\\s+IN REGIME|\\s+E\\s+APPROVAZIONE|\\s*\\(|\\s*$)';
  const NOME = '([A-ZÀ-Ü0-9][^]*?)' + FINE;
  const MARCATORI = ['AFFIDATARIO:?', 'AFFIDAMENTO LAVORI A', 'AFFIDAMENTO ALLA DITTA', 'AFFIDAMENTO A DITTA', 'AFFIDAMENTO ALL[\'’]IMPRESA', 'AFFIDAMENTO ALLA', 'AFFIDATI ALL[\'’]IMPRESA', 'AFFIDATI A', 'AGGIUDICAZIONE A', 'ALLA DITTA', 'A DITTA', 'ALL[\'’]IMPRESA', 'IMPRESA'];
  for (const m of MARCATORI) {
    const re = new RegExp('(?:^|[\\s.,;:\\-–])(' + m + ')\\s+' + NOME, 'i');
    const x = re.exec(t);
    if (x) {
      let nome = x[2].replace(/[\s,;:\-–]+$/, '').trim();
      if (!/(?:^|[^A-Za-zÀ-ü])[A-Za-z]\.$/.test(nome)) nome = nome.replace(/\.+$/, '').trim();   // il punto finale resta solo nelle sigle (S.R.L., & C.)
      nome = nome.replace(/^DITTA\s+/i, '');
      if (nome.length >= 3) {
        ditta = nome;
        const dopo = t.slice(x.index + x[0].length).replace(/^\s*[,.;-]?\s*(?:CON SEDE|VIA\b)[^]*?(?=\bRUP\b|\bCIG\b|\bCUP\b|$)/i, ' ');   // indirizzo e sede della ditta
        t = t.slice(0, x.index) + ' ' + dopo; break;
      }
    }
  }
  /* procedura START e simili */
  t = t.replace(/(?:AFFIDAMENTO(?:\s+DIRETTO)?(?:\s+MEDIANTE)?(?:\s+SERVIZIO)?\s+)?(?:MEDIANTE\s+)?(?:PROCEDURA\s+)?START\b\.?:?\s*(?:N\.?\s*)?(?:\d+\s*\/+\s*\d{4})?\s*[:\-–.]?\s*(?:PER\s+)?/gi, ' ');
  /* codici */
  t = t.replace(/\bCUP\s*:?\s*[A-Z]\d\d[A-Z]\d{11}(?:\s+(?:E|-|–)\s+(?:CUP\s*:?\s*)?[A-Z]\d\d[A-Z]\d{11})*/gi, ' ')
       .replace(/\bCUP\s*:?\s*[A-Z0-9]*\d[A-Z0-9]*/gi, ' ')
       .replace(/\bCIG\s*:?\s*[A-Z0-9]{10}\b/gi, ' ')
       .replace(/\bCUI\s*:?\s*[A-Z]\d{15,}/gi, ' ')
       .replace(/\bCPV\s*:?\s*[\d-]+/gi, ' ');
  /* RUP */
  t = t.replace(/\(?\s*\bRUP\b\.?:?\s*(?:(?:GEOM|ING|DOTT|ARCH)\.?\s+)?[A-ZÀ-Ü']{2,}\s+[A-ZÀ-Ü']{2,}\s*\)?/gi, ' ');
  /* formule ricorrenti */
  TITOLO_TOGLI.forEach(r => { t = t.replace(r, ''); });
  /* prefisso AFFIDAMENTO (anche dopo un punto o un trattino) */
  t = t.replace(/(^|[.:\-–]\s+)AFFIDAMENTO\s+PER\s+(?:LA|IL|LO|I|LE|L['’])\s*/gi, '$1')
       .replace(/(^|[.:\-–]\s+)AFFIDAMENTO(?:\s+DIRETTO)?(?:\s+(?:DI|DEL|DEI|PER))?\s+/gi, '$1')
       .replace(/^IN REGIME DI\s+/i, '');
  /* pulizia della punteggiatura */
  t = t.replace(/\s+([.,;:])/g, '$1').replace(/\.{2,}/g, '.').replace(/([.,;:])\s*[-–]\s+/g, '$1 ').replace(/([-–])\s*([-–])/g, '$1').replace(/(?:\s[-–]\s*){2,}/g, ' - ').replace(/\s+/g, ' ')
       .replace(/^[\s\-–,.;:]+/, '').replace(/[\s\-–,.;:]+$/, '').trim();
  if (ditta) t = t + ' · Ditta: ' + ditta;
  if (t.replace(/[^A-Za-zÀ-ü0-9]/g, '').length < 12) return completo;
  return marker + t;
}

  const completo = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  /* vista = 'sint' | 'compl' */
  const mostra = (titolo, vista) => vista === 'compl' ? completo(titolo) : titoloSintetico(titolo);
  root.Titolo = { sintetico: titoloSintetico, completo, mostra };
})(window);

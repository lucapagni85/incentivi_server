# Incentivi funzioni tecniche – applicazione V.08.01 (step 2, config compilata)

Provincia di Pisa · Settore Viabilità, trasporti e protezione civile

## Contenuto
- `index.html` – pagina unica
- `config.js` – URL e chiave **anon** di Supabase (unico file da cambiare per il server dell'Ente)
- `css/app.css` – stile
- `js/dati.js` – livello dati (unico file che conosce Supabase)
- `js/auth.js`, `js/ui.js`, `js/app.js` – accesso, utilità, schermate
- `lib/` – qui va la libreria Supabase (vedi `lib/LEGGIMI.txt`)
- `logo.png` – facoltativo, da aggiungere nella cartella principale

## Messa in funzione
1. Database: schema **1.2** installato (script 01, 02, 03).
2. Scarica `supabase.js` in `lib/` (istruzioni in `lib/LEGGIMI.txt`).
3. `config.js` è già compilato con il progetto di prova. Per un altro progetto inserisci Project URL e chiave **anon / publishable**
   (Supabase > Project Settings > API). **Mai** la chiave `service_role` / `secret`:
   l'app la rifiuta.
4. Apri `index.html` con doppio clic (prova locale) oppure pubblica la cartella su GitHub Pages.
5. Accedi con un utente creato in Supabase (Authentication > Users).
   Admin: Procedure, Generatore, Estrattore, Amministrazione, Diagnostica.
   Lettore: solo Estrattore.
6. Da admin apri **Diagnostica**: deve mostrare connessione riuscita, schema 1.2 e i conteggi.

## Sicurezza
La chiave anon può stare nel codice pubblico: i permessi veri sono nelle regole del database (RLS).
Nel repository non vanno mai chiavi segrete né dati reali.

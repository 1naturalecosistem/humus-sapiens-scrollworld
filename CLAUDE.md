# Guidance per Claude Code / VS Code Agents

## Architettura Progetto (Humus Sapiens)
- Frontend Statico: GitHub Pages (`index.html`) su http://humussapiens.onenaturalecosistem.com/
- Backend API & DB: PHP/MySQL su Register.it (http://onenaturalecosistem.com/)

## Regole di Sviluppo
1. Usa PHP 8+ con PDO e Prepared Statements anti-SQL injection.
2. Inserisci gli header CORS `Access-Control-Allow-Origin: *` nelle API PHP per permettere le chiamate da GitHub Pages.
3. Il frontend deve usare HTML5, CSS responsive integrato e JS Vanilla (Fetch API).
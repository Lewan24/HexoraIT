# Wdrożenie

1. Przygotuj PostgreSQL, prywatny storage i zewnętrzny secret store.
2. Ustaw `HEXORAIT_DB_PASSWORD` oraz `HEXORAIT_JWT_SIGNING_KEY`; nie publikuj `appsettings.Development.json`.
3. Skonfiguruj dokładne adresy reverse proxy w `ReverseProxy:KnownProxies`.
4. Wykonaj migracje EF Core kontrolowanym krokiem wdrożenia.
5. Zbuduj frontend przez `npm ci` i `npm run build`, a następnie uruchom nginx.
6. Podłącz audyt do trwałego append-only/SIEM sinka i wykonaj test odbiorczy.

Przed publikacją wykonaj testy z [test-strategy.md](../testing/test-strategy.md), rotację historycznych sekretów i ręczną kontrolę artefaktów obrazu.

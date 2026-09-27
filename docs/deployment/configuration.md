# Konfiguracja

Backend wymaga connection stringa PostgreSQL, klucza JWT oraz ścieżek prywatnego storage i kluczy Data Protection. Frontend używa `API_BASE_URL` w formacie HTTP(S) albo ścieżki względnej od korzenia.

W produkcji nie włączaj Swaggera, nie używaj przykładowych sekretów, ogranicz CORS do znanych originów i ustaw `ReverseProxy:KnownProxies` na dokładne adresy proxy. `appsettings.Development.json` jest wyłącznie lokalną konfiguracją i nie może trafić do artefaktu.

# HexoraIT Web

Frontend HexoraIT jest aplikacją React 19 + TypeScript 6 budowaną przez Vite 8 i Tailwind CSS 4. Nie używa routingu URL — bieżący ekran jest stanem aplikacji, a dostęp do widoków zależy od sesji i uprawnień pobranych z API.

## Uruchomienie

Z katalogu repozytorium:

```text
npm ci --prefix HexoraITWeb
npm run dev --prefix HexoraITWeb
```

Lokalny serwer domyślnie nasłuchuje na `127.0.0.1:8443`. Adres API jest pobierany z `window.__ENV__.API_BASE_URL` albo konfiguracji developerskiej. Kontener wymaga `HEXORAIT_API_BASE_URL` i generuje `/env.js` przy starcie.

## Weryfikacja

```text
npm test --prefix HexoraITWeb
npm run lint --prefix HexoraITWeb
npm run build --prefix HexoraITWeb
npm audit --prefix HexoraITWeb --audit-level=high
```

Ekrany funkcjonalne są ładowane przez `React.lazy`. ExcelJS i `docx-preview` korzystają z importów dynamicznych i nie powinny wracać do bundla startowego. Test `frontend-hardening.test.mjs` chroni ten kontrakt.

## Struktura

- `src/api/` — centralny klient HTTP, wrappery zasobów i typy kontraktów;
- `src/components/` — ekrany i komponenty UI;
- `src/context/` — sesja, organizacja i stan aplikacyjny;
- `src/i18n/` — polski i angielski katalog tłumaczeń;
- `src/content/` — instrukcja użytkownika dołączana do aplikacji;
- `tests/` — testy kontraktowe, bezpieczeństwa i lokalizacji.

Kontrola uprawnień w UI jest wyłącznie mechanizmem UX. Każda chroniona operacja musi być odrzucona lub zaakceptowana przez backend.

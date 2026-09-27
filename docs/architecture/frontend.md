# Frontend

Frontend jest aplikacją React/Vite. `AuthContext` zarządza sesją, `AppProvider` bieżącą organizacją i stanem aplikacyjnym, a `src/api/http.ts` jest centralnym klientem HTTP. Ekrany funkcjonalne są dzielone przez `React.lazy` i pobierane dopiero po nawigacji; ciężkie biblioteki ExcelJS i `docx-preview` są dodatkowo importowane dopiero po otwarciu odpowiedniego podglądu.

Warstwa HTTP obsługuje JSON, tekst, blob i multipart, mapuje Problem Details do `ApiError`, reaguje na utratę sesji oraz składa paginowane listy przez `getAllPages`. Kontrole uprawnień w komponentach są wyłącznie mechanizmem UX — backend pozostaje źródłem autoryzacji.

Podgląd dokumentów jest ograniczony rozmiarem i typem. DOCX renderuje się w sandboxed iframe, a XLSX przez ExcelJS bez wstawiania surowego HTML.

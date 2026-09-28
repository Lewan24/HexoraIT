# Frontend

Frontend jest aplikacją React/Vite. `AuthContext` zarządza sesją, `AppProvider` bieżącą organizacją i stanem aplikacyjnym, a `src/api/http.ts` jest wspólną fasadą transportu. `APP_MODE=http` kieruje operacje do API, natomiast `APP_MODE=mock` dynamicznie ładuje `src/api/mockApi.ts` i wykonuje ten sam kontrakt na wersjonowanym stanie `localStorage`. Komponenty i logika zasobów nie rozróżniają transportu.

Tryb mock jest przeznaczony wyłącznie do publicznej demonstracji. Ma jawne konta user/admin, syntetyczne dane startowe i reset w ustawieniach. Nie oferuje rzeczywistego uwierzytelniania, izolacji danych ani trwałości serwerowej i nie może być traktowany jako wdrożenie produkcyjne.

Ekrany funkcjonalne są dzielone przez `React.lazy` i pobierane dopiero po nawigacji; ciężkie biblioteki ExcelJS i `docx-preview` są dodatkowo importowane dopiero po otwarciu odpowiedniego podglądu. Silnik mock również jest osobnym chunkiem i w trybie HTTP ładuje się dopiero wtedy, gdy byłby potrzebny.

Warstwa HTTP obsługuje JSON, tekst, blob i multipart, mapuje Problem Details do `ApiError`, reaguje na utratę sesji oraz składa paginowane listy przez `getAllPages`. Kontrole uprawnień w komponentach są wyłącznie mechanizmem UX — backend pozostaje źródłem autoryzacji.

Podgląd dokumentów jest ograniczony rozmiarem i typem. DOCX renderuje się w sandboxed iframe, a XLSX przez ExcelJS bez wstawiania surowego HTML.

# Instrukcja w aplikacji

`instrukcja-obslugi.md` jest statyczną kopią instrukcji z katalogu głównego repozytorium, dołączaną do aplikacji przez import Vite `?raw`. Po zmianie dokumentu źródłowego zaktualizuj także tę kopię. Dzięki umieszczeniu w projekcie frontendowym instrukcja działa również przy budowaniu z kontekstu `HexoraITWeb` (Docker).

Widok `UserGuide.tsx` dzieli dokument według nagłówków `##` (rozdziały) i `###` (tematy). Obsługuje użyte w nim akapity, pogrubienia, kod, listy i tabele. Wprowadzenie redakcyjne oraz pierwotny spis treści zastępuje interfejs pomocy. Wersja klienta zawiera osobną ścieżkę z dokumentu oraz krótkie wskazówki dopasowane do konta klienta.

Pomoc jest dostępna dla każdego zalogowanego konta, także bez organizacji lub uprawnień. Dobór treści dla klienta służy czytelności, nie jest zabezpieczeniem poufnych informacji; nie umieszczaj w instrukcji sekretów ani danych organizacji. Widok nie wysyła żądań API i nie zmienia uprawnień.

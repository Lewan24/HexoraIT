# Przewodnik deweloperski

Backend: `dotnet build HexoraITApi/HexoraIT.slnx --no-restore` oraz `dotnet test HexoraITApi/HexoraIT.slnx --no-restore`.

Frontend: `npm ci --prefix HexoraITWeb`, `npm test --prefix HexoraITWeb`, `npm run lint --prefix HexoraITWeb`, `npm run build --prefix HexoraITWeb`.

Nowy endpoint powinien trafić do modułowego pliku Minimal API, używać serwisu aplikacyjnego, mieć jawne wymagania autoryzacji i test negatywny. Zmiana DTO wymaga aktualizacji testu frontendowego i dokumentacji kontraktu.

# Instrukcja administratora

Administrator odpowiada za konfigurację sekretów, PostgreSQL, backupy, migracje, storage, reverse proxy, rotację kluczy i odbiór audytu. Konta i role zarządza się w panelu administracyjnym; aplikacja chroni ostatniego administratora przed blokadą lub degradacją.

Przed aktualizacją wykonaj backup bazy i storage, przetestuj migrację na kopii, wdroż obraz i zweryfikuj health/testy. Po incydencie zabezpiecz logi audytowe, obróć JWT/hasła, unieważnij sesje przez zmianę `SecurityStamp` i sprawdź dostęp cross-tenant.

Skaner malware, MFA, ochrona kluczy Data Protection i trwały sink audytu są wymaganymi uzupełnieniami infrastrukturalnymi, a nie funkcjami obecnego kodu.

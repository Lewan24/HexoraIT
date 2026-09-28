# Uwierzytelnianie

Logowanie zwraca JWT Bearer. Token zawiera identyfikator użytkownika, podstawowe claimy roli i znacznik sesji. Przy każdym użyciu tokenu aplikacja sprawdza aktualność konta i `SecurityStamp`.

Znacznik jest obracany po blokadzie konta, zmianie roli, resecie hasła i zmianie własnego hasła. Hasła są haszowane PBKDF2. Nowe hasła mają długość 15–200 znaków.

Frontend przechowuje token w `localStorage` z awaryjnym magazynem pamięciowym, reaguje na 401 i synchronizuje wylogowanie między kartami. Produkcyjne użycie wymaga rotacji sekretu JWT oraz rozważenia MFA.
# Email confirmation and password reset

Public registration creates an unconfirmed account and does not issue a token. Confirmation and password-reset links use cryptographically random, time-limited, single-use tokens; only their SHA-256 hashes are persisted. Password reset rotates the user's security stamp, invalidating all previously issued access tokens. The reset request response is deliberately identical for existing and unknown accounts to prevent account enumeration.

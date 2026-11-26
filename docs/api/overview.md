# API HexoraIT

API używa tras z prefiksem `/api`. W Dockerze frontend i API działają pod tym samym adresem. Przy [uruchomieniu lokalnym](../../README.md#uruchomienie-lokalne) adresem API jest `https://localhost:7121`.

[OpenAPI 2.0.0 w repozytorium](openapi/v2.json) zawiera metody, parametry i dostępne schematy żądań oraz odpowiedzi. Uruchomione API udostępnia interfejs `/swagger` i dokument `/swagger/v2/swagger.json` w środowiskach `Development` i `Testing`. [Aktualizowanie specyfikacji](../development.md#aktualizacja-openapi)

## Uwierzytelnianie i żądania

- `POST /api/auth/login` przyjmuje JSON z polami `email` i `password`. Token z pola `token` przekaż do chronionych tras w nagłówku `Authorization: Bearer <token>`.
- Dla tras korzystających z bieżącej organizacji wybierz ją przez `POST /api/auth/switch-org` i użyj zwróconego tokenu. Trasy zawierające identyfikator organizacji sprawdzają dostęp do wskazanej organizacji.
- Wysyłaj JSON z nagłówkiem `Content-Type: application/json`. Pliki przekazuj jako `multipart/form-data`, gdy wymaga tego endpoint. Używając `FormData` w przeglądarce, pozostaw tworzenie nagłówka z granicą formularza przeglądarce.
- Typowe kody błędów to `400` dla błędnych danych, `401` dla braku ważnej sesji, `403` dla braku dostępu i `429` po przekroczeniu limitu żądań. Odpowiedź Problem Details może zawierać `traceId` do wyszukania żądania w logach.
- Wiele list przyjmuje parę `page` i `pageSize` i zwraca tablicę z nagłówkami paginacji, m.in. `X-Total-Count`. Wybrane moduły mają własny format strony. Historia audytów przyjmuje `page` i zwraca obiekt `{ items, more }`.

## Historia audytów

Lista `GET /api/organizations/{organizationId}/audit-history` domyślnie pomija archiwum. Parametr `archived=true` zwraca wpisy archiwalne. Aktualizację wysyła się do `POST /api/organizations/{organizationId}/audit-history/{auditId}/updates/{updateId}` jako formularz z polem `status`, opcjonalną notatką `note` i maksymalnie dwoma plikami `files` w formacie PDF lub JSON do 10 MiB każdy. Utworzenie wpisu wymaga także `title` i `auditDate` w formacie `YYYY-MM-DD`. Statusy to `planned`, `in-progress`, `completed` oraz `archived` dla tworzonych aktualizacji. Kolejna aktualizacja z innym statusem przywraca audyt do głównej listy.

## Lista endpointów

Trasy pogrupowano według modułów. Parametry w nawiasach klamrowych trzeba zastąpić odpowiednimi wartościami.

### Konta i administracja

| Metody | Ścieżka |
| --- | --- |
| `GET` | `/api/admin/audit` |
| `GET` | `/api/admin/audit/summary` |
| `GET` | `/api/admin/audit/{id}` |
| `GET`, `PUT` | `/api/admin/email-settings` |
| `POST` | `/api/admin/email-settings/test` |
| `GET`, `POST` | `/api/admin/users` |
| `PATCH` | `/api/admin/users/{id}/block` |
| `POST` | `/api/admin/users/{id}/reset-password` |
| `PATCH` | `/api/admin/users/{id}/role` |
| `POST` | `/api/auth/change-password` |
| `POST` | `/api/auth/confirm-email` |
| `POST` | `/api/auth/forgot-password` |
| `POST` | `/api/auth/login` |
| `GET`, `PUT` | `/api/auth/me` |
| `POST` | `/api/auth/register` |
| `POST` | `/api/auth/reset-password` |
| `POST` | `/api/auth/switch-org` |
| `GET`, `PUT` | `/api/organizations/{organizationId}/notification-settings` |
| `GET` | `/api/version` |
| `GET` | `/api/version/latest` |

### Organizacje i dostęp

| Metody | Ścieżka |
| --- | --- |
| `GET`, `POST` | `/api/organizations` |
| `GET` | `/api/organizations/deleted` |
| `GET`, `PUT`, `DELETE` | `/api/organizations/{id}` |
| `GET` | `/api/organizations/{id}/activity` |
| `GET` | `/api/organizations/{id}/activity/export` |
| `PUT` | `/api/organizations/{id}/activity/settings` |
| `POST` | `/api/organizations/{id}/archive` |
| `GET`, `PUT` | `/api/organizations/{id}/customization` |
| `GET`, `POST` | `/api/organizations/{id}/members` |
| `DELETE` | `/api/organizations/{id}/members/{userId}` |
| `POST` | `/api/organizations/{id}/restore` |
| `POST` | `/api/organizations/{id}/unarchive` |
| `GET`, `POST` | `/api/organizations/{organizationId}/clients` |
| `GET`, `PUT` | `/api/organizations/{organizationId}/clients/{clientId}/permissions` |
| `PUT` | `/api/organizations/{organizationId}/members/{userId}/role` |
| `GET` | `/api/organizations/{organizationId}/permissions` |
| `POST` | `/api/organizations/{organizationId}/reports` |
| `GET` | `/api/organizations/{organizationId}/role-resources/{resource}` |
| `GET`, `POST` | `/api/organizations/{organizationId}/roles` |
| `PUT`, `DELETE` | `/api/organizations/{organizationId}/roles/{roleId}` |
| `POST` | `/api/organizations/{organizationId}/roles/{roleId}/copy` |

### Audyty organizacji

| Metody | Ścieżka |
| --- | --- |
| `GET` | `/api/organizations/{organizationId}/audit-history` |
| `GET` | `/api/organizations/{organizationId}/audit-history/{auditId}/attachments/{attachmentId}` |
| `GET` | `/api/organizations/{organizationId}/audit-history/{auditId}/updates` |
| `POST` | `/api/organizations/{organizationId}/audit-history/{auditId}/updates/{updateId}` |

### Dokumentacja i transfer danych

| Metody | Ścieżka |
| --- | --- |
| `POST` | `/api/audit/client` |
| `GET` | `/api/data-transfer/download` |
| `GET` | `/api/files` |
| `GET`, `POST` | `/api/files/folders` |
| `PATCH`, `DELETE` | `/api/files/folders/{id}` |
| `PATCH` | `/api/files/folders/{id}/move` |
| `POST` | `/api/files/upload` |
| `PATCH`, `DELETE` | `/api/files/{id}` |
| `GET` | `/api/files/{id}/content` |
| `GET` | `/api/files/{id}/download` |
| `PATCH` | `/api/files/{id}/move` |
| `POST` | `/api/files/{id}/replace` |
| `GET`, `POST` | `/api/knowledge` |
| `GET`, `PUT`, `DELETE` | `/api/knowledge/{id}` |
| `PATCH` | `/api/knowledge/{id}/star` |
| `GET` | `/api/organizations/{organizationId}/data-transfer/capabilities` |
| `POST` | `/api/organizations/{organizationId}/data-transfer/export` |
| `POST` | `/api/organizations/{organizationId}/data-transfer/export-download` |
| `POST` | `/api/organizations/{organizationId}/data-transfer/import` |
| `GET` | `/api/organizations/{organizationId}/data-transfer/options` |
| `POST` | `/api/organizations/{organizationId}/data-transfer/preview` |
| `GET` | `/api/organizations/{organizationId}/documentation/items/{section}` |
| `GET` | `/api/organizations/{organizationId}/documentation/options` |
| `POST` | `/api/organizations/{organizationId}/documentation/pdf` |

### Zasoby, sieć i sejf

| Metody | Ścieżka |
| --- | --- |
| `GET`, `POST` | `/api/assets` |
| `GET`, `PUT`, `DELETE` | `/api/assets/{id}` |
| `PATCH` | `/api/assets/{id}/star` |
| `GET`, `PUT` | `/api/diagram` |
| `GET`, `POST` | `/api/groups` |
| `GET`, `PUT`, `DELETE` | `/api/groups/{id}` |
| `GET`, `POST` | `/api/passwords` |
| `POST` | `/api/passwords/import` |
| `PUT`, `DELETE` | `/api/passwords/{id}` |
| `GET` | `/api/passwords/{id}/reveal` |
| `PATCH` | `/api/passwords/{id}/star` |
| `GET`, `POST` | `/api/subnets` |
| `POST` | `/api/subnets/sync-assets` |
| `GET`, `PUT`, `DELETE` | `/api/subnets/{id}` |
| `POST` | `/api/subnets/{subnetId}/ips` |
| `POST` | `/api/subnets/{subnetId}/ips/reserve` |
| `PUT`, `DELETE` | `/api/subnets/{subnetId}/ips/{entryId}` |

### Kontakty, umowy i licencje

| Metody | Ścieżka |
| --- | --- |
| `GET`, `POST` | `/api/contacts` |
| `GET`, `PUT`, `DELETE` | `/api/contacts/{id}` |
| `PATCH` | `/api/contacts/{id}/star` |
| `GET`, `POST` | `/api/contracts` |
| `GET`, `PUT`, `DELETE` | `/api/contracts/{id}` |
| `GET`, `POST` | `/api/contracts/{id}/document` |
| `PATCH` | `/api/contracts/{id}/star` |
| `GET`, `POST` | `/api/licenses` |
| `GET`, `PUT`, `DELETE` | `/api/licenses/{id}` |
| `PATCH` | `/api/licenses/{id}/star` |
| `GET`, `POST` | `/api/warranties` |
| `GET`, `PUT`, `DELETE` | `/api/warranties/{id}` |
| `GET`, `POST` | `/api/warranties/{id}/document` |
| `PATCH` | `/api/warranties/{id}/star` |

### Praca zespołu i operacje IT

| Metody | Ścieżka |
| --- | --- |
| `GET`, `PUT`, `DELETE` | `/api/dashboard-layout` |
| `GET`, `POST` | `/api/incidents` |
| `GET`, `PUT`, `DELETE` | `/api/incidents/{id}` |
| `GET` | `/api/operations/{organizationId}/members` |
| `GET`, `POST` | `/api/operations/{organizationId}/records` |
| `GET`, `PUT` | `/api/operations/{organizationId}/records/{id}` |
| `GET` | `/api/operations/{organizationId}/records/{id}/pdf` |
| `GET` | `/api/operations/{organizationId}/records/{id}/revisions/{revisionId}` |
| `POST` | `/api/operations/{organizationId}/records/{id}/transitions` |
| `GET`, `PUT` | `/api/operations/{organizationId}/settings` |
| `GET` | `/api/operations/{organizationId}/templates` |
| `POST` | `/api/operations/{organizationId}/templates/import` |
| `POST` | `/api/operations/{organizationId}/templates/validate` |
| `POST` | `/api/operations/{organizationId}/templates/{id}/clone` |
| `PUT` | `/api/operations/{organizationId}/templates/{key}/activation` |
| `POST` | `/api/operations/{organizationId}/templates/{key}/versions` |
| `GET`, `POST` | `/api/organizations/{organizationId}/private-notes` |
| `PUT`, `DELETE` | `/api/organizations/{organizationId}/private-notes/{id}` |
| `GET`, `PATCH` | `/api/organizations/{organizationId}/record-order/{resource}` |
| `GET`, `POST` | `/api/plans` |
| `GET`, `PUT`, `DELETE` | `/api/plans/{id}` |
| `GET`, `POST` | `/api/projects` |
| `GET`, `PUT`, `DELETE` | `/api/projects/{id}` |
| `GET`, `POST` | `/api/tasks` |
| `GET`, `PUT`, `DELETE` | `/api/tasks/{id}` |
| `PATCH` | `/api/tasks/{id}/status` |

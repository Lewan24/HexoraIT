# Wyniki testów bezpieczeństwa

Stan po wdrożeniu poczty i powiadomień: 2026-09-28.

| Kontrola | Test/dowód | Wynik |
|---|---|---|
| Unieważnienie JWT | `SecurityPipelineTests.IssuedToken_IsRejectedAfterSecurityStampChanges` | PASS: najpierw 200, po zmianie znacznika 401 Problem Details |
| Anti-automation | `SecurityPipelineTests.LoginRateLimit_ReturnsProblemDetailsAndSecurityHeaders` | PASS: jedenasta próba w oknie daje 429 |
| Nagłówki API | ten sam test hosta | PASS: correlation ID, nosniff, frame deny, referrer policy i CSP |
| Rotacja konta | `AdminControllerTests.SecuritySensitiveAccountChanges_RotateSecurityStamp` | PASS dla blokady, roli i resetu hasła |
| Bezpieczny podgląd XLSX | `file-preview-security.test.mjs` | PASS: brak raw HTML i starego parsera, obecne limity i tekst komórek |
| Walidacja uploadów | `FileUploadSecurityTests` | PASS: sygnatura PDF, odrzucenie podszytego PDF, bezpieczny typ dla HTML i normalizacja nazw |
| Upload dokumentu | `ContractsControllerTests.UploadDocument_RejectsFileWhoseContentDoesNotMatchExtension` | PASS: 400 i brak metadanych dokumentu dla fałszywego PDF |
| Ochrona storage | `LocalFileStorageTests.StorageUsesGeneratedNameAndRejectsTraversal` | PASS: losowy klucz, poprawny odczyt i odrzucenie `../` |
| Zaufane proxy | `SecurityPipelineTests.ForwardedHeaders_DoNotTrustAnyProxyByDefault` | PASS: jeden hop, puste listy proxy i sieci |
| Walidacja kont | `SecurityPipelineTests.AuthenticationEndpoints_RejectInvalidLengthsBeforeActionExecution` | PASS: zbyt długie hasło logowania i zbyt krótkie nowe hasło dają 400 Problem Details przed akcją |
| Limit diagramu | `SecurityPipelineTests.DiagramEndpoint_RejectsOversizedNodeCollection` | PASS: 2001 węzłów daje 400 Problem Details; limit kontraktu 2000 |
| Atrybut kolekcji | `InputValidationTests.CollectionCountAttribute_RejectsMoreThanMaximumItems` | PASS: wspólny walidator odrzuca przekroczenie limitu |
| Elementy tekstowe kolekcji | `InputValidationTests.StringCollectionAttribute_RejectsTooManyOrOversizedValues` | PASS: odrzucana nadmiarowa liczba i zbyt długi pojedynczy element |
| Kolekcja CRUD | `SecurityPipelineTests.AssetEndpoint_RejectsOversizedTagsBeforeDatabaseWrite` | PASS: 101 tagów daje 400 Problem Details i 0 nowych rekordów |
| Paginacja assets | `SecurityPipelineTests.AssetEndpoint_ReturnsStableBoundedPagesWithMetadata` | PASS: strony 200+5, brak duplikatów, total 205, zgodny tryb legacy oraz 400 dla niepełnych/nadmiernych parametrów |
| Paginacja klienta | `pagination-security.test.mjs` | PASS: strony po 200, maksymalnie 100 automatycznych stron; wspólnego klienta używają główne moduły oraz listy plików, organizacji, administracji, ról i prywatnych notatek |
| Minimal API wersji | `SecurityPipelineTests.VersionMinimalApi_PreservesThePublicContract` | PASS: `/api/version` zachowuje JSON i status 200, a trasa `/api/version/latest` jest zarejestrowana |
| Minimal API Auth | `SecurityPipelineTests.AuthMinimalApi_RegistersEveryRouteWithRequiredSecurityMetadata` oraz testy hosta JWT/limitera/walidacji | PASS: dziewięć tras zarejestrowanych; chronione trasy wymagają autoryzacji, a login/rejestracja/potwierdzenie/reset zachowują limiter |
| Tokeny e-mail | `AuthServiceTests.ConfirmEmail_ConsumesTokenAndEnablesLogin`, `PasswordReset_IsEnumerationSafeAndTokenIsSingleUse` | PASS: potwierdzenie wymagane przed loginem; tokeny wygasające, jednokrotne i przechowywane jako SHA-256; reset odporny na enumerację |
| Izolacja odbiorców | `EmailNotificationServiceTests.Notification_OnlyTargetsActiveConfirmedOrganizationMembers` | PASS: wiadomości trafiają wyłącznie do aktywnych, potwierdzonych członków właściwej organizacji |
| Sekrety SMTP i RBAC | `EmailNotificationServiceTests.GlobalSettings_DoesNotExposePasswordAndCanClearIt`, `OrganizationSettings_RequireAdminOrOwner` | PASS: hasło chronione i nieujawniane; preferencje organizacji tylko Owner/Admin; globalne trasy wyłącznie AdminOnly |
| Minimal API assets | `SecurityPipelineTests.AssetMinimalApi_RegistersAllOperationsAsAuthorizedEndpoints`, testy paginacji i walidacji hosta oraz `AssetServiceTests` | PASS: sześć chronionych tras, jawne uprawnienia zasobowe, strony 200+5, limity DTO i zgodne operacje CRUD |
| Minimal API contacts/groups | testy metadanych tras, `ContactServiceTests`, `GroupServiceTests` | PASS: wszystkie trasy chronione, zapis tylko z uprawnieniem modułu/zasobu, zgodne CRUD i paginacja |
| Integralność powiązań grup | `GroupServiceTests.Create_WithAssetFromAnotherOrganization_IsRejectedWithoutSavingGroup` | PASS: ID assetu innej organizacji daje 400, a grupa nie zostaje zapisana |
| Schemat audytu | `SecurityAuditLoggerTests.EventsUseStableIdsCorrelationAndDoNotContainSensitivePayloadFields` | PASS: stabilne EventId 1001/1101/1201/1901, korelacja i brak pól hasła, tokenu, body, query oraz e-maila |
| Audyt odsłonięcia hasła | `PasswordsControllerTests.Reveal_ReturnsTheOriginalPlaintext` | PASS: zdarzenie zawiera tylko typ operacji i identyfikatory użytkownika/zasobu/organizacji |
| Zależności npm | `npm audit --json` | PASS: 0 znanych podatności |
| Translacja zapytań produkcyjnych | `PostgreSqlQueryTranslationTests.ProductionProvider_TranslatesServiceListProjectionsWithoutConnectingToDatabase` | PASS: Npgsql wygenerował SQL dla 17 głównych zapytań; usunięto `enum.ToString()` z `IQueryable` list użytkowników i organizacji |

Najnowszy pomiar: backend **172/172**, frontend **42/42**, lint i produkcyjny build frontendu PASS. `npm audit` oraz `dotnet list package --vulnerable --include-transitive` nie wykazały podatnych pakietów. Podatna testowa biblioteka `SQLitePCLRaw.lib.e_sqlite3` 2.1.11 została zastąpiona wersją 2.1.13.

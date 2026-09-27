# Decyzja: klient API frontendu

Data: 2026-09-27

## Decyzja

Na obecnym etapie nie wprowadzamy generatora typowanego klienta z OpenAPI. Frontend korzysta ze wspólnej warstwy HTTP i jawnych serwisów domenowych, które zachowują istniejące ścieżki, formaty DTO oraz obsługę Problem Details.

## Uzasadnienie

- Backend udostępnia Swagger przez `AddSwaggerGen`, ale kontrakt nie jest jeszcze traktowany jako zamrożony artefakt CI.
- Migracja do Minimal API została zakończona, jednak trwa jeszcze weryfikacja kompletności schematów, statusów błędów i kontraktów multipart.
- Generator na tym etapie wygenerowałby szeroki, trudny do przeglądu diff i zwiększył koszt każdej korekty kontraktu.
- Największe ryzyko bezpieczeństwa dotyczy autoryzacji i walidacji serwerowej, a nie braku typów po stronie klienta; te kontrole pozostają po stronie API.

## Warunki ponownej oceny

Generator można rozważyć po spełnieniu wszystkich warunków:

1. specyfikacja OpenAPI jest publikowana w CI jako wersjonowany artefakt;
2. wszystkie endpointy mają schematy żądań, odpowiedzi i Problem Details, w tym upload/download;
3. test kontraktowy porównuje ścieżki, metody, statusy i pola DTO ze zużyciem frontendu;
4. wybrany generator obsługuje `multipart/form-data`, enumy tekstowe, nullable i daty bez utraty istniejącej semantyki;
5. wygenerowany kod może być odtwarzany deterministycznie bez commitowania sekretów lub artefaktów środowiskowych.

Do tego czasu utrzymujemy ręcznie pisane wrappery w jednym module HTTP i testy kontraktowe. Decyzja nie blokuje późniejszej migracji, ponieważ wrappery są już odseparowane od komponentów widoku.

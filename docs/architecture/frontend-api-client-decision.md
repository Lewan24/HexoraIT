# Decyzja: klient API frontendu

Data: 2026-09-27

## Decyzja

Nie wprowadzamy obecnie generatora typowanego klienta z OpenAPI. Frontend korzysta ze wspólnej warstwy HTTP i jawnych serwisów domenowych, które zachowują istniejące ścieżki, formaty DTO oraz obsługę Problem Details.

## Uzasadnienie

- Kontrakt `v1` jest wersjonowany w `docs/api/openapi/v1.json`, a CI kontroluje jego dryf względem hosta testowego.
- Ręczne wrappery są już scentralizowane, przetestowane dla JSON, blobów, multipart i Problem Details oraz mają niewielki koszt utrzymania.
- Generator wprowadziłby duży dodatkowy artefakt i wymagałby osobnej oceny obsługi upload/download, dat oraz nullable.
- Największe ryzyko bezpieczeństwa dotyczy autoryzacji i walidacji serwerowej, a nie braku typów po stronie klienta; te kontrole pozostają po stronie API.

## Warunki ponownej oceny

Generator można ponownie rozważyć, gdy spełnione będą pozostałe warunki:

1. pełne schematy odpowiedzi i Problem Details są opisane dla wszystkich endpointów, w tym upload/download;
2. test kontraktowy porównuje statusy i pola DTO ze zużyciem frontendu, nie tylko ścieżki i metody;
3. wybrany generator obsługuje `multipart/form-data`, enumy tekstowe, nullable i daty bez utraty istniejącej semantyki;
4. wygenerowany kod może być odtwarzany deterministycznie i daje mierzalną korzyść ponad obecną warstwę `src/api`.

Do tego czasu utrzymujemy ręcznie pisane wrappery w jednym module HTTP i testy kontraktowe. Decyzja nie blokuje późniejszej migracji, ponieważ wrappery są już odseparowane od komponentów widoku.

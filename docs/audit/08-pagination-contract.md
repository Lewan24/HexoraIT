# Kontrakt paginacji list

Stan na 2026-09-27. Kontrakt działa dla 13 głównych list: `assets`, `contacts`, `groups`,
`licenses`, `plans`, `incidents`, `knowledge`, `projects`, `tasks`, `subnets`, `contracts`,
`warranties` i `passwords`. Obejmuje też foldery i pliki eksploratora, aktywne i usunięte
organizacje, członków organizacji oraz użytkowników panelu administracyjnego.
Kontrakt obejmuje ponadto role organizacyjne, opcje zasobów, klientów, ich uprawnienia oraz
prywatne notatki, czyli wszystkie samodzielne endpointy zwracające potencjalnie rosnące listy.

## Kontrakt HTTP

- Klient stronicowany wysyła zawsze oba parametry: `page` i `pageSize`.
- `page`: 1–10000; `pageSize`: 1–200.
- Odpowiedź zachowuje dotychczasowy kształt tablicy JSON.
- Kolejność jest stabilna po `Id`, zanim zostaną zastosowane `Skip` i `Take`.
- Nagłówki `X-Total-Count`, `X-Page` i `X-Page-Size` opisują stronę i są dostępne przez CORS.
- Podanie tylko jednego parametru jest błędem 400.

## Zgodność

Wywołanie bez parametrów zachowuje dotychczasowy kształt i zwraca maksymalnie 1000 rekordów.
Jeżeli wynik został ograniczony, API emituje `X-Result-Capped: true`. Aktualny frontend używa
wspólnego `http.getAllPages`, pobiera strony po 200 rekordów i składa je w dotychczasową tablicę,
więc komponenty nie wymagają zmiany kontraktu.

Klient automatyczny ma bezpiecznik 100 stron, czyli 20000 rekordów. Po przekroczeniu zwraca
kontrolowany błąd zamiast wykonywać nieograniczoną liczbę żądań.

## Możliwa przyszła ewolucja

Samodzielne listy są objęte kontraktem. Kolekcje zagnieżdżone w większych odpowiedziach,
w szczególności adresy IP wewnątrz strony podsieci, pozostają świadomie bez cichego limitu.
Paginację IP należy wprowadzić dopiero po pomiarze danych i dostosowaniu UX; do tego czasu
zmiana nie jest wymagana do zamknięcia refaktoryzacji.

# Notatki, plany i zadania

Notatki przy hasłach zachowują nowe linie, puste wiersze i odstępy. Długie fragmenty zawijają się w obrębie panelu.

Prywatne notatki mają kompaktowe karty, wyszukiwanie po tytule i treści oraz osobny edytor z podglądem. Pasek formatowania obsługuje pogrubienie, nagłówki, listy, listy zadań i kod. Format treści jest taki sam jak w bazie wiedzy. HTML jest wyświetlany jako tekst, bez wykonywania skryptów. Zamknięcie zmienionej notatki wymaga potwierdzenia odrzucenia zmian. Notatki pozostają dostępne wyłącznie ich autorowi w danej organizacji, a zapis edycji zachowuje indeks kolejności.

Tablica zadań ma trzy kolumny statusów z niezależnym przewijaniem. Zadanie można przeciągnąć za uchwyt myszą lub dotykiem; Escape lub upuszczenie poza kolumną anuluje przeciąganie. Na telefonie można upuścić kartę na zakładkę wybranego statusu. Menu statusu na karcie jest alternatywą dostępną również z klawiatury. Kolejność wewnątrz kolumn nadal wynika z zapisanych indeksów. Wyszukiwanie działa razem z filtrem projektu.

Zmiana statusu jest zapisywana przez `PATCH /api/tasks/{id}/status`. Endpoint przyjmuje wyłącznie status i sprawdza uprawnienia do konkretnego zadania. Pozostałe pola, autorstwo, projekt i indeks nie są nadpisywane. Podczas zapisu kolejne przesunięcie tego zadania jest blokowane. Błąd zapisu zachowuje dotychczasowy status.

Plan można powiązać z zasobami oraz z jedną lub kilkoma podsieciami. API przyjmuje wyłącznie sieci widoczne dla użytkownika w tej samej organizacji. Starsze żądania aktualizacji, które nie przesyłają `subnetIds`, zachowują powiązania; jawna pusta lista je usuwa. Powiązane sieci pojawiają się również w dokumentacji PDF planu.

Sekcja **Ustawienia → O aplikacji** zawiera nazwę HexoraIT, logo, bieżącą wersję z API oraz linki do repozytorium projektu i profilu Lewan24.

Nowa migracja `20261106131456_AddPlanNetworks` dodaje do planów listę powiązanych sieci. Dla istniejących planów jest to pusta lista JSON `[]`. Migracja jest stosowana przez API przy starcie przez istniejący `AppInitializer`.

# Aktualizacja sieci i kolejność wpisów

W sekcji **Sieci → Aktualizuj z zasobów** aplikacja przypisuje zasoby na podstawie ich adresów IP do istniejących podsieci CIDR. Obsługiwane są IPv4 oraz IPv6. Przy nakładających się zakresach wybierany jest najbardziej szczegółowy. Identyczne zakresy, duplikaty IP i kolizje z istniejącymi wpisami są raportowane bez nadpisywania danych.

Nowe wpisy mają oznaczenie **Automatyczny**. Kolejne aktualizacje uaktualniają ich adres, nazwę i przypisanie do podsieci, zachowując identyfikator oraz indeks. Ręczne wpisy, rezerwacje i notatki pozostają zachowane. Zapis edycji wpisu automatycznego przełącza go na zarządzanie ręczne. Aktualizacja niczego nie usuwa: usunięty zasób lub nieprawidłowy adres nie powoduje usunięcia wcześniejszej dokumentacji sieci.

Operacja wymaga odczytu zasobów i sieci oraz zapisu odpowiednich podsieci. Uwzględnia uprawnienia indywidualne, izolację organizacji i kontrolę równoczesnych zmian. Zapis odbywa się w jednej transakcji. W przypadku konfliktu należy odświeżyć dane i ponowić aktualizację. Wynik zawiera liczniki zmian oraz maksymalnie 50 szczegółów problemów.

Przycisk **Ustaw kolejność** otwiera edytor indeksów sekcji. Wartości od 1 do 1000000 określają kolejność rosnącą; puste trafiają na koniec. Można używać odstępów, np. 10, 20, 30, a później wstawić 15. Równe indeksy rozstrzyga stabilny identyfikator rekordu. Jednorazowo można zapisać 500 zmian; wyszukiwanie i stronicowanie obsługują większe kolekcje. Czyszczenie pola usuwa indeks.

Kolejność jest wspólna dla organizacji, z wyjątkiem prywatnych notatek, gdzie dotyczy wyłącznie autora. Obejmuje zasoby, hasła, podsieci, wpisy IP, licencje, kontakty, umowy, plany, incydenty, bazę wiedzy, zadania, projekty, grupy, gwarancje, pliki, foldery i urządzenia diagramu. Nie zmienia technicznych identyfikatorów ani położenia urządzeń na diagramie. Alternatywne sortowanie kolumn w interfejsie nie zmienia zapisanych indeksów.

Raport PDF i jego selektor wpisów korzystają z tej samej zapisanej kolejności; jawne indeksy są widoczne przy tytułach wpisów. Wpisy IP w sekcji podsieci również zachowują kolejność.

## Wdrożenie

Nowa wersja API stosuje przy starcie migrację EF `20261106101910_AddRecordOrderAndNetworkSync` przez istniejący `AppInitializer`. Istniejące rekordy otrzymują pusty indeks, a istniejące wpisy IP pozostają ręczne. Nie uruchamiaj starszego API równocześnie z nowym podczas wdrażania: starsza wersja nie aktualizuje znacznika równoczesnych zmian sieci.

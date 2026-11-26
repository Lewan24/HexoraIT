# Jak używać matrycy wymagań w rzeczywistym audycie

1. **Kwalifikacja podmiotu**: sektor, faktycznie wykonywane usługi, skala zatrudnienia i finansów, grupa kapitałowa, wyjątki, data spełnienia kryteriów. Kwalifikację potwierdza właściciel procesu i prawnik/compliance.
2. **Wersja wymagania**: wskaż konkretny akt i jednostkę redakcyjną. Przed audytem ponownie pobierz aktualny tekst oraz odpowiednie rozporządzenia wykonawcze. `matryca_wymagan.csv` to indeks, nie pełna kopia prawa.
3. **Stosowanie**: dla każdej pozycji oznacz czy dotyczy firmy. Status *ND* zawsze z uzasadnieniem; *NO* to brak oceny, nie zgodność.
4. **Operacjonalizacja**: przygotuj jeden lub kilka testów dla wymagania. Badaj zaprojektowanie, wdrożenie i skuteczność w ustalonym okresie. Wpisz sposób próbkowania i ID dowodów.
5. **Kontekst**: akceptowane odstępstwa są oceniane na podstawie ryzyka; zgodność z obowiązkiem prawnym wymaga spełnienia prawa, a nie samego podpisu akceptacyjnego.
6. **Weryfikacja przez audytora**: oddziel normatywne kryteria certyfikacyjne, obowiązki prawne, wewnętrzną politykę i benchmark.
7. **Wynik**: Z / C / NZ / ND / NO z uzasadnieniem, sporem co do faktów i odpowiedzią audytowanego.
8. **Remediacja**: każda niezgodność ma ownera, datę, mierzalne kryterium zamknięcia i retest.

### Moduły sektorowe do aktywowania (przykłady)

- **Finanse:** DORA i właściwe akty wykonawcze/standardy techniczne, nadzór KNF.
- **Dostawcy cyfrowi / MSP/MSSP:** jeśli należy do kategorii wskazanych, stosuj rozporządzenie 2024/2690 i wskazówki ENISA.
- **Zdrowie / podmioty publiczne / energia / woda / transport:** dodatkowe akty sektorowe, wymagania organów, ograniczenia infrastruktury i bezpieczeństwo fizyczne.
- **Przemysł/OT:** dostęp do linii procesowej z właścicielem safety; nie skanuj automatycznie infrastruktury sterującej.
- **Producent urządzeń z elementami cyfrowymi:** szczególna analiza CRA i etapów stosowania.
- **Aplikacje internetowe i API:** OWASP ASVS oraz testy wg WSTG z odrębnym RoE.

Dokładna kwalifikacja i lista aktów uzupełniających pozostają zadaniem przypisanym do konkretnego audytu. Nie istnieje jedna uniwersalna lista prawnych obowiązków adekwatna dla każdej firmy.

# Dwie fikcyjne karty ustaleń - demonstracja metody

Dane celowo fikcyjne. Nie przenoś ryzyka i oceny do rzeczywistego audytu bez oceny wpływu i dowodów.

## U-001: Zbędna ekspozycja usługi administracyjnej do Internetu

- **Kryterium:** polityka firmy NET-07, wymaganie ograniczenia powierzchni ataku, CIS Controls v8.1 jako pomocniczy benchmark.
- **Metoda i próba:** przegląd reguł firewalla z dnia [data], porównanie do rejestru usług publicznych, potwierdzenie z właścicielem usługi. Bez aktywnego skanowania.
- **Dowód:** E-012, zredagowany eksport reguły, numer reguły, data, opiekun.
- **Fakt:** ustalono nieuzasadniony port-forward do panelu zarządzania; potrzeba biznesowa nie została potwierdzona.
- **Ryzyko (przykład):** P=4, W=4, R=16/25, wysokie. Wpływ i prawdopodobieństwo wymagają decyzji właściciela biznesowego.
- **Działanie:** zaplanowana zmiana po weryfikacji zależności, usunięcie wystawienia i wymuszenie VPN/ZTNA z MFA. Nie wykonuj zmian w czasie audytu.
- **Kryterium zamknięcia:** nowa zatwierdzona reguła, dowód braku dostępu bez VPN, retest z zatwierdzonego punktu.
- **Owner / termin:** NetOps / [data do ustalenia].
- **Weryfikacja przez właściciela:** [imię, stanowisko, data, komentarz].

## U-002: Brak udokumentowanego testu przywrócenia systemu kluczowego

- **Kryterium:** wewnętrzna polityka BCP-02; przy przetwarzaniu danych osobowych także ocena wymagań art. 32 RODO; NIST CSF 2.0 jako model.
- **Próba:** zebrano raporty harmonogramu kopii oraz protokoły restore z [okres].
- **Dowód:** E-017 raport backupu; E-018 odpowiedź właściciela, że nie ma protokołu odtworzenia.
- **Fakt:** potwierdzono cykliczne backupy, brak wystarczającego dowodu testu odtworzenia; skuteczność odtwarzania pozostaje niepotwierdzona.
- **Ryzyko (przykład):** P=3, W=5, R=15/25, wysokie.
- **Działanie:** przywrócić wybrany backup w izolowanym środowisku w uzgodnionym oknie i sprawdzić RTO/RPO.
- **Kryterium zamknięcia:** podpisany protokół retestu z wynikami, omówione odstępstwa.
- **Owner / termin:** Backup Administrator + właściciel procesu / [data].

## Jak audytor ma bronić wyniku

1. Kryterium jest zapisane i obowiązuje w badanym zakresie.
2. Stan faktyczny wynika z dowodu, a próbka i okres są jawne.
3. Ryzyko oceniono w kontekście danej firmy, z właścicielem.
4. Właściciel otrzymał możliwość przedstawienia kontrdowodu.
5. Naprawę potwierdzono retestem, nie samym oświadczeniem.

/** Odtwarza zestawienia CSV/MD na podstawie assets/audit-data.js.
 * Uruchom z katalogu głównego: node narzedzia/export_references.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root=path.resolve(__dirname,'..');
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/audit-data.js'),'utf8'),sandbox);
const D=sandbox.window.AUDIT_DATA;
const csv=(rows)=>'\uFEFF'+rows.map(r=>r.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(';')).join('\r\n')+'\r\n';
const write=(rel,content)=>fs.writeFileSync(path.join(root,rel),content,'utf8');
const tasks=[['ID','Faza','Etap','Nazwa kontroli/testu','Opis metody','Wymagany dowód','Źródła','Warunek zastosowania','Zgoda osobna','Wynik Z/C/NZ/ND/NO','ID dowodu','Osoba','Data'],
  ...D.stages.flatMap(s=>s.tasks.map(t=>[t.id,s.mode,s.title,t.name,t.action,t.evidence,t.refs,t.applicability,t.permission==='approval'?'TAK':'Nie','','','','']))];
write('referencje/matryca_testow.csv',csv(tasks));
const controls=[['ID','Rodzaj','Kryterium','Zakres stosowania','Weryfikacja','Przykładowy dowód','Ref','Status Z/C/NZ/ND/NO','Dowód','Decyzja compliance'],
  ...D.criteria.map(c=>[c.id,c.type,c.title,c.apply,c.verify,c.evidence,c.source,'','',''])];
write('referencje/matryca_wymagan.csv',csv(controls));
const src=D.sources.map(s=>`| ${s.id} | [${s.title}](${s.url}) | ${s.org} | ${s.type} | ${s.note} |`).join('\n');
write('referencje/zrodla.md',`# Źródła i ślad weryfikacji\n\n**Data sprawdzenia linków i statusu materiałów:** 4 listopada 2026 r.\n\nŹródła pierwotne mają pierwszeństwo przed komentarzami. Przy każdym nowym zleceniu zweryfikuj: wejście w życie zmian, tekst jednolity, nowe rozporządzenia, wykładnię i wymogi sektorowe. Pełne teksty licencjonowanych norm ISO nie zostały dołączone.\n\n| ID | Publikacja | Instytucja | Typ | Uwaga |\n|---|---|---|---|---|\n${src}\n\n## Ważne przypisy i interpretacje\n\n1. **KSC**: nowelizacja Dz.U. 2026 poz. 252 obowiązuje od 03.04.2026. Dla podmiotów objętych nowymi wymogami już w tym dniu obowiązywał szczególny harmonogram. Dla podmiotów objętych później termin ustala się od właściwej daty spełnienia kryteriów; wcześniejsi UOK zachowują szczególny cykl audytu (źródła KSC_TIMES, KSC_OBL, CERT26).\n2. **Formalny audyt podmiotu kluczowego**: termin 03.04.2028 dotyczy podmiotów kluczowych, które wcześniej nie były UOK; dla byłych UOK nie należy przyjmować automatycznego przesunięcia. Co najmniej jeden audyt co trzy lata według szczegółowych reguł ustawy (KSC_TIMES).\n3. **Zgłaszanie poważnych incydentów**: zob. CERT26, w tym różnice dla części podmiotów publicznych, DORA i podmiotów działających w okresie przejściowym. Osobno badaj RODO art. 33-34.\n4. **Rozporządzenie UE 2024/2690** dotyczy wskazanych kategorii cyfrowych, nie wszystkich firm podlegających KSC. ENISA25 jest praktycznym przewodnikiem, a nie nowym prawem.\n5. **ISO 19011:2026** to aktualna edycja; nie używać 2018 jako obowiązującej bez weryfikacji. ISO/IEC 27001:2022 ma Amd 1:2024.\n6. **OWASP**: ASVS 5.0.0 stabilne; WSTG 4.2 stabilne, 5.0 pozostaje w rozwoju na dzień weryfikacji.\n7. **CIS Controls i NIST CSF**: dobre praktyki; ich wykorzystanie nie potwierdza samo w sobie zgodności z żadną konkretną ustawą.\n8. **Dokument normalizacyjny KSC_MAP** opublikowany przez ministerstwo ma charakter pomocniczy i nie stanowi samodzielnego źródła prawa.\n`);
const inventory=[['ID','Kategoria','Nazwa zasobu','Lokalizacja / strefa','IPv4/IPv6 / DNS','Model / wersja','Właściciel IT','Właściciel biznesowy','Krytyczność','Dane','Sposób zarządzania','EOL/EOS','Backup','Monitoring/EDR','Potwierdzono?','Data weryfikacji','ID dowodu']];
write('referencje/inwentarz_aktywow.csv',csv(inventory));
write('referencje/rejestr_dowodow.csv',csv([['ID dowodu','ID testu','Źródło','Właściciel','Zebrano UTC','Metoda pozyskania','Liczba próbek','ID pliku','Skrót SHA-256 (jeśli wymagany)','Klasyfikacja','Repozytorium','Retencja','Recenzent','Uwagi']]));
write('referencje/rejestr_ryzyka.csv',csv([['ID','Ustalenie','Wymaganie','Obserwacja','Dowód','Prawdopodobieństwo 1-5','Wpływ 1-5','Wynik =P*W','Właściciel','Zalecenie','Status','Termin','Wyjątek/kompensacja','Akceptacja','Retest','Uwagi']]));
write('referencje/plan_probkowania.csv',csv([['ID testu','Populacja','Rozmiar populacji','Dobór próby','Rozmiar próby','Okres','Lokalizacje','Właściciel','Wyłączenia','Poziom pewności/ograniczenia','Dowody','Wynik']]));
console.log(`Utworzono ${tasks.length-1} testów, ${controls.length-1} kryteriów i ${D.sources.length} źródeł.`);

# Architektura bezpieczeństwa

Model bezpieczeństwa opiera się na deny-by-default, JWT Bearer, kontroli `SecurityStamp`, członkostwie w organizacji, uprawnieniach modułowych i regułach zasobowych.

Warstwy ochrony obejmują walidację DTO, limity żądań i kolekcji, rate limiting logowania, Problem Details bez sekretów, correlation ID, security headers, bezpieczny storage plików, kontrolę sygnatur uploadów oraz audyt zdarzeń bezpieczeństwa.

Pozostałe ryzyka produkcyjne: rotacja historycznych sekretów, zewnętrzny append-only sink audytu, skaner malware, ochrona kluczy Data Protection at-rest, MFA i formalny odbiór PostgreSQL.

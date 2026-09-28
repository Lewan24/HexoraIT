# Przegląd architektury

System składa się z frontendowego SPA React/Vite, backendu ASP.NET Core 10 Minimal API, PostgreSQL oraz prywatnego storage plików. Uwierzytelnianie wykorzystuje JWT Bearer, a uprawnienia są wyliczane dla użytkownika, organizacji i zasobu.

```mermaid
flowchart LR
  Browser[React SPA] -->|JSON/FormData + Bearer| Api[ASP.NET Core Minimal API]
  Api --> Db[(PostgreSQL)]
  Api --> Files[(Private file storage)]
  Api --> Keys[Data Protection keys]
```

Warstwa `Application` zawiera przypadki użycia, `Domain` encje i DTO, `Infrastructure` dostęp do danych oraz bieżącego użytkownika, a `Api` grupy endpointów funkcjonalnych.

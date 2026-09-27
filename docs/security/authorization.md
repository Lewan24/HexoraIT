# Autoryzacja

Każdy chroniony endpoint wymaga autoryzacji. Polityka roli systemowej jest tylko jedną warstwą; serwisy sprawdzają także aktywne członkostwo, organizację, prawo modułowe i dostęp do konkretnego zasobu.

Weryfikowane są w szczególności scenariusze BOLA/IDOR, cross-tenant assetów, projektów, folderów, dokumentów i reguł klientów. Frontend ukrywa niedostępne akcje dla UX, ale nie zastępuje kontroli backendu.

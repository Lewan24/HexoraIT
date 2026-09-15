# Interface localization

Polish is the default. The login page and Settings → Appearance offer Polish and English. The choice is stored locally under `hexorait.language`; changing language keeps mounted forms and their data intact.

Use `useLocale()` in components to subscribe to language changes and `tr()` for presentation text. Add matching keys to `en.json` and `pl.json`. Translate whole sentences with interpolation, using plural variants for count-dependent wording.

Translate enum labels at rendering sites only. Always give translated `<option>` elements an explicit, untranslated `value`. Keep API requests, responses, IDs, enum constants, comparisons, currencies, user-entered content and custom role names unchanged. Backend error messages are displayed as received; local fallback messages are translated. Use `locale()` for display formatting, never for date or number serialization.

`npm test` checks catalog coverage, interpolation, language selection, search presentation and locale-independent HTTP data. The scripts in `scripts/localize.mjs` and `scripts/finish-localization.mjs` were one-time migration helpers; do not rerun them over the completed implementation.

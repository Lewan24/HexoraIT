import i18n, { useLocale } from '../i18n'

export default function LanguageSwitcher() {
  const { t } = useLocale()
  return (
    <label className="inline-flex items-center gap-2 text-xs text-ink-secondary">
      <span>{t('Language')}</span>
      <select
        aria-label={t('Language')}
        value={i18n.resolvedLanguage}
        onChange={event => { void i18n.changeLanguage(event.target.value) }}
        className="rounded-lg border border-edge-default bg-navy-800 px-2 py-1.5 text-xs text-ink-primary"
      >
        <option value="pl" lang="pl">Polski</option>
        <option value="en" lang="en">English</option>
      </select>
    </label>
  )
}

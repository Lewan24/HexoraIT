import fs from 'node:fs'
import ts from 'typescript'

// One-time migration of presentation sites; never visit API serializers.
for (const name of fs.readdirSync('src/components').filter(n => n.endsWith('.tsx') && n !== 'LanguageSwitcher.tsx')) {
 const file = `src/components/${name}`
 let s = fs.readFileSync(file, 'utf8')
 // Explicit values are essential: option text is otherwise its submitted value.
 s = s.replace(/<option key=\{([a-z])\}>\{\1\}<\/option>/g, '<option key={$1} value={$1}>{tr($1)}</option>')
 s = s.replace(/<option>\{tr\("All"\)\}<\/option>/g, '<option value="All">{tr("All")}</option>')
 s = s.replace(/<option key=\{([ct])\} value=\{\1\}>\{\1\}<\/option>/g, '<option key={$1} value={$1}>{tr($1)}</option>')
 s = s.replace('{p.charAt(0).toUpperCase() + p.slice(1)}', '{tr(PRIORITY_CONFIG[p].label)}')
 s = s.replaceAll("toLocaleString()", "toLocaleString(locale())").replaceAll("toLocaleString('en-US')", "toLocaleString(locale())").replaceAll("toLocaleDateString('en-US',", "toLocaleDateString(locale(),").replaceAll('toLocaleDateString(undefined,', 'toLocaleDateString(locale(),')
 if(s.includes('locale()')) s=s.replace('tr, useLocale', 'tr, useLocale, locale')
 // Translate literal component props at the caller, not arbitrary user data.
 s=s.replace(/\b(label|sub|desc|message|confirmLabel|emptyText)="([^"]+)"/g, (_, p, v)=>`${p}={tr(${JSON.stringify(v)})}`)
 s=s.replaceAll('{card.sub}', '{tr(card.sub)}').replaceAll('{activeSection.desc}', '{tr(activeSection.desc)}')
 if(name==='Settings.tsx') {
  s="import LanguageSwitcher from './LanguageSwitcher'\n"+s
  s=s.replace('desc="Not yet configurable — shown for reference"', 'desc={tr("Choose your interface language")}')
  s=s.replace('tr("Not yet configurable — shown for reference")','tr("Choose your interface language")')
  s=s.replace('<span className="text-xs text-ink-muted">{tr("English (US)")}</span>', '<LanguageSwitcher />')
  s=s.replace('label={r.label} sub={r.sub}', 'label={tr(r.label)} sub={tr(r.sub)}').replaceAll('title={c.name}', 'title={tr(c.name)}').replace('{d}\n', '{tr(d)}\n')
  s=s.replace("desc={`${orgs.length} organization${orgs.length !== 1 ? 's' : ''} configured`}", 'desc={tr("Organizations configured: {{count}}", { count: orgs.length })}')
 }
 if(name==='Login.tsx') {
  s="import LanguageSwitcher from './LanguageSwitcher'\n"+s
  s=s.replace("<div className='flex flex-col items-center'>", "<div className='flex flex-col items-center'>\n          <LanguageSwitcher />")
  s=s.replace('authenticating...', '{tr("Authenticating…")}')
  s=s.replace(/<p className='text-xs'>.*?<\/p>/, '<p className="text-xs">{tr("For a new account or a forgotten password, contact the application administrator.")}</p>')
 }
 if(name==='Tasks.tsx') s=s.replace("activeId === 'all' ? 'All Tasks' : activeId === NO_PROJECT ? 'No Project' : active?.name ?? 'All Tasks'", "activeId === 'all' ? tr('All Tasks') : activeId === NO_PROJECT ? tr('No Project') : active?.name ?? tr('All Tasks')")
 // CSS must never enter a language catalog.
 s=s.replace(/tr\(("@keyframes [^\n]+?")\)/g, '$1')
 fs.writeFileSync(file,s)
}

// Collect literals plus configuration labels, descriptions and enum choices for review.
const keys=new Set()
for(const file of fs.readdirSync('src', {recursive:true}).filter(f=>/\.tsx?$/.test(f))) {
 const s=fs.readFileSync(`src/${file}`,'utf8'), ast=ts.createSourceFile(file,s,99,true)
 function visit(n) {
  if(ts.isCallExpression(n)&&['tr','t'].includes(n.expression.getText(ast))&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0]))keys.add(n.arguments[0].text)
  if(ts.isPropertyAssignment(n)&&['label','desc','sub'].includes(n.name.getText(ast))&&ts.isStringLiteral(n.initializer))keys.add(n.initializer.text)
  ts.forEachChild(n,visit)
 }
 visit(ast)
}
fs.writeFileSync('src/i18n/en.json',JSON.stringify(Object.fromEntries([...keys].sort().map(k=>[k,k])),null,2)+'\n')

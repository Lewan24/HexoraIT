import ts from 'typescript'
import fs from 'node:fs'
import path from 'node:path'
const catalog = new Set()
const files = fs.readdirSync('src/components', {recursive:true}).filter(f=>f.endsWith('.tsx')).map(f=>path.join('src/components',f)).concat('src/App.tsx','src/context/AppProvider.tsx')
const quote = JSON.stringify
for (const file of files) {
 const source=fs.readFileSync(file,'utf8'), ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX), edits=[]
 const add=(node,text)=>edits.push([node.getStart(ast),node.end,text])
 const call=text=>{catalog.add(text);return `tr(${quote(text)})`}
 const literal=n=>ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)
 const transform=n=>{
  if(literal(n) && /[a-zA-Z]/.test(n.text)) return call(n.text)
  if(ts.isConditionalExpression(n)) return `${n.condition.getText(ast)} ? ${transform(n.whenTrue)} : ${transform(n.whenFalse)}`
  if(ts.isTemplateExpression(n)) {
   let key=n.head.text,values=[]
   n.templateSpans.forEach((s,i)=>{key+=`{{value${i+1}}}`+s.literal.text;values.push(`value${i+1}: ${s.expression.getText(ast)}`)})
   catalog.add(key);return `tr(${quote(key)}, { ${values.join(', ')} })`
  }
  return n.getText(ast)
 }
 function visit(n) {
  if(ts.isJsxText(n)) {
   const text=n.text.replace(/\s+/g,' ').trim()
   if(/[a-zA-Z]/.test(text)) {add(n,`${/^\s/.test(n.text)?' ':''}{${call(text)}}${/\s$/.test(n.text)?' ':''}`);return}
  }
  if(ts.isJsxAttribute(n)&&['placeholder','title','aria-label','alt'].includes(n.name.getText(ast))&&n.initializer) {
   const v=ts.isJsxExpression(n.initializer)?n.initializer.expression:n.initializer
   if(v&&(literal(v)||ts.isConditionalExpression(v)||ts.isTemplateExpression(v))) {add(n.initializer,`{${transform(v)}}`);return}
  }
  if(ts.isJsxExpression(n)&&n.expression&& !ts.isJsxAttribute(n.parent)) {
   const v=n.expression
   if(literal(v)||ts.isConditionalExpression(v)&&[v.whenTrue,v.whenFalse].some(literal)) {add(v,transform(v));return}
   if(ts.isPropertyAccessExpression(v)&&v.name.text==='label'&&!/^(r|result|node|data|edge)\./.test(v.getText(ast))) {add(v,`tr(${v.getText(ast)})`);return}
  }
  if(ts.isCallExpression(n)&&/^(toast|setError|alert|confirm|window.confirm)$/.test(n.expression.getText(ast))&&n.arguments[0]) {
   const a=n.arguments[0];if(literal(a)||ts.isTemplateExpression(a)||ts.isConditionalExpression(a)) {add(a,transform(a));return}
  }
  if(ts.isStringLiteral(n)&&['Required','Invalid IP','Name is required'].includes(n.text)){add(n,call(n.text));return}
  ts.forEachChild(n,visit)
 }
 visit(ast)
 if(edits.length){
  // Every component subscribes without remounting forms or resetting state.
  function hooks(n){if(ts.isFunctionDeclaration(n)&&n.name&&/^[A-Z]/.test(n.name.text)&&n.body) edits.push([n.body.getStart(ast)+1,n.body.getStart(ast)+1,'\n  useLocale()']);ts.forEachChild(n,hooks)}
  hooks(ast)
  let out=source;for(const [a,b,t] of edits.sort((a,b)=>b[0]-a[0]))out=out.slice(0,a)+t+out.slice(b)
  const prefix=path.relative(path.dirname(file),'src/i18n').replaceAll('\\','/')
  out=`import { tr${edits.some(e=>e[2].includes('useLocale()'))?', useLocale':''} } from '${prefix.startsWith('.')?prefix:'./'+prefix}'\n`+out
  fs.writeFileSync(file,out)
 }
}
fs.writeFileSync('src/i18n/extracted.json',JSON.stringify([...catalog].sort(),null,2))

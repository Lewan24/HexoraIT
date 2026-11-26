/* Uruchom: node narzedzia/make_checksums.js [--check] */
(async () => {
  const { createHash } = await import('node:crypto');
  const { readFile, readdir, writeFile } = await import('node:fs/promises');
  const path = await import('node:path');
  const root = path.dirname(path.dirname(path.resolve(process.argv[1])));
  const manifest = 'SHA256SUMS.txt';

  async function list(directory) {
    const files = [];
    for (const item of await readdir(path.join(root,directory), {withFileTypes:true})) {
      const relative = directory ? directory+'/'+item.name : item.name;
      if (item.isDirectory()) files.push(...await list(relative));
      else if (item.isFile() && relative!==manifest) files.push(relative);
    }
    return files;
  }

  const lines = ['# CyberAudit Studio 2.2 | SHA-256', '# Każdy plik paczki poza SHA256SUMS.txt', ''];
  for (const file of (await list('')).sort()) {
    const hash = createHash('sha256').update(await readFile(path.join(root,file))).digest('hex');
    lines.push(hash+'  '+file);
  }
  const result = lines.join('\n')+'\n';
  const target = path.join(root,manifest);
  if (process.argv.includes('--check')) {
    if (await readFile(target,'utf8')!==result) throw Error('Sumy kontrolne wymagają aktualizacji.');
    console.log('Sumy kontrolne są poprawne.');
  } else {
    await writeFile(target,result,'utf8');
    console.log('Zapisano '+(lines.length-3)+' sum kontrolnych.');
  }
})().catch(error => {
  console.error(error.message);
  process.exitCode=1;
});

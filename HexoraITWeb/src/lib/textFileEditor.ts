export function openTextEditor(bytes: ArrayBuffer, fileName: string, mimeType: string) {
  const data = new Uint8Array(bytes)
  const bom = data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf
  const original = new TextDecoder('utf-8', { fatal: true }).decode(data)
  if (original.includes('\0')) throw new Error('The file is not valid UTF-8 text.')
  const endings = original.match(/\r\n|\r|\n/g) ?? []
  const defaultEnding = endings[0] ?? '\n'
  return {
    value: original.replace(/\r\n?/g, '\n'),
    validate(value: string) {
      if (fileName.toLowerCase().endsWith('.json')) JSON.parse(value)
    },
    save(value: string) {
      let index = 0
      const restored = value.replace(/\n/g, () => endings[index++] ?? defaultEnding)
      return new Blob([bom ? '\uFEFF' : '', restored], { type: mimeType })
    },
  }
}

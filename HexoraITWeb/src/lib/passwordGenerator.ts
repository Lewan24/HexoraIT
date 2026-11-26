export const CHARACTER_GROUPS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}<>?|:;,.~/',
}

export type CharacterGroup = keyof typeof CHARACTER_GROUPS
export type NumberPosition = 'none' | 'start' | 'end' | 'random'

function randomIndex(size: number): number {
  const buffer = new Uint32Array(1)
  const range = 2 ** 32
  const limit = range - range % size
  let value: number
  do { value = crypto.getRandomValues(buffer)[0]! } while (value >= limit)
  return value % size
}

export function randomPassword(length: number, groups: CharacterGroup[], excluded: string): string {
  if (!Number.isInteger(length) || length < 8 || length > 128)
    throw new Error('Set a password length from 8 to 128.')
  if (!groups.length) throw new Error('Select at least one character group.')
  const blocked = new Set(excluded)
  const pools = groups.map(group => [...CHARACTER_GROUPS[group]].filter(char => !blocked.has(char)).join(''))
  if (pools.some(pool => !pool)) throw new Error('Each selected group must have at least one allowed character.')
  const alphabet = pools.join('')

  // Reject whole candidates that miss a group to sample uniformly from the valid passwords.
  for (;;) {
    const password = Array.from({ length }, () => alphabet.charAt(randomIndex(alphabet.length)))
    if (pools.every(pool => password.some(char => pool.includes(char)))) return password.join('')
  }
}

export function randomPassphrase(dictionary: string[], count: number, separator: string, number: NumberPosition, capitalize = false): string {
  if (dictionary.length !== 7776) throw new Error('The passphrase word list could not be loaded.')
  if (!Number.isInteger(count) || count < 4 || count > 12)
    throw new Error('Select between 4 and 12 words.')
  const words = Array.from({ length: count }, () => {
    const word = dictionary[randomIndex(dictionary.length)]!
    return capitalize ? word.charAt(0).toUpperCase() + word.slice(1) : word
  })
  if (number !== 'none') {
    const position = number === 'start' ? 0 : number === 'end' ? count : randomIndex(count + 1)
    words.splice(position, 0, String(randomIndex(100)).padStart(2, '0'))
  }
  return words.join(separator)
}

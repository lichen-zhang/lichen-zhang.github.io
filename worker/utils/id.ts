export function createId(): string {
  return crypto.randomUUID()
}

export function createWxOrderNo(): string {
  const suffix = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0')
  return `WX${Date.now()}${suffix}`
}

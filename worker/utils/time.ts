export function nowIso(): string {
  return new Date().toISOString()
}

export function isSameUtcDay(a: string | null | undefined, b: Date = new Date()): boolean {
  if (!a) return false
  const dt = new Date(a)
  return (
    dt.getUTCFullYear() === b.getUTCFullYear() &&
    dt.getUTCMonth() === b.getUTCMonth() &&
    dt.getUTCDate() === b.getUTCDate()
  )
}

export function addDaysISO(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

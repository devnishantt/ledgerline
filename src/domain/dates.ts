export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value
}
export function daysBetween(a: string, b: string): number {
  if (!validDate(a) || !validDate(b)) throw new Error('Invalid calendar date')
  return Math.abs(Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86_400_000
}
export function monthOf(value: string): string {
  if (!validDate(value)) throw new Error('Invalid calendar date')
  return value.slice(0,7)
}

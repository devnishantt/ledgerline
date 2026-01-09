import { parseCsv } from './csv'
import { toMinor, currencies, type Currency } from './money'
import { validDate } from './dates'
export type ImportRow = { date: string; amount: number; currency: Currency; description: string; reference: string; externalId: string }
export function referenceKey(value: string): string { return value.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'') }
export function normalizeCsv(text: string): ImportRow[] {
  const [headers,...rows] = parseCsv(text)
  const names = headers.map(h => h.trim().toLowerCase())
  if (new Set(names).size !== names.length) throw new Error('Duplicate column names')
  for (const required of ['date','amount','currency','description']) if (!names.includes(required)) throw new Error(`Missing column: ${required}`)
  if (rows.length === 0 || rows.length > 200) throw new Error('Import must contain 1–200 rows')
  const seen = new Set<string>()
  return rows.map((cells,index) => {
    const n = index + 2
    if (cells.length !== names.length) throw new Error(`Row ${n}: column count does not match header`)
    const get = (name: string) => cells[names.indexOf(name)]?.trim() ?? ''
    const date = get('date'), currency = get('currency').toUpperCase() as Currency
    if (!validDate(date)) throw new Error(`Row ${n}: invalid calendar date`)
    if (!currencies.includes(currency)) throw new Error(`Row ${n}: unsupported currency`)
    const description = get('description'), reference = get('reference'), externalId = get('external_id')
    if (!description || description.length > 500 || reference.length > 200 || externalId.length > 100) throw new Error(`Row ${n}: invalid text field length`)
    if (externalId && seen.has(externalId)) throw new Error(`Row ${n}: duplicate external_id`)
    if (externalId) seen.add(externalId)
    let amount: number
    try { amount = toMinor(get('amount'),currency) } catch (error) { throw new Error(`Row ${n}: ${(error as Error).message}`) }
    return { date, amount, currency, description, reference, externalId }
  })
}

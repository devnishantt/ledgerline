import type { Match, Transaction } from './types'
export function summarize(transactions: Transaction[], matches: Match[]) {
  const approved = matches.filter(m => m.status === 'approved')
  const matched = new Set(approved.flatMap(m => [m.bank_id,m.ledger_id]))
  const totals = new Map<string,{ currency: string; bank: number; ledger: number; difference: number; unmatched: number }>()
  for (const t of transactions) {
    const row = totals.get(t.currency) ?? { currency: t.currency, bank: 0, ledger: 0, difference: 0, unmatched: 0 }
    row[t.side] += t.amount
    if (!matched.has(t.id)) row.unmatched++
    row.difference = row.bank - row.ledger
    totals.set(t.currency,row)
  }
  return { transactions: transactions.length, approved: approved.length, proposed: matches.filter(m => m.status === 'proposed').length, rejected: matches.filter(m => m.status === 'rejected').length, unmatched: transactions.filter(t => !matched.has(t.id)).length, currencies: [...totals.values()].sort((a,b) => a.currency.localeCompare(b.currency)) }
}
export function ageing(date: string, today: string): '0–7 days'|'8–30 days'|'31+ days' {
  const days = Math.max(0,Math.floor((Date.parse(today)-Date.parse(date))/86_400_000))
  if (!Number.isFinite(days)) throw new Error('Invalid ageing date')
  return days <= 7 ? '0–7 days' : days <= 30 ? '8–30 days' : '31+ days'
}

import {test,expect} from 'bun:test'
import {summarize,ageing} from '../src/domain/analytics'
import {transaction,ledger} from './helpers'
import type {Match} from '../src/domain/types'

test("keep currency positions separate", async()=>{
  const s=summarize([transaction(),ledger(),transaction({id:'eur',currency:'EUR',amount:700})],[]);expect(s.currencies).toHaveLength(2);expect(s.currencies.find(c=>c.currency==='EUR')?.bank).toBe(700)
})

test("do not count proposals as approved allocations", async()=>{
  const m={id:'m',bank_id:'bank-1',ledger_id:'ledger-1',status:'proposed'} as Match;const s=summarize([transaction(),ledger()],[m]);expect(s.unmatched).toBe(2);expect(s.proposed).toBe(1);expect(s.approved).toBe(0)
})

test("count both sides of an approved pair as reconciled", async()=>{
  const m={id:'m',bank_id:'bank-1',ledger_id:'ledger-1',status:'approved'} as Match;const s=summarize([transaction(),ledger()],[m]);expect(s.unmatched).toBe(0);expect(s.approved).toBe(1)
})

test("retain rejected pairs as unresolved exposure", async()=>{
  const m={id:'m',bank_id:'bank-1',ledger_id:'ledger-1',status:'rejected'} as Match;expect(summarize([transaction(),ledger()],[m])).toMatchObject({rejected:1,unmatched:2,approved:0})
})

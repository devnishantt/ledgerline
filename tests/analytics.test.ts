import {test,expect} from 'bun:test'
import {summarize,ageing} from '../src/domain/analytics'
import {transaction,ledger} from './helpers'
import type {Match} from '../src/domain/types'

test("keep currency positions separate", async()=>{
  const s=summarize([transaction(),ledger(),transaction({id:'eur',currency:'EUR',amount:700})],[]);expect(s.currencies).toHaveLength(2);expect(s.currencies.find(c=>c.currency==='EUR')?.bank).toBe(700)
})

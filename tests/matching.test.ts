import {test,expect} from 'bun:test'
import {propose,scorePair} from '../src/domain/matching'
import {transaction,ledger,policy} from './helpers'

test("score exact same-day referenced pairs at one hundred", async()=>{
  expect(scorePair(transaction(),ledger(),policy())).toMatchObject({score:100,variance:0})
})

test("reject matching across workspace boundaries", async()=>{
  expect(scorePair(transaction(),ledger({workspace_id:'other'}),policy())).toBeNull()
})

test("reject matching across account boundaries", async()=>{
  expect(scorePair(transaction(),ledger({account_id:'other'}),policy())).toBeNull()
})

test("reject matching across currency boundaries", async()=>{
  expect(scorePair(transaction(),ledger({currency:'EUR'}),policy())).toBeNull()
})

test("require bank-to-ledger direction", async()=>{
  expect(scorePair(transaction({side:'ledger'}),ledger(),policy())).toBeNull();expect(scorePair(transaction(),ledger({side:'bank'}),policy())).toBeNull()
})

test("reject differences outside amount tolerance", async()=>{
  expect(scorePair(transaction(),ledger({amount:9900}),policy({tolerance:99}))).toBeNull()
})

test("accept the exact tolerance boundary with variance sign", async()=>{
  expect(scorePair(transaction(),ledger({amount:9990}),policy({tolerance:10}))).toMatchObject({variance:10,score:80})
})

test("reject dates outside the settlement window", async()=>{
  expect(scorePair(transaction(),ledger({date:'2026-10-05'}),policy())).toBeNull()
})

test("decay score for a one-day settlement gap", async()=>{
  expect(scorePair(transaction(),ledger({date:'2026-10-02'}),policy())).toMatchObject({score:97})
})

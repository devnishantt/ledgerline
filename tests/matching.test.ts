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

test("require aligned references when policy says require", async()=>{
  expect(scorePair(transaction(),ledger({reference:'other'}),policy({reference_mode:'require'}))).toBeNull()
})

test("avoid treating two blank references as aligned", async()=>{
  expect(scorePair(transaction({reference:''}),ledger({reference:''}),policy({reference_mode:'require'}))).toBeNull()
})

test("ignore reference bonuses when policy says ignore", async()=>{
  expect(scorePair(transaction(),ledger(),policy({reference_mode:'ignore'}))).toMatchObject({score:80})
})

test("reject candidates below the minimum policy score", async()=>{
  expect(scorePair(transaction(),ledger({reference:'unknown'}),policy({min_score:90}))).toBeNull()
})

test("return no proposals when one statement side is absent", async()=>{
  expect(propose([transaction()],policy())).toEqual([]);expect(propose([ledger()],policy())).toEqual([])
})

test("mark equal best ledger candidates as ambiguous", async()=>{
  const result=propose([transaction(),ledger(),ledger({id:'ledger-2'})],policy());expect(result).toHaveLength(1);expect(result[0].ambiguous).toBe(true)
})

test("mark competing equal bank candidates as ambiguous", async()=>{
  const result=propose([transaction(),transaction({id:'bank-2'}),ledger()],policy());expect(result).toHaveLength(2);expect(result.every(p=>p.ambiguous)).toBe(true)
})

test("prefer an unambiguous higher-scoring counterparty", async()=>{
  const result=propose([transaction(),ledger(),ledger({id:'ledger-2',date:'2026-10-02'})],policy());expect(result[0]).toMatchObject({ledgerId:'ledger-1',ambiguous:false})
})

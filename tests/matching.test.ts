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

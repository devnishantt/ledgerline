import {test,expect} from 'bun:test'
import {propose,scorePair} from '../src/domain/matching'
import {transaction,ledger,policy} from './helpers'

test("score exact same-day referenced pairs at one hundred", async()=>{
  expect(scorePair(transaction(),ledger(),policy())).toMatchObject({score:100,variance:0})
})

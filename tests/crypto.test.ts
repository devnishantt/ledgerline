import {test,expect} from 'bun:test'
import {canonical,digest,newKey,secretEqual} from '../src/domain/crypto'

test("canonicalize nested object keys while preserving array order", async()=>{
  expect(canonical({z:[2,1],a:{y:2,x:1}})).toBe('{"a":{"x":1,"y":2},"z":[2,1]}')
})

import {test,expect} from 'bun:test'
import {canonical,digest,newKey,secretEqual} from '../src/domain/crypto'

test("canonicalize nested object keys while preserving array order", async()=>{
  expect(canonical({z:[2,1],a:{y:2,x:1}})).toBe('{"a":{"x":1,"y":2},"z":[2,1]}')
})

test("hash the standard SHA-256 empty input vector", async()=>{
  expect(await digest('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
})

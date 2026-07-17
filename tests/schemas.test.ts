import {test,expect} from 'bun:test'
import {workspaceInput,accountInput,keyInput,importInput,ruleInput,runInput,decisionInput,finalizeInput,pageInput} from '../src/domain/schemas'

test("trim workspace names and reject empty names", async()=>{
  expect(workspaceInput.parse({name:'  Finance  '})).toEqual({name:'Finance'});expect(workspaceInput.safeParse({name:' '}).success).toBe(false)
})

test("reject extra authority fields in strict workspace input", async()=>{
  expect(workspaceInput.safeParse({name:'Finance',role:'admin'}).success).toBe(false)
})

test("limit supported account currencies", async()=>{
  expect(accountInput.safeParse({name:'Operating',currency:'BTC'}).success).toBe(false);expect(accountInput.parse({name:'Operating',currency:'JPY'}).institution).toBe('')
})

test("supply bounded default credential expiry", async()=>{
  expect(keyInput.parse({label:'Reviewer',role:'reviewer'}).expiresInDays).toBe(30);expect(keyInput.safeParse({label:'Reviewer',role:'reviewer',expiresInDays:366}).success).toBe(false)
})

test("reject invented credential roles", async()=>{
  expect(keyInput.safeParse({label:'Owner',role:'superadmin'}).success).toBe(false)
})

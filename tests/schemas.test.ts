import {test,expect} from 'bun:test'
import {workspaceInput,accountInput,keyInput,importInput,ruleInput,runInput,decisionInput,finalizeInput,pageInput} from '../src/domain/schemas'

test("trim workspace names and reject empty names", async()=>{
  expect(workspaceInput.parse({name:'  Finance  '})).toEqual({name:'Finance'});expect(workspaceInput.safeParse({name:' '}).success).toBe(false)
})

test("reject extra authority fields in strict workspace input", async()=>{
  expect(workspaceInput.safeParse({name:'Finance',role:'admin'}).success).toBe(false)
})

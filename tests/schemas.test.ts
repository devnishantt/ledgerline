import {test,expect} from 'bun:test'
import {workspaceInput,accountInput,keyInput,importInput,ruleInput,runInput,decisionInput,finalizeInput,pageInput} from '../src/domain/schemas'

test("trim workspace names and reject empty names", async()=>{
  expect(workspaceInput.parse({name:'  Finance  '})).toEqual({name:'Finance'});expect(workspaceInput.safeParse({name:' '}).success).toBe(false)
})

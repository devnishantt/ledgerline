import {test,expect} from 'bun:test'
import {validDate,daysBetween,monthOf} from '../src/domain/dates'

test("accept leap days only in leap years", async()=>{
  expect(validDate('2024-02-29')).toBe(true);expect(validDate('2026-02-29')).toBe(false)
})

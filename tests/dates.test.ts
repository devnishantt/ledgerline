import {test,expect} from 'bun:test'
import {validDate,daysBetween,monthOf} from '../src/domain/dates'

test("accept leap days only in leap years", async()=>{
  expect(validDate('2024-02-29')).toBe(true);expect(validDate('2026-02-29')).toBe(false)
})

test("reject overflow days rather than normalizing them", async()=>{
  expect(validDate('2026-04-31')).toBe(false);expect(validDate('2026-04-30')).toBe(true)
})

test("require padded ISO calendar dates", async()=>{
  expect(validDate('2026-1-01')).toBe(false);expect(validDate('01/01/2026')).toBe(false)
})

test("reject timestamps where dates are required", async()=>{
  expect(validDate('2026-01-01T12:00:00Z')).toBe(false)
})

test("count date windows symmetrically in UTC", async()=>{
  expect(daysBetween('2026-01-01','2026-01-04')).toBe(3);expect(daysBetween('2026-01-04','2026-01-01')).toBe(3)
})

test("cross month and year boundaries exactly", async()=>{
  expect(daysBetween('2025-12-31','2026-01-01')).toBe(1);expect(daysBetween('2026-01-31','2026-02-01')).toBe(1)
})

test("reject invalid dates in date arithmetic", async()=>{
  expect(()=>daysBetween('not-a-date','2026-01-01')).toThrow('Invalid');expect(()=>monthOf('2026-13-01')).toThrow()
})

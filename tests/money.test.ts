import {test,expect} from 'bun:test'
import {toMinor,decimal,formatMoney,exponent} from '../src/domain/money'

test("preserve hundredths without binary float rounding", async()=>{
  expect(toMinor('0.29','USD')).toBe(29); expect(toMinor('1.01','USD')).toBe(101)
})

test("parse signed expenses exactly", async()=>{
  expect(toMinor('-84.50','USD')).toBe(-8450);expect(decimal(-8450,'USD')).toBe('-84.50')
})

test("pad a single decimal digit", async()=>{
  expect(toMinor('12.3','EUR')).toBe(1230);expect(decimal(1230,'EUR')).toBe('12.30')
})

test("support integer yen without scaling", async()=>{
  expect(toMinor('900','JPY')).toBe(900);expect(decimal(900,'JPY')).toBe('900')
})

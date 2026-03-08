import {test,expect} from 'bun:test'
import {toMinor,decimal,formatMoney,exponent} from '../src/domain/money'

test("preserve hundredths without binary float rounding", async()=>{
  expect(toMinor('0.29','USD')).toBe(29); expect(toMinor('1.01','USD')).toBe(101)
})

test("parse signed expenses exactly", async()=>{
  expect(toMinor('-84.50','USD')).toBe(-8450);expect(decimal(-8450,'USD')).toBe('-84.50')
})

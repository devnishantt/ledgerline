import {test,expect} from 'bun:test'
import {toMinor,decimal,formatMoney,exponent} from '../src/domain/money'

test("preserve hundredths without binary float rounding", async()=>{
  expect(toMinor('0.29','USD')).toBe(29); expect(toMinor('1.01','USD')).toBe(101)
})

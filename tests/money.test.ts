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

test("reject fractional yen", async()=>{
  expect(()=>toMinor('1.1','JPY')).toThrow('decimal places')
})

test("reject precision beyond currency exponent", async()=>{
  expect(()=>toMinor('1.001','USD')).toThrow('decimal places')
})

test("reject scientific notation", async()=>{
  expect(()=>toMinor('1e3','USD')).toThrow('plain decimal')
})

test("reject locale thousands separators", async()=>{
  expect(()=>toMinor('1,200.00','USD')).toThrow('plain decimal')
})

test("reject currency symbols in numeric cells", async()=>{
  expect(()=>toMinor('$12.00','USD')).toThrow('plain decimal')
})

test("normalize surrounding whitespace and leading zeros", async()=>{
  expect(toMinor(' 00012.50 ','GBP')).toBe(1250)
})

test("normalize negative zero", async()=>{
  expect(Object.is(toMinor('-0.00','USD'),-0)).toBe(false)
})

test("reject values beyond the supported accounting limit", async()=>{
  expect(()=>toMinor('90000000000.01','USD')).toThrow('limit')
})

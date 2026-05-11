import {test,expect} from 'bun:test'
import {normalizeCsv,referenceKey} from '../src/domain/normalize'

test("normalize decimals and preserve source identity", async()=>{
  const rows=normalizeCsv("date,amount,currency,description,reference,external_id\n2026-10-01,12.50,USD,Invoice settlement,INV-1,ROW-1");expect(rows[0]).toMatchObject({amount:1250,currency:'USD',externalId:'ROW-1',reference:'INV-1'})
})

test("normalize header whitespace and currency case", async()=>{
  expect(normalizeCsv(" Date , Amount , Currency , Description\n2026-10-01,1.00,usd, Payment ")[0]).toMatchObject({amount:100,currency:'USD',description:'Payment'})
})

test("allow missing optional reference columns", async()=>{
  expect(normalizeCsv("date,amount,currency,description\n2026-10-01,1,USD,Payment")[0].reference).toBe('')
})

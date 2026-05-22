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

test("reject duplicate header names", async()=>{
  expect(()=>normalizeCsv("date,amount,currency,description,date\n2026-10-01,1,USD,Payment,x")).toThrow('Duplicate column')
})

test("require all mandatory columns", async()=>{
  expect(()=>normalizeCsv("date,amount,description\n2026-10-01,1,Payment")).toThrow('Missing column: currency')
})

test("reject header-only documents", async()=>{
  expect(()=>normalizeCsv("date,amount,currency,description,reference,external_id\n")).toThrow('1–200')
})

test("enforce the import row count boundary", async()=>{
  const row="2026-10-01,12.50,USD,Invoice settlement,INV-1,ROW-1";expect(normalizeCsv("date,amount,currency,description,reference,external_id\n"+Array.from({length:200},(_,i)=>row.replace('ROW-1','ROW-'+i)).join('\n'))).toHaveLength(200);expect(()=>normalizeCsv("date,amount,currency,description,reference,external_id\n"+Array(201).fill(row).join('\n'))).toThrow('1–200')
})

test("reject rows with mismatched column counts", async()=>{
  expect(()=>normalizeCsv("date,amount,currency,description,reference,external_id\n2026-10-01,12.50,USD,Invoice settlement,INV-1,ROW-1,extra")).toThrow('Row 2: column count')
})

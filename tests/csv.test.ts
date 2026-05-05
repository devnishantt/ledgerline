import {test,expect} from 'bun:test'
import {parseCsv,csvCell,writeCsv} from '../src/domain/csv'

test("read UTF-8 byte-order marks", async()=>{
  expect(parseCsv('﻿a,b
c,d')).toEqual([['a','b'],['c','d']])
})

test("preserve quoted field delimiters", async()=>{
  expect(parseCsv('"a,b",c')).toEqual([['a,b','c']])
})

test("unescape doubled quotes", async()=>{
  expect(parseCsv('"a""b",c')).toEqual([['a"b','c']])
})

test("preserve line breaks inside quoted fields", async()=>{
  expect(parseCsv('"a\nb",c')).toEqual([['a\nb','c']])
})

test("support Windows CRLF row separators", async()=>{
  expect(parseCsv('a,b\r\nc,d\r\n')).toEqual([['a','b'],['c','d']])
})

test("skip blank separator rows", async()=>{
  expect(parseCsv('a,b\n\n\nc,d')).toHaveLength(2)
})

test("keep a trailing empty CSV cell", async()=>{
  expect(parseCsv('a,b,')).toEqual([['a','b','']])
})

test("reject a quote inside unquoted content", async()=>{
  expect(()=>parseCsv('ab"c,d')).toThrow('Unexpected quote')
})

test("reject unterminated quoted fields", async()=>{
  expect(()=>parseCsv('"unfinished')).toThrow('Unterminated')
})

test("reject content after a closing quote", async()=>{
  expect(()=>parseCsv('"a"b,c')).toThrow('closing quote')
})

test("reject empty statement documents", async()=>{
  expect(()=>parseCsv(' \n\r\n')).toThrow('empty')
})

test("bound CSV memory exposure", async()=>{
  expect(()=>parseCsv('a'.repeat(200001))).toThrow('limit')
})

test("quote exported delimiter and quote characters", async()=>{
  expect(csvCell('a,b')).toBe('"a,b"');expect(csvCell('a"b')).toBe('"a""b"')
})

test("neutralize formulas with whitespace prefixes", async()=>{
  for(const input of ['=SUM(A1)',' +1','-2','@cmd','\tcalc'])expect(csvCell(input).startsWith("'")).toBe(true)
})

test("serialize missing export values as blank cells", async()=>{
  expect(csvCell(null)).toBe('');expect(csvCell(undefined)).toBe('')
})

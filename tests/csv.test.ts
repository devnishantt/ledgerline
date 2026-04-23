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

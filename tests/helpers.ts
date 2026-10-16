import { Database as SQLite } from 'bun:sqlite'
import { createApp } from '../src/server/app'
import type { Database,Statement,Value } from '../src/server/db'
import type { Rule,Transaction } from '../src/domain/types'
import { readdirSync,readFileSync } from 'node:fs'
import { sampleBank,sampleLedger } from '../src/client/sample'
export class TestDatabase implements Database {
 readonly raw=new SQLite(':memory:')
 failAt=-1
 private gate:Promise<void>=Promise.resolve()
 constructor(){this.raw.exec('PRAGMA foreign_keys=ON');for(const file of readdirSync(new URL('../migrations/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())this.raw.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'))}
 prepare(sql:string):Statement {
  const create=(params:Value[]):Statement=>({bind:(...values)=>create(values),first:async<T>()=>(this.raw.query(sql).get(...params)??null) as T|null,all:async<T>()=>({results:this.raw.query(sql).all(...params) as T[]}),run:async()=>this.raw.query(sql).run(...params)})
  const statement=create([])
  return Object.assign(statement,{_sql:sql,_params:[]})
 }
 async batch(statements:Statement[]):Promise<unknown[]> {
  const prior=this.gate
  let release!:()=>void
  this.gate=new Promise<void>(resolve=>{release=resolve})
  await prior
  const results:unknown[]=[]
  this.raw.exec('BEGIN')
  try {for(let i=0;i<statements.length;i++){if(this.failAt===i){this.failAt=-1;throw new Error('Injected batch failure')}results.push(await statements[i].run())}this.raw.exec('COMMIT');return results}
  catch(error){this.raw.exec('ROLLBACK');throw error}
  finally{release()}
 }
 close(){this.raw.close()}
}
export const operator='test-only-operator-secret-never-production-42'
export async function fixture(){
 const db=new TestDatabase(),app=createApp()
 const env={DB:db,BOOTSTRAP_TOKEN:operator,ASSETS:{fetch:async()=>new Response('test assets')}}
 let admin=''
 const request=(path:string,method='GET',payload?:unknown,token=admin)=>app.fetch(new Request('http://localhost/api'+path,{method,headers:{Authorization:'Bearer '+token,...(payload!==undefined?{'Content-Type':'application/json'}:{})},...(payload!==undefined?{body:JSON.stringify(payload)}:{})}),env)
 const json=async(path:string,method='GET',payload?:unknown,token=admin):Promise<any>=>{const response=await request(path,method,payload,token);const data=await response.json() as any;if(!response.ok)throw new Error(`${response.status}: ${JSON.stringify(data)}`);return data}
 const workspace=await json('/workspaces','POST',{name:'Test operations'},operator);admin=workspace.apiKey.key
 const key=async(role='reviewer')=>json('/keys','POST',{label:role+' identity',role})
 const account=async(currency='USD',name='Operating account')=>json('/accounts','POST',{name,currency,institution:'Test institution'})
 return {db,app,env,admin,workspace,request,json,key,account,close:()=>db.close()}
}
export async function prepared(){
 const f=await fixture(),account=await f.account()
 for(const [side,csv] of [['bank',sampleBank],['ledger',sampleLedger]])await f.json('/imports','POST',{accountId:account.id,side,csv,filename:side+'.csv'})
 const rule=await f.json('/rules','POST',{accountId:account.id,name:'Settlement matching',tolerance:10,minScore:75})
 const detail=await f.json('/runs','POST',{accountId:account.id,ruleId:rule.id,name:'October close'})
 const reviewer=await f.key('reviewer')
 return {...f,account,rule,detail,reviewer}
}
export const transaction=(overrides:Partial<Transaction>={}):Transaction=>({id:'bank-1',workspace_id:'workspace',account_id:'account',import_id:'import',side:'bank',date:'2026-10-01',amount:10000,currency:'USD',description:'Settlement',reference:'INV-42',external_id:'ROW-1',fingerprint:'hash',created_at:'2026-10-01T00:00:00Z',...overrides})
export const ledger=(overrides:Partial<Transaction>={})=>transaction({id:'ledger-1',side:'ledger',...overrides})
export const policy=(overrides:Partial<Rule>={}):Rule=>({id:'rule',workspace_id:'workspace',account_id:'account',name:'Exact matching',tolerance:0,date_window:3,reference_mode:'prefer',min_score:75,enabled:1,created_at:'2026-10-01T00:00:00Z',...overrides})

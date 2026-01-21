import { Hono } from 'hono'
import { canonical,digest,id,now } from '../domain/crypto'
import { normalizeCsv } from '../domain/normalize'
import { importInput } from '../domain/schemas'
import { body,ensure,Problem,readers,requireRole,type Env } from './context'
import { all,first,insertMany } from './db'
import { account } from './accounts'
import { mutate } from './audit'
export const imports=new Hono<Env>()
imports.get('/',async c=>{const p=requireRole(c,readers);return c.json({items:await all(c.env.DB,'SELECT i.*,a.name AS account_name FROM imports i JOIN accounts a ON a.id=i.account_id WHERE i.workspace_id=? ORDER BY i.created_at DESC,i.id DESC LIMIT 100',[p.workspaceId])})})
imports.post('/preview',async c=>{
  const p=requireRole(c,['admin']),input=await body(c,importInput),a=await account(c.env.DB,p,input.accountId)
  let rows
  try { rows=normalizeCsv(input.csv) } catch(error) {throw new Problem(400,'CSV_INVALID',(error as Error).message)}
  ensure(rows.every(r=>r.currency===a.currency),400,'CURRENCY_MISMATCH','Every row must use the account currency')
  return c.json({rows,total:rows.length})
})
imports.post('/',async c=>{
  const p=requireRole(c,['admin']),input=await body(c,importInput),a=await account(c.env.DB,p,input.accountId)
  let rows
  try {rows=normalizeCsv(input.csv)} catch(error) {throw new Problem(400,'CSV_INVALID',(error as Error).message)}
  ensure(rows.every(r=>r.currency===a.currency),400,'CURRENCY_MISMATCH','Every row must use the account currency')
  const count=await first<{n:number}>(c.env.DB,'SELECT COUNT(*) AS n FROM transactions WHERE workspace_id=? AND account_id=?',[p.workspaceId,a.id])
  ensure((count?.n??0)+rows.length<=400,409,'ACCOUNT_CAPACITY','This account supports 400 statement rows; use a separate account for a new period')
  const importId=id(),created=now(),hash=await digest(canonical(rows))
  const values=await Promise.all(rows.map(async r=>[id(),p.workspaceId,a.id,importId,input.side,r.date,r.amount,r.currency,r.description,r.reference,r.externalId,await digest(canonical(r)),created]))
  await mutate(c.env.DB,p,'import.completed',{id:importId,accountId:a.id,side:input.side,rows:rows.length,digest:hash},[
    {sql:'INSERT INTO imports (id,workspace_id,account_id,side,filename,row_count,digest,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)',params:[importId,p.workspaceId,a.id,input.side,input.filename,rows.length,hash,p.id,created]},
    ...insertMany('transactions',['id','workspace_id','account_id','import_id','side','date','amount','currency','description','reference','external_id','fingerprint','created_at'],values),
  ])
  return c.json({id:importId,rows:rows.length,digest:hash},201)
})

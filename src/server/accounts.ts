import { Hono } from 'hono'
import { id,now } from '../domain/crypto'
import { accountInput } from '../domain/schemas'
import { body,ensure,readers,requireRole,type Env } from './context'
import { all,first,type Database } from './db'
import { mutate } from './audit'
import type { Principal } from '../domain/types'
export async function account(db: Database,p: Principal,accountId: string) {
  const row=await first<{id:string;name:string;currency:string;institution:string;created_at:string}>(db,'SELECT * FROM accounts WHERE workspace_id=? AND id=?',[p.workspaceId,accountId])
  ensure(row,404,'NOT_FOUND','Account not found');return row
}
export const accounts=new Hono<Env>()
accounts.get('/',async c=>{const p=requireRole(c,readers);return c.json({items:await all(c.env.DB,'SELECT * FROM accounts WHERE workspace_id=? ORDER BY name LIMIT 100',[p.workspaceId])})})
accounts.post('/',async c=>{
  const p=requireRole(c,['admin']),input=await body(c,accountInput),accountId=id(),created=now()
  const count=await first<{n:number}>(c.env.DB,'SELECT COUNT(*) AS n FROM accounts WHERE workspace_id=?',[p.workspaceId])
  ensure((count?.n??0)<100,409,'LIMIT','Workspace account limit reached')
  await mutate(c.env.DB,p,'account.created',{id:accountId,...input},[{sql:'INSERT INTO accounts (id,workspace_id,name,currency,institution,created_at) VALUES (?,?,?,?,?,?)',params:[accountId,p.workspaceId,input.name,input.currency,input.institution,created]}])
  return c.json({id:accountId,...input,created_at:created},201)
})

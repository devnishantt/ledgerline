import type { MiddlewareHandler } from 'hono'
import { digest, id, newKey, now, secretEqual } from '../domain/crypto'
import { keyInput, workspaceInput } from '../domain/schemas'
import { Hono } from 'hono'
import { auditOperation,GENESIS,mutate } from './audit'
import { body,ensure,requireRole,type Env } from './context'
import { all,batch,first } from './db'
export const authenticate: MiddlewareHandler<Env> = async(c,next) => {
  const key=c.req.header('Authorization')?.match(/^Bearer (ll_[a-f0-9]{64})$/)?.[1]
  ensure(key,401,'UNAUTHORIZED','Provide a workspace Bearer key')
  const row=await first<{id:string;workspace_id:string;role:'admin'|'reviewer'|'viewer';label:string;expires_at:string;revoked_at:string|null}>(c.env.DB,'SELECT id,workspace_id,role,label,expires_at,revoked_at FROM api_keys WHERE digest=?',[await digest(key)])
  ensure(row && !row.revoked_at && row.expires_at>now(),401,'UNAUTHORIZED','Key is invalid, expired, or revoked')
  c.set('principal',{id:row.id,workspaceId:row.workspace_id,role:row.role,label:row.label})
  await next()
}
export const bootstrap=new Hono<Env>()
bootstrap.post('/',async c=>{
  ensure(c.env.BOOTSTRAP_TOKEN?.length>=32,503,'NOT_CONFIGURED','Operator bootstrap is not configured')
  ensure(await secretEqual(c.req.header('Authorization')?.replace(/^Bearer /,'')??'',c.env.BOOTSTRAP_TOKEN),401,'UNAUTHORIZED','Operator authorization required')
  const input=await body(c,workspaceInput),workspaceId=id(),keyId=id(),key=newKey(),created=now(),expires=new Date(Date.now()+30*86400000).toISOString()
  const p={id:keyId,workspaceId,role:'admin' as const,label:'Initial administrator'}
  const event=await auditOperation(p,0,GENESIS,'workspace.created',{name:input.name})
  await batch(c.env.DB,[{sql:'INSERT INTO workspaces (id,name,head_hash,created_at) VALUES (?,?,?,?)',params:[workspaceId,input.name,event.hash,created]},{sql:'INSERT INTO workspace_revisions VALUES (?,0)',params:[workspaceId]},{sql:'INSERT INTO api_keys (id,workspace_id,label,role,digest,prefix,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?)',params:[keyId,workspaceId,p.label,'admin',await digest(key),key.slice(0,11),expires,created]},event.operation])
  return c.json({workspace:{id:workspaceId,name:input.name},apiKey:{id:keyId,key,expiresAt:expires}},201)
})
export const keys=new Hono<Env>()
keys.get('/',async c=>{const p=requireRole(c,['admin']);return c.json({items:await all(c.env.DB,'SELECT id,label,role,prefix,expires_at,revoked_at,created_at FROM api_keys WHERE workspace_id=? ORDER BY created_at DESC LIMIT 200',[p.workspaceId])})})
keys.post('/',async c=>{
  const p=requireRole(c,['admin']),input=await body(c,keyInput),key=newKey(),keyId=id(),expires=new Date(Date.now()+input.expiresInDays*86400000).toISOString()
  await mutate(c.env.DB,p,'key.created',{id:keyId,label:input.label,role:input.role},[{sql:'INSERT INTO api_keys (id,workspace_id,label,role,digest,prefix,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?)',params:[keyId,p.workspaceId,input.label,input.role,await digest(key),key.slice(0,11),expires,now()]}])
  return c.json({id:keyId,key,expiresAt:expires},201)
})
keys.delete('/:id',async c=>{
  const p=requireRole(c,['admin']),target=c.req.param('id')
  ensure(target!==p.id,409,'SELF_REVOCATION','Use another administrator key for rotation')
  const row=await first(c.env.DB,'SELECT id FROM api_keys WHERE workspace_id=? AND id=? AND revoked_at IS NULL',[p.workspaceId,target])
  ensure(row,404,'NOT_FOUND','Credential not found')
  await mutate(c.env.DB,p,'key.revoked',{id:target},[{sql:'UPDATE api_keys SET revoked_at=? WHERE workspace_id=? AND id=?',params:[now(),p.workspaceId,target]}])
  return c.body(null,204)
})

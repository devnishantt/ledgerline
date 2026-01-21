import { Hono } from 'hono'
import { id,now } from '../domain/crypto'
import { ruleInput } from '../domain/schemas'
import { body,readers,requireRole,type Env } from './context'
import { all } from './db'
import { account } from './accounts'
import { mutate } from './audit'
export const rules=new Hono<Env>()
rules.get('/',async c=>{const p=requireRole(c,readers);return c.json({items:await all(c.env.DB,'SELECT r.*,a.name AS account_name FROM rules r JOIN accounts a ON a.id=r.account_id WHERE r.workspace_id=? ORDER BY r.created_at DESC LIMIT 200',[p.workspaceId])})})
rules.post('/',async c=>{
  const p=requireRole(c,['admin']),input=await body(c,ruleInput),ruleId=id()
  await account(c.env.DB,p,input.accountId)
  await mutate(c.env.DB,p,'rule.created',{id:ruleId,...input},[{sql:'INSERT INTO rules (id,workspace_id,account_id,name,tolerance,date_window,reference_mode,min_score,created_at) VALUES (?,?,?,?,?,?,?,?,?)',params:[ruleId,p.workspaceId,input.accountId,input.name,input.tolerance,input.dateWindow,input.referenceMode,input.minScore,now()]}])
  return c.json({id:ruleId,...input},201)
})

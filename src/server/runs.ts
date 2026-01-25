import { Hono } from 'hono'
import { canonical,id,now } from '../domain/crypto'
import { propose } from '../domain/matching'
import { summarize } from '../domain/analytics'
import { runInput } from '../domain/schemas'
import type { Principal,Rule,Run,Match,Transaction } from '../domain/types'
import { body,ensure,readers,requireRole,type Env } from './context'
import { all,first,insertMany,type Database } from './db'
import { account } from './accounts'
import { mutate } from './audit'
export async function getRun(db: Database,p: Principal,runId: string) {const run=await first<Run>(db,'SELECT * FROM runs WHERE workspace_id=? AND id=?',[p.workspaceId,runId]);ensure(run,404,'NOT_FOUND','Reconciliation run not found');return run}
export async function runDetail(db: Database,p: Principal,runId: string) {
  const run=await getRun(db,p,runId)
  const transactions=await all<Transaction>(db,'SELECT t.* FROM transactions t JOIN run_transactions rt ON rt.transaction_id=t.id WHERE rt.workspace_id=? AND rt.run_id=? ORDER BY t.date,t.id',[p.workspaceId,runId])
  const matches=await all<Match>(db,'SELECT * FROM matches WHERE workspace_id=? AND run_id=? ORDER BY score DESC,id',[p.workspaceId,runId])
  return {run,transactions,matches,summary:summarize(transactions,matches)}
}
export const runs=new Hono<Env>()
runs.get('/',async c=>{const p=requireRole(c,readers);return c.json({items:await all(c.env.DB,'SELECT r.*,a.name AS account_name,(SELECT COUNT(*) FROM matches m WHERE m.run_id=r.id AND m.status=\'proposed\') AS pending FROM runs r JOIN accounts a ON a.id=r.account_id WHERE r.workspace_id=? ORDER BY r.created_at DESC,r.id DESC LIMIT 100',[p.workspaceId])})})
runs.get('/:id',async c=>c.json(await runDetail(c.env.DB,requireRole(c,readers),c.req.param('id'))))
runs.post('/',async c=>{
  const p=requireRole(c,['admin']),input=await body(c,runInput),a=await account(c.env.DB,p,input.accountId)
  const rule=await first<Rule>(c.env.DB,'SELECT * FROM rules WHERE workspace_id=? AND id=? AND account_id=? AND enabled=1',[p.workspaceId,input.ruleId,a.id])
  ensure(rule,404,'NOT_FOUND','Enabled account rule not found')
  const transactions=await all<Transaction>(c.env.DB,'SELECT * FROM transactions WHERE workspace_id=? AND account_id=? ORDER BY date,id LIMIT 401',[p.workspaceId,a.id])
  ensure(transactions.length>0 && transactions.length<=400,409,'STATEMENTS_REQUIRED','Import 1–400 statement rows before matching')
  ensure(transactions.some(t=>t.side==='bank') && transactions.some(t=>t.side==='ledger'),409,'BOTH_SIDES_REQUIRED','Import both bank and ledger statements')
  const proposed=propose(transactions,rule),safe=proposed.filter(p=>!p.ambiguous),runId=id(),created=now()
  await mutate(c.env.DB,p,'run.created',{id:runId,...input,proposed:safe.length,ambiguous:proposed.length-safe.length},[
    {sql:'INSERT INTO runs (id,workspace_id,account_id,rule_id,rule_snapshot,name,status,created_by,created_at,ambiguity_count) VALUES (?,?,?,?,?,?,?,?,?,?)',params:[runId,p.workspaceId,a.id,rule.id,canonical(rule),input.name,'review',p.id,created,proposed.length-safe.length]},
    {sql:'INSERT INTO run_revision_claims VALUES (?,?,0)',params:[p.workspaceId,runId]},
    ...insertMany('run_transactions',['workspace_id','run_id','transaction_id'],transactions.map(t=>[p.workspaceId,runId,t.id])),
    ...insertMany('matches',['id','workspace_id','run_id','bank_id','ledger_id','score','variance','reason','status'],safe.map(m=>[id(),p.workspaceId,runId,m.bankId,m.ledgerId,m.score,m.variance,m.reason,'proposed'])),
  ])
  return c.json(await runDetail(c.env.DB,p,runId),201)
})

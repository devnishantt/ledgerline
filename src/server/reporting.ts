import { Hono } from 'hono'
import { summarize } from '../domain/analytics'
import { writeCsv } from '../domain/csv'
import { decimal } from '../domain/money'
import type { Transaction,Match } from '../domain/types'
import { ensure,readers,requireRole,type Env } from './context'
import { all,first } from './db'
import { verifyAudit } from './audit'
import { runDetail } from './runs'
export const reporting=new Hono<Env>()
reporting.get('/me',async c=>{const p=requireRole(c,readers),workspace=await first(c.env.DB,'SELECT id,name,revision,created_at FROM workspaces WHERE id=?',[p.workspaceId]);return c.json({principal:p,workspace})})
reporting.get('/dashboard',async c=>{
  const p=requireRole(c,readers)
  const transactions=await all<Transaction>(c.env.DB,'SELECT * FROM transactions WHERE workspace_id=? ORDER BY date DESC LIMIT 40000',[p.workspaceId])
  const matches=await all<Match>(c.env.DB,'SELECT * FROM matches WHERE workspace_id=?',[p.workspaceId])
  const counts=await first<{accounts:number;imports:number;runs:number;review:number}>(c.env.DB,'SELECT (SELECT COUNT(*) FROM accounts WHERE workspace_id=?) AS accounts,(SELECT COUNT(*) FROM imports WHERE workspace_id=?) AS imports,(SELECT COUNT(*) FROM runs WHERE workspace_id=?) AS runs,(SELECT COUNT(*) FROM runs WHERE workspace_id=? AND status=\'review\') AS review',[p.workspaceId,p.workspaceId,p.workspaceId,p.workspaceId])
  const recent=await all(c.env.DB,'SELECT action,payload,created_at,actor_id FROM audit_events WHERE workspace_id=? ORDER BY sequence DESC LIMIT 8',[p.workspaceId])
  return c.json({summary:summarize(transactions,matches),counts,recent})
})
reporting.get('/audit',async c=>{
  const p=requireRole(c,readers),after=Number(c.req.query('after')??'-1')
  ensure(Number.isInteger(after)&&after>=-1,400,'QUERY_INVALID','after must be an integer >= -1')
  const items=await all<{sequence:number}>(c.env.DB,'SELECT * FROM audit_events WHERE workspace_id=? AND sequence>? ORDER BY sequence LIMIT 100',[p.workspaceId,after])
  return c.json({items,nextAfter:items.at(-1)?.sequence??after})
})
reporting.get('/audit/verify',async c=>c.json(await verifyAudit(c.env.DB,requireRole(c,readers))))
reporting.get('/runs/:id/export',async c=>{
  const p=requireRole(c,readers),detail=await runDetail(c.env.DB,p,c.req.param('id'))
  const byId=new Map(detail.transactions.map(t=>[t.id,t]))
  const rows=detail.matches.map(m=>{
    const a=byId.get(m.bank_id)!,b=byId.get(m.ledger_id)!
    return [m.id,m.status,a.date,a.reference,a.description,decimal(a.amount,a.currency),b.date,b.reference,b.description,decimal(b.amount,b.currency),a.currency,decimal(m.variance,a.currency),m.score,m.note,m.reviewed_by??'']
  })
  // Exports are based on the run snapshot, never a later account import.
  const current=await first<{revision:number}>(c.env.DB,'SELECT revision FROM runs WHERE workspace_id=? AND id=?',[p.workspaceId,detail.run.id])
  ensure(current?.revision===detail.run.revision,409,'REVISION_CONFLICT','Run changed during export; retry after reloading')
  c.header('Content-Disposition',`attachment; filename="ledgerline-${detail.run.id}.csv"`)
  c.header('Content-Type','text/csv; charset=utf-8')
  return c.body(writeCsv(['match_id','status','bank_date','bank_reference','bank_description','bank_amount','ledger_date','ledger_reference','ledger_description','ledger_amount','currency','variance','score','review_note','reviewer'],rows))
})

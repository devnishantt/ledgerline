import { Hono } from 'hono'
import { pageInput } from '../domain/schemas'
import { Problem,readers,requireRole,type Env } from './context'
import { all,first,type Value } from './db'
export const transactions=new Hono<Env>()
transactions.get('/',async c=>{
  const p=requireRole(c,readers),parsed=pageInput.safeParse(c.req.query())
  if(!parsed.success) throw new Problem(400,'QUERY_INVALID','Invalid transaction filters')
  const q=parsed.data,where=['workspace_id=?'],params:Value[]=[p.workspaceId]
  if(q.accountId) {where.push('account_id=?');params.push(q.accountId)}
  if(q.side) {where.push('side=?');params.push(q.side)}
  if(q.search) {where.push('(description LIKE ? OR reference LIKE ?)');params.push('%'+q.search+'%','%'+q.search+'%')}
  const count=await first<{n:number}>(c.env.DB,`SELECT COUNT(*) AS n FROM transactions WHERE ${where.join(' AND ')}`,params)
  const items=await all(c.env.DB,`SELECT * FROM transactions WHERE ${where.join(' AND ')} ORDER BY date DESC,id DESC LIMIT ? OFFSET ?`,[...params,q.limit,q.offset])
  return c.json({items,total:count?.n??0,limit:q.limit,offset:q.offset})
})

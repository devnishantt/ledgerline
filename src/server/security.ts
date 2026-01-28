import type { MiddlewareHandler } from 'hono'
import { digest } from '../domain/crypto'
import { ensure,type Env } from './context'
import { first } from './db'
export const security: MiddlewareHandler<Env> = async(c,next)=>{
  const requestId=crypto.randomUUID();c.set('requestId',requestId)
  c.header('X-Request-Id',requestId);c.header('X-Content-Type-Options','nosniff');c.header('Referrer-Policy','no-referrer')
  c.header('X-Frame-Options','DENY');c.header('Permissions-Policy','camera=(), microphone=(), geolocation=()')
  c.header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
  if(c.req.path.startsWith('/api/')) c.header('Cache-Control','no-store')
  await next()
}
export const limit: MiddlewareHandler<Env> = async(c,next)=>{
  const origin=c.req.header('Origin')
  if(origin) ensure(origin===new URL(c.req.url).origin,403,'ORIGIN_REJECTED','Cross-origin API calls are disabled')
  const bucket=Math.floor(Date.now()/60000),scope=c.req.path==='/api/workspaces'?'bootstrap':'api'
  const key=await digest((c.req.header('CF-Connecting-IP')??'local')+':'+scope)+':'+bucket
  const row=await first<{count:number}>(c.env.DB,'INSERT INTO request_limits (key,bucket,count) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',[key,bucket])
  const max=scope==='bootstrap'?5:180
  if((row?.count??max+1)>max) {c.header('Retry-After','60');ensure(false,429,'RATE_LIMITED','Request budget exceeded; retry next minute')}
  if(row?.count===1) await c.env.DB.prepare('DELETE FROM request_limits WHERE bucket<?').bind(bucket-120).run()
  await next()
}

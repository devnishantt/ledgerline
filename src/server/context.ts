import type { Context } from 'hono'
import type { ZodType } from 'zod'
import type { Database } from './db'
import type { Principal, Role } from '../domain/types'
export type Env = { Bindings: { DB: Database; BOOTSTRAP_TOKEN: string; ASSETS: { fetch(request: Request): Promise<Response> } }; Variables: { principal: Principal; requestId: string } }
export type AppContext = Context<Env>
export class Problem extends Error { constructor(public status: number, public code: string, message: string) { super(message) } }
export function ensure(value: unknown,status: number,code: string,message: string): asserts value { if (!value) throw new Problem(status,code,message) }
export function requireRole(c: AppContext,roles: Role[]): Principal { const p=c.get('principal'); ensure(p && roles.includes(p.role),403,'FORBIDDEN','Your role cannot perform this action'); return p }
export async function body<T>(c: AppContext,schema: ZodType<T>): Promise<T> {
  let input: unknown
  try { input = await c.req.json() } catch { throw new Problem(400,'INVALID_JSON','Provide a JSON request body') }
  const parsed=schema.safeParse(input)
  if (!parsed.success) throw new Problem(400,'VALIDATION',parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '))
  return parsed.data
}
export const readers: Role[] = ['admin','reviewer','viewer']
export const writers: Role[] = ['admin','reviewer']

import {test,expect} from 'bun:test'
import {fixture,prepared,operator} from './helpers'
import {sampleBank,sampleLedger} from '../src/client/sample'

test("reject requests without a workspace credential",async()=>{
 const f=await fixture()
 try { const r=await f.request('/accounts','GET',undefined,'');expect(r.status).toBe(401);expect(r.headers.get('WWW-Authenticate')).toBe('Bearer') } finally { f.close() }
})

test("reject malformed credential formats",async()=>{
 const f=await fixture()
 try { expect((await f.request('/me','GET',undefined,'ll_bad')).status).toBe(401) } finally { f.close() }
})

test("expose current workspace and role without the raw key",async()=>{
 const f=await fixture()
 try { const me=await f.json('/me');expect(me.principal.role).toBe('admin');expect(me.workspace.name).toBe('Test operations');expect(JSON.stringify(me)).not.toContain(f.admin) } finally { f.close() }
})

test("require operator authorization for workspace bootstrap",async()=>{
 const f=await fixture()
 try { expect((await f.request('/workspaces','POST',{name:'Wrong operator'})).status).toBe(401) } finally { f.close() }
})

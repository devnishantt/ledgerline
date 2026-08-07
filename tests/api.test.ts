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

test("fail closed when operator setup is absent",async()=>{
 const f=await fixture()
 try { const r=await f.app.fetch(new Request('http://localhost/api/workspaces',{method:'POST',headers:{Authorization:'Bearer '+operator,'Content-Type':'application/json'},body:JSON.stringify({name:'New workspace'})}),{...f.env,BOOTSTRAP_TOKEN:''});expect(r.status).toBe(503) } finally { f.close() }
})

test("hash stored keys and list metadata without digests",async()=>{
 const f=await fixture()
 try { const key=await f.key(),row=f.db.raw.query('SELECT digest FROM api_keys WHERE id=?').get(key.id) as {digest:string};expect(row.digest).toHaveLength(64);expect(row.digest).not.toBe(key.key);const listed=JSON.stringify(await f.json('/keys'));expect(listed).not.toContain(key.key);expect(listed).not.toContain(row.digest) } finally { f.close() }
})

test("reject expired workspace credentials",async()=>{
 const f=await fixture()
 try { const key=await f.key();f.db.raw.query('UPDATE api_keys SET expires_at=? WHERE id=?').run('2000-01-01T00:00:00Z',key.id);expect((await f.request('/me','GET',undefined,key.key)).status).toBe(401) } finally { f.close() }
})

test("revoke credentials immediately and audit the action",async()=>{
 const f=await fixture()
 try { const key=await f.key();expect((await f.request('/keys/'+key.id,'DELETE')).status).toBe(204);expect((await f.request('/me','GET',undefined,key.key)).status).toBe(401);expect((await f.json('/audit/verify')).valid).toBe(true) } finally { f.close() }
})

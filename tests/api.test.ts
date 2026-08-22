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

test("reject self-revocation of the active administrator",async()=>{
 const f=await fixture()
 try { const me=await f.json('/me');expect((await f.request('/keys/'+me.principal.id,'DELETE')).status).toBe(409) } finally { f.close() }
})

test("limit credential metadata to administrators",async()=>{
 const f=await fixture()
 try { const viewer=await f.key('viewer');expect((await f.request('/keys','GET',undefined,viewer.key)).status).toBe(403);expect((await f.request('/keys','POST',{label:'Escalation',role:'admin'},viewer.key)).status).toBe(403) } finally { f.close() }
})

test("permit viewer reads but forbid account creation",async()=>{
 const f=await fixture()
 try { const key=await f.key('viewer');expect((await f.request('/accounts','GET',undefined,key.key)).status).toBe(200);expect((await f.request('/accounts','POST',{name:'Unauthorized',currency:'USD'},key.key)).status).toBe(403) } finally { f.close() }
})

test("reject unknown account fields",async()=>{
 const f=await fixture()
 try { expect((await f.request('/accounts','POST',{name:'Operating',currency:'USD',workspace_id:'injected'})).status).toBe(400) } finally { f.close() }
})

test("prevent duplicate account names within a tenant",async()=>{
 const f=await fixture()
 try { await f.account();expect((await f.request('/accounts','POST',{name:'Operating account',currency:'USD'})).status).toBe(409) } finally { f.close() }
})

test("isolate account listings across workspaces",async()=>{
 const f=await fixture()
 try { await f.account();const second=await f.json('/workspaces','POST',{name:'Other tenant'},operator);expect((await f.json('/accounts','GET',undefined,second.apiKey.key)).items).toHaveLength(0) } finally { f.close() }
})

test("hide another tenants account during import preview",async()=>{
 const f=await fixture()
 try { const a=await f.account(),second=await f.json('/workspaces','POST',{name:'Other tenant'},operator);expect((await f.request('/imports/preview','POST',{accountId:a.id,side:'bank',filename:'a.csv',csv:sampleBank},second.apiKey.key)).status).toBe(404) } finally { f.close() }
})

test("preview imports without persisting statements",async()=>{
 const f=await fixture()
 try { const a=await f.account();const preview=await f.json('/imports/preview','POST',{accountId:a.id,side:'bank',filename:'a.csv',csv:sampleBank});expect(preview.total).toBe(4);expect((await f.json('/transactions')).total).toBe(0);expect((await f.json('/imports')).items).toHaveLength(0) } finally { f.close() }
})

test("reject account and row currency mismatches",async()=>{
 const f=await fixture()
 try { const a=await f.account('EUR');const r=await f.request('/imports','POST',{accountId:a.id,side:'bank',filename:'a.csv',csv:sampleBank});expect(r.status).toBe(400);expect((await r.json() as any).error.code).toBe('CURRENCY_MISMATCH') } finally { f.close() }
})

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

test("ingest a statement atomically and expose exact amounts",async()=>{
 const f=await fixture()
 try { const a=await f.account();await f.json('/imports','POST',{accountId:a.id,side:'bank',filename:'a.csv',csv:sampleBank});const data=await f.json('/transactions');expect(data.total).toBe(4);expect(data.items.find((t:any)=>t.reference==='INV-1042').amount).toBe(125000) } finally { f.close() }
})

test("reject duplicate normalized statement imports",async()=>{
 const f=await fixture()
 try { const a=await f.account(),input={accountId:a.id,side:'bank',filename:'a.csv',csv:sampleBank};await f.json('/imports','POST',input);expect((await f.request('/imports','POST',input)).status).toBe(409);expect((await f.json('/transactions')).total).toBe(4) } finally { f.close() }
})

test("roll back every row after a mid-import failure",async()=>{
 const f=await fixture()
 try { const a=await f.account();f.db.failAt=3;expect((await f.request('/imports','POST',{accountId:a.id,side:'bank',filename:'a.csv',csv:sampleBank})).status).toBe(503);expect((await f.json('/transactions')).total).toBe(0);expect((await f.json('/imports')).items).toHaveLength(0);expect((await f.json('/audit/verify')).valid).toBe(true) } finally { f.close() }
})

test("reject invalid CSV with indexed validation errors",async()=>{
 const f=await fixture()
 try { const a=await f.account(),r=await f.request('/imports','POST',{accountId:a.id,side:'bank',filename:'a.csv',csv:'date,amount,currency,description\n2026-02-30,1,USD,Bad date'});expect(r.status).toBe(400);expect((await r.json() as any).error.message).toContain('Row 2') } finally { f.close() }
})

test("filter statement rows by account and source side",async()=>{
 const f=await prepared()
 try { const data=await f.json('/transactions?accountId='+f.account.id+'&side=ledger');expect(data.total).toBe(3);expect(data.items.every((t:any)=>t.side==='ledger')).toBe(true) } finally { f.close() }
})

test("paginate statement feeds without overlapping IDs",async()=>{
 const f=await prepared()
 try { const a=await f.json('/transactions?limit=2&offset=0'),b=await f.json('/transactions?limit=2&offset=2');expect(a.items).toHaveLength(2);expect(new Set([...a.items,...b.items].map((x:any)=>x.id)).size).toBe(4) } finally { f.close() }
})

test("bind search inputs instead of interpreting SQL fragments",async()=>{
 const f=await prepared()
 try { const r=await f.json('/transactions?search='+encodeURIComponent("' OR 1=1 --"));expect(r.total).toBe(0) } finally { f.close() }
})

test("reject invalid query pagination boundaries",async()=>{
 const f=await fixture()
 try { expect((await f.request('/transactions?limit=101')).status).toBe(400);expect((await f.request('/transactions?offset=-1')).status).toBe(400) } finally { f.close() }
})

test("require rules to belong to the selected account",async()=>{
 const f=await prepared()
 try { const other=await f.account('USD','Other period');const rule=await f.json('/rules','POST',{accountId:other.id,name:'Other rule'});expect((await f.request('/runs','POST',{accountId:f.account.id,ruleId:rule.id,name:'Invalid run'})).status).toBe(404) } finally { f.close() }
})

test("require both statement sources before matching",async()=>{
 const f=await fixture()
 try { const a=await f.account();await f.json('/imports','POST',{accountId:a.id,side:'bank',filename:'bank.csv',csv:sampleBank});const rule=await f.json('/rules','POST',{accountId:a.id,name:'Policy'});expect((await f.request('/runs','POST',{accountId:a.id,ruleId:rule.id,name:'Unilateral'})).status).toBe(409) } finally { f.close() }
})

test("snapshot transactions and persist explainable safe proposals",async()=>{
 const f=await prepared()
 try { expect(f.detail.transactions).toHaveLength(7);expect(f.detail.matches).toHaveLength(3);expect(f.detail.matches.every((m:any)=>m.reason&&m.status==='proposed')).toBe(true);expect(f.detail.summary.unmatched).toBe(7) } finally { f.close() }
})

test("hide another tenants run and export",async()=>{
 const f=await prepared()
 try { const other=await f.json('/workspaces','POST',{name:'Other operations'},operator);expect((await f.request('/runs/'+f.detail.run.id,'GET',undefined,other.apiKey.key)).status).toBe(404);expect((await f.request('/runs/'+f.detail.run.id+'/export','GET',undefined,other.apiKey.key)).status).toBe(404) } finally { f.close() }
})

test("forbid the run creator from reviewing their own proposals",async()=>{
 const f=await prepared()
 try { const m=f.detail.matches[0];expect((await f.request('/runs/'+f.detail.run.id+'/matches/'+m.id,'POST',{expectedRevision:0,decision:'approved',note:'Reviewed evidence carefully'})).status).toBe(403) } finally { f.close() }
})

test("allow a distinct reviewer to approve and allocate both records",async()=>{
 const f=await prepared()
 try { const m=f.detail.matches[0],d=await f.json('/runs/'+f.detail.run.id+'/matches/'+m.id,'POST',{expectedRevision:0,decision:'approved',note:'Independent review complete'},f.reviewer.key);expect(d.run.revision).toBe(1);expect(d.summary.approved).toBe(1);expect(d.summary.unmatched).toBe(5);expect(f.db.raw.query('SELECT COUNT(*) AS n FROM approved_allocations').get()).toEqual({n:2}) } finally { f.close() }
})

test("reject stale run revisions without changing decisions",async()=>{
 const f=await prepared()
 try { const m=f.detail.matches[0];expect((await f.request('/runs/'+f.detail.run.id+'/matches/'+m.id,'POST',{expectedRevision:7,decision:'approved',note:'Independent review complete'},f.reviewer.key)).status).toBe(409);expect((await f.json('/runs/'+f.detail.run.id)).summary.approved).toBe(0) } finally { f.close() }
})

test("retain rejected pairs as unresolved without reserving funds",async()=>{
 const f=await prepared()
 try { const m=f.detail.matches[0],d=await f.json('/runs/'+f.detail.run.id+'/matches/'+m.id,'POST',{expectedRevision:0,decision:'rejected',note:'References require investigation'},f.reviewer.key);expect(d.summary.rejected).toBe(1);expect(d.summary.unmatched).toBe(7);expect(f.db.raw.query('SELECT COUNT(*) AS n FROM approved_allocations').get()).toEqual({n:0}) } finally { f.close() }
})

test("make an existing review decision immutable",async()=>{
 const f=await prepared()
 try { const m=f.detail.matches[0],path='/runs/'+f.detail.run.id+'/matches/'+m.id;await f.json(path,'POST',{expectedRevision:0,decision:'approved',note:'Independent review complete'},f.reviewer.key);expect((await f.request(path,'POST',{expectedRevision:1,decision:'rejected',note:'Attempt to change decision'},f.reviewer.key)).status).toBe(409) } finally { f.close() }
})

test("require all proposals reviewed before finalizing",async()=>{
 const f=await prepared()
 try { const r=await f.request('/runs/'+f.detail.run.id+'/finalize','POST',{expectedRevision:0});expect(r.status).toBe(409);expect((await r.json() as any).error.code).toBe('REVIEW_REQUIRED') } finally { f.close() }
})

test("finalize a reviewed run while retaining explicit exceptions",async()=>{
 const f=await prepared()
 try { let rev=0;for(const m of f.detail.matches)await f.json('/runs/'+f.detail.run.id+'/matches/'+m.id,'POST',{expectedRevision:rev++,decision:'approved',note:'Independent review complete'},f.reviewer.key);const d=await f.json('/runs/'+f.detail.run.id+'/finalize','POST',{expectedRevision:rev});expect(d.run.status).toBe('finalized');expect(d.summary.unmatched).toBe(1);expect(d.run.finalized_at).not.toBeNull() } finally { f.close() }
})

test("reject finalization by a reviewer credential",async()=>{
 const f=await prepared()
 try { expect((await f.request('/runs/'+f.detail.run.id+'/finalize','POST',{expectedRevision:0},f.reviewer.key)).status).toBe(403) } finally { f.close() }
})

test("prevent the same statement from being approved in two runs",async()=>{
 const f=await prepared()
 try { const second=await f.json('/runs','POST',{accountId:f.account.id,ruleId:f.rule.id,name:'Duplicate allocation attempt'});const a=f.detail.matches[0],b=second.matches.find((m:any)=>m.bank_id===a.bank_id);await f.json('/runs/'+f.detail.run.id+'/matches/'+a.id,'POST',{expectedRevision:0,decision:'approved',note:'Primary review complete'},f.reviewer.key);expect((await f.request('/runs/'+second.run.id+'/matches/'+b.id,'POST',{expectedRevision:0,decision:'approved',note:'Duplicate allocation attempt'},f.reviewer.key)).status).toBe(409);expect((await f.json('/runs/'+second.run.id)).run.revision).toBe(0) } finally { f.close() }
})

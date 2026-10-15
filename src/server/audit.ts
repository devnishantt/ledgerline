import { canonical, digest, id, now } from '../domain/crypto'
import type { Principal } from '../domain/types'
import { ensure } from './context'
import { all, batch, first, type Database, type Operation } from './db'
export const GENESIS = '0'.repeat(64)
export type AuditEvent = { id: string; workspace_id: string; sequence: number; actor_id: string; action: string; payload: string; previous_hash: string; hash: string; created_at: string }
export async function auditOperation(p: Principal,sequence: number,previous: string,action: string,payload: unknown) {
  const event={ id:id(),workspace_id:p.workspaceId,sequence,actor_id:p.id,action,payload:canonical(payload),previous_hash:previous,created_at:now() }
  const hash=await digest(canonical(event))
  return { hash, operation:{sql:'INSERT INTO audit_events (id,workspace_id,sequence,actor_id,action,payload,previous_hash,hash,created_at) VALUES (?,?,?,?,?,?,?,?,?)',params:[event.id,event.workspace_id,event.sequence,event.actor_id,event.action,event.payload,event.previous_hash,hash,event.created_at]} }
}
export async function mutate(db: Database,p: Principal,action: string,payload: unknown,operations: Operation[]) {
  const workspace=await first<{revision:number;head_hash:string}>(db,'SELECT revision,head_hash FROM workspaces WHERE id=?',[p.workspaceId])
  ensure(workspace,404,'NOT_FOUND','Workspace not found')
  const next=workspace.revision+1, event=await auditOperation(p,next,workspace.head_hash,action,payload)
  await batch(db,[{sql:'INSERT INTO workspace_revisions (workspace_id,revision,actor_id) VALUES (?,?,?)',params:[p.workspaceId,next,p.id]},...operations,event.operation,{sql:'UPDATE workspaces SET revision=?,head_hash=? WHERE id=?',params:[next,event.hash,p.workspaceId]}])
}
export async function verifyAudit(db: Database,p: Principal) {
  const workspace=await first<{revision:number;head_hash:string}>(db,'SELECT revision,head_hash FROM workspaces WHERE id=?',[p.workspaceId])
  ensure(workspace,404,'NOT_FOUND','Workspace not found')
  let sequence=0,previous=GENESIS
  while(sequence<=workspace.revision) {
    const rows=await all<AuditEvent>(db,'SELECT * FROM audit_events WHERE workspace_id=? AND sequence>=? AND sequence<=? ORDER BY sequence LIMIT 100',[p.workspaceId,sequence,workspace.revision])
    if (!rows.length) return {valid:false,brokenAt:sequence,verified:sequence,head:previous}
    for(const row of rows) {
      const {hash,...content}=row
      if(row.sequence!==sequence || row.previous_hash!==previous || await digest(canonical(content))!==hash) return {valid:false,brokenAt:sequence,verified:sequence,head:previous}
      previous=hash; sequence++
    }
  }
  return {valid:previous===workspace.head_hash,brokenAt:previous===workspace.head_hash?null:sequence-1,verified:sequence,head:previous}
}

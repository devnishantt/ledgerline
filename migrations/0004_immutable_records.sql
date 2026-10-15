ALTER TABLE workspace_revisions ADD COLUMN actor_id TEXT;
CREATE TRIGGER revision_active_actor BEFORE INSERT ON workspace_revisions
WHEN NEW.revision>0 AND NOT EXISTS (SELECT 1 FROM api_keys WHERE workspace_id=NEW.workspace_id AND id=NEW.actor_id AND revoked_at IS NULL AND role IN ('admin','reviewer') AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))
BEGIN SELECT RAISE(ABORT,'active write identity required'); END;
CREATE TRIGGER keep_active_admin BEFORE UPDATE OF revoked_at ON api_keys
WHEN OLD.role='admin' AND OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM api_keys WHERE workspace_id=OLD.workspace_id AND id!=OLD.id AND role='admin' AND revoked_at IS NULL AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))
BEGIN SELECT RAISE(ABORT,'last active administrator protected'); END;
CREATE TRIGGER transaction_no_update BEFORE UPDATE ON transactions BEGIN SELECT RAISE(ABORT,'statement rows are immutable'); END;
CREATE TRIGGER transaction_no_delete BEFORE DELETE ON transactions BEGIN SELECT RAISE(ABORT,'statement rows are immutable'); END;
CREATE TRIGGER import_no_update BEFORE UPDATE ON imports BEGIN SELECT RAISE(ABORT,'imports are immutable'); END;
CREATE TRIGGER import_no_delete BEFORE DELETE ON imports BEGIN SELECT RAISE(ABORT,'imports are immutable'); END;
CREATE TRIGGER review_no_update BEFORE UPDATE ON matches WHEN OLD.status!='proposed' BEGIN SELECT RAISE(ABORT,'review decisions are immutable'); END;
CREATE TRIGGER finalized_no_update BEFORE UPDATE ON runs WHEN OLD.status='finalized' BEGIN SELECT RAISE(ABORT,'finalized runs are immutable'); END;
CREATE TRIGGER allocation_no_delete BEFORE DELETE ON approved_allocations BEGIN SELECT RAISE(ABORT,'approved allocations are immutable'); END;

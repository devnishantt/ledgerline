import { Hono } from "hono";
import { now } from "../domain/crypto";
import { decisionInput, finalizeInput } from "../domain/schemas";
import type { Match } from "../domain/types";
import { body, ensure, requireRole, writers, type Env } from "./context";
import { first, insertMany } from "./db";
import { mutate } from "./audit";
import { getRun, runDetail } from "./runs";
export const reviews = new Hono<Env>();
reviews.post("/:id/matches/:matchId", async (c) => {
  const p = requireRole(c, writers),
    input = await body(c, decisionInput),
    run = await getRun(c.env.DB, p, c.req.param("id"));
  ensure(
    run.status === "review",
    409,
    "FINALIZED",
    "Finalized runs are immutable",
  );
  ensure(
    run.revision === input.expectedRevision,
    409,
    "REVISION_CONFLICT",
    "Reload the current run revision",
  );
  const match = await first<Match>(
    c.env.DB,
    "SELECT * FROM matches WHERE workspace_id=? AND run_id=? AND id=?",
    [p.workspaceId, run.id, c.req.param("matchId")],
  );
  ensure(match, 404, "NOT_FOUND", "Match not found");
  ensure(
    match.status === "proposed",
    409,
    "ALREADY_REVIEWED",
    "This decision is immutable",
  );
  ensure(
    p.id !== run.created_by,
    403,
    "INDEPENDENT_REVIEW",
    "The run creator cannot review their own proposals",
  );
  const time = now();
  await mutate(
    c.env.DB,
    p,
    "match." + input.decision,
    { runId: run.id, matchId: match.id, note: input.note },
    [
      {
        sql: "INSERT INTO run_revision_claims VALUES (?,?,?)",
        params: [p.workspaceId, run.id, run.revision + 1],
      },
      ...(input.decision === "approved"
        ? insertMany(
            "approved_allocations",
            ["workspace_id", "transaction_id", "run_id", "match_id"],
            [match.bank_id, match.ledger_id].map((t) => [
              p.workspaceId,
              t,
              run.id,
              match.id,
            ]),
          )
        : []),
      {
        sql: "UPDATE matches SET status=?,note=?,reviewed_by=?,reviewed_at=? WHERE workspace_id=? AND id=?",
        params: [
          input.decision,
          input.note,
          p.id,
          time,
          p.workspaceId,
          match.id,
        ],
      },
      {
        sql: "UPDATE runs SET revision=revision+1 WHERE workspace_id=? AND id=?",
        params: [p.workspaceId, run.id],
      },
    ],
  );
  return c.json(await runDetail(c.env.DB, p, run.id));
});
reviews.post("/:id/finalize", async (c) => {
  const p = requireRole(c, ["admin"]),
    input = await body(c, finalizeInput),
    detail = await runDetail(c.env.DB, p, c.req.param("id")),
    run = detail.run;
  ensure(run.status === "review", 409, "FINALIZED", "Run is already finalized");
  ensure(
    run.revision === input.expectedRevision,
    409,
    "REVISION_CONFLICT",
    "Reload the current run revision",
  );
  ensure(
    detail.summary.proposed === 0 && detail.summary.approved > 0,
    409,
    "REVIEW_REQUIRED",
    "Review all proposals and approve at least one pair before finalizing",
  );
  await mutate(
    c.env.DB,
    p,
    "run.finalized",
    { runId: run.id, summary: detail.summary },
    [
      {
        sql: "INSERT INTO run_revision_claims VALUES (?,?,?)",
        params: [p.workspaceId, run.id, run.revision + 1],
      },
      {
        sql: "UPDATE runs SET status=?,revision=revision+1,finalized_at=? WHERE workspace_id=? AND id=?",
        params: ["finalized", now(), p.workspaceId, run.id],
      },
    ],
  );
  return c.json(await runDetail(c.env.DB, p, run.id));
});

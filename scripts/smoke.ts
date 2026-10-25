/** Explicitly provisions a disposable workspace; never run on an unrelated database. */
import { sampleBank, sampleLedger } from "../src/client/sample";
const base = process.env.API_URL ?? "http://localhost:3000";
const operator = process.env.BOOTSTRAP_TOKEN;
if (!operator)
  throw new Error(
    "Set BOOTSTRAP_TOKEN in the shell before running this smoke workflow",
  );
async function call(
  path: string,
  method = "GET",
  body?: unknown,
  token = operator!,
): Promise<any> {
  const r = await fetch(new URL("/api" + path, base), {
    method,
    headers: {
      Authorization: "Bearer " + token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = (await r.json()) as any;
  if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify(data)}`);
  return data;
}
const workspace = await call("/workspaces", "POST", {
  name: "Disposable smoke workspace",
});
const admin = workspace.apiKey.key;
const account = await call(
  "/accounts",
  "POST",
  { name: "Smoke account", currency: "USD" },
  admin,
);
for (const [side, csv] of [
  ["bank", sampleBank],
  ["ledger", sampleLedger],
])
  await call(
    "/imports",
    "POST",
    { accountId: account.id, side, csv, filename: side + ".csv" },
    admin,
  );
const rule = await call(
  "/rules",
  "POST",
  { accountId: account.id, name: "Smoke policy", tolerance: 10 },
  admin,
);
const run = await call(
  "/runs",
  "POST",
  { accountId: account.id, ruleId: rule.id, name: "Smoke close" },
  admin,
);
const reviewer = await call(
  "/keys",
  "POST",
  { label: "Smoke reviewer", role: "reviewer", expiresInDays: 1 },
  admin,
);
let revision = 0;
for (const match of run.matches)
  await call(
    `/runs/${run.run.id}/matches/${match.id}`,
    "POST",
    {
      expectedRevision: revision++,
      decision: "approved",
      note: "Disposable workflow verification",
    },
    reviewer.key,
  );
const final = await call(
  `/runs/${run.run.id}/finalize`,
  "POST",
  { expectedRevision: revision },
  admin,
);
const verification = await call("/audit/verify", "GET", undefined, admin);
if (
  final.run.status !== "finalized" ||
  !verification.valid ||
  final.summary.approved !== 3
)
  throw new Error("Smoke workflow failed verification");
console.log(
  JSON.stringify(
    {
      workspaceId: workspace.workspace.id,
      runId: final.run.id,
      approved: final.summary.approved,
      unresolved: final.summary.unmatched,
      auditValid: verification.valid,
    },
    null,
    2,
  ),
);

import { z } from "zod";
// Edge runtimes and the browser CSP forbid dynamic code generation.
z.config({ jitless: true });
import { currencies } from "./money";
export const workspaceInput = z.strictObject({
  name: z.string().trim().min(2).max(100),
});
export const accountInput = z.strictObject({
  name: z.string().trim().min(2).max(100),
  currency: z.enum(currencies),
  institution: z.string().trim().max(100).default(""),
});
export const keyInput = z.strictObject({
  label: z.string().trim().min(2).max(100),
  role: z.enum(["admin", "reviewer", "viewer"]),
  expiresInDays: z.number().int().min(1).max(365).default(30),
});
export const importInput = z.strictObject({
  accountId: z.uuid(),
  side: z.enum(["bank", "ledger"]),
  filename: z.string().trim().min(1).max(100),
  csv: z.string().min(1).max(200_000),
});
export const ruleInput = z.strictObject({
  accountId: z.uuid(),
  name: z.string().trim().min(2).max(100),
  tolerance: z.number().int().min(0).max(10_000).default(0),
  dateWindow: z.number().int().min(0).max(14).default(3),
  referenceMode: z.enum(["prefer", "require", "ignore"]).default("prefer"),
  minScore: z.number().int().min(40).max(100).default(75),
});
export const runInput = z.strictObject({
  accountId: z.uuid(),
  ruleId: z.uuid(),
  name: z.string().trim().min(2).max(100),
});
export const decisionInput = z.strictObject({
  expectedRevision: z.number().int().min(0),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().min(5).max(1000),
});
export const finalizeInput = z.strictObject({
  expectedRevision: z.number().int().min(0),
});
export const pageInput = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  accountId: z.uuid().optional(),
  side: z.enum(["bank", "ledger"]).optional(),
  search: z.string().max(100).default(""),
});

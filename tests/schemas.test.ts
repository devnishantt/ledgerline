import { test, expect } from "bun:test";
import {
  workspaceInput,
  accountInput,
  keyInput,
  importInput,
  ruleInput,
  runInput,
  decisionInput,
  finalizeInput,
  pageInput,
} from "../src/domain/schemas";

test("trim workspace names and reject empty names", async () => {
  expect(workspaceInput.parse({ name: "  Finance  " })).toEqual({
    name: "Finance",
  });
  expect(workspaceInput.safeParse({ name: " " }).success).toBe(false);
});

test("reject extra authority fields in strict workspace input", async () => {
  expect(
    workspaceInput.safeParse({ name: "Finance", role: "admin" }).success,
  ).toBe(false);
});

test("limit supported account currencies", async () => {
  expect(
    accountInput.safeParse({ name: "Operating", currency: "BTC" }).success,
  ).toBe(false);
  expect(
    accountInput.parse({ name: "Operating", currency: "JPY" }).institution,
  ).toBe("");
});

test("supply bounded default credential expiry", async () => {
  expect(
    keyInput.parse({ label: "Reviewer", role: "reviewer" }).expiresInDays,
  ).toBe(30);
  expect(
    keyInput.safeParse({
      label: "Reviewer",
      role: "reviewer",
      expiresInDays: 366,
    }).success,
  ).toBe(false);
});

test("reject invented credential roles", async () => {
  expect(
    keyInput.safeParse({ label: "Owner", role: "superadmin" }).success,
  ).toBe(false);
});

test("validate import account UUID and statement side", async () => {
  expect(
    importInput.safeParse({
      accountId: "wrong",
      side: "bank",
      filename: "x.csv",
      csv: "x",
    }).success,
  ).toBe(false);
  expect(
    importInput.safeParse({
      accountId: "00000000-0000-4000-8000-000000000001",
      side: "cash",
      filename: "x.csv",
      csv: "x",
    }).success,
  ).toBe(false);
});

test("bound rule tolerance in integer minor units", async () => {
  expect(
    ruleInput.safeParse({
      accountId: "00000000-0000-4000-8000-000000000001",
      name: "Policy",
      tolerance: 0.5,
    }).success,
  ).toBe(false);
  expect(
    ruleInput.safeParse({
      accountId: "00000000-0000-4000-8000-000000000001",
      name: "Policy",
      tolerance: 10001,
    }).success,
  ).toBe(false);
});

test("bound settlement windows and minimum matching scores", async () => {
  expect(
    ruleInput.safeParse({
      accountId: "00000000-0000-4000-8000-000000000001",
      name: "Policy",
      dateWindow: 15,
    }).success,
  ).toBe(false);
  expect(
    ruleInput.safeParse({
      accountId: "00000000-0000-4000-8000-000000000001",
      name: "Policy",
      minScore: 101,
    }).success,
  ).toBe(false);
});

test("supply conservative rule defaults", async () => {
  expect(
    ruleInput.parse({
      accountId: "00000000-0000-4000-8000-000000000001",
      name: "Policy",
    }),
  ).toMatchObject({
    tolerance: 0,
    dateWindow: 3,
    referenceMode: "prefer",
    minScore: 75,
  });
});

test("require a valid rule reference for new runs", async () => {
  expect(
    runInput.safeParse({
      accountId: "00000000-0000-4000-8000-000000000001",
      ruleId: "invalid",
      name: "Close",
    }).success,
  ).toBe(false);
});

test("require a meaningful immutable review rationale", async () => {
  expect(
    decisionInput.safeParse({
      expectedRevision: 0,
      decision: "approved",
      note: "ok",
    }).success,
  ).toBe(false);
  expect(
    decisionInput.parse({
      expectedRevision: 0,
      decision: "rejected",
      note: " Does not align ",
    }).note,
  ).toBe("Does not align");
});

test("reject negative and fractional revision claims", async () => {
  expect(finalizeInput.safeParse({ expectedRevision: -1 }).success).toBe(false);
  expect(finalizeInput.safeParse({ expectedRevision: 1.5 }).success).toBe(
    false,
  );
});

test("coerce pagination while rejecting excessive page sizes", async () => {
  expect(pageInput.parse({ limit: "20", offset: "10" })).toMatchObject({
    limit: 20,
    offset: 10,
  });
  expect(pageInput.safeParse({ limit: "101" }).success).toBe(false);
  expect(pageInput.safeParse({ offset: "-1" }).success).toBe(false);
});

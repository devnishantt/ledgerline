import { test, expect, type APIRequestContext } from "@playwright/test";
import { sampleBank, sampleLedger } from "../src/client/sample";

test.skip(
  !process.env.BOOTSTRAP_TOKEN,
  "Start a disposable local preview and provide its operator token",
);
async function provision(request: APIRequestContext) {
  const workspaceResponse = await request.post("/api/workspaces", {
    headers: { Authorization: "Bearer " + process.env.BOOTSTRAP_TOKEN },
    data: { name: "Browser verification" },
  });
  expect(workspaceResponse.status()).toBe(201);
  const workspace = await workspaceResponse.json(),
    key = workspace.apiKey.key;
  const headers = { Authorization: "Bearer " + key };
  const account = await (
    await request.post("/api/accounts", {
      headers,
      data: {
        name: "Operating · browser test",
        currency: "USD",
        institution: "Illustrative bank",
      },
    })
  ).json();
  for (const [side, csv] of [
    ["bank", sampleBank],
    ["ledger", sampleLedger],
  ])
    expect(
      (
        await request.post("/api/imports", {
          headers,
          data: { accountId: account.id, side, csv, filename: side + ".csv" },
        })
      ).status(),
    ).toBe(201);
  const rule = await (
    await request.post("/api/rules", {
      headers,
      data: {
        accountId: account.id,
        name: "Settlement references",
        tolerance: 10,
      },
    })
  ).json();
  const detail = await (
    await request.post("/api/runs", {
      headers,
      data: { accountId: account.id, ruleId: rule.id, name: "October review" },
    })
  ).json();
  return { key, detail };
}
test("desktop workspace loads live records and navigates every operational view", async ({
  page,
  request,
}) => {
  const { key, detail } = await provision(request),
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByLabel("Workspace API key").fill(key);
  await page.getByRole("button", { name: "Open workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Clarity at a glance." }),
  ).toBeVisible();
  await expect(page.getByText("7", { exact: true }).first()).toBeVisible();
  if (process.env.LEDGERLINE_SCREENSHOT)
    await page.screenshot({
      path: process.env.LEDGERLINE_SCREENSHOT,
      fullPage: true,
    });
  for (const [label, heading] of [
    ["Accounts", "Accounts"],
    ["Statement imports", "Statement imports"],
    ["Transactions", "Transactions"],
    ["Matching rules", "Matching rules"],
    ["Reconciliation", "Reconciliation"],
    ["Audit trail", "Audit trail"],
    ["Access & keys", "Access & keys"],
  ]) {
    await page
      .getByRole("navigation", { name: "Workspace navigation" })
      .getByRole("link", { name: label, exact: label !== "Reconciliation" })
      .click();
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
  }
  await page.goto("/#runs/" + detail.run.id);
  await expect(
    page.getByRole("heading", { name: "October review", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Match proposals" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("heading", { name: "Your numbers, connected." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile workspace remains navigable without document-level overflow", async ({
  page,
  request,
}) => {
  const { key } = await provision(request);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Workspace API key").fill(key);
  await page.getByRole("button", { name: "Open workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Clarity at a glance." }),
  ).toBeVisible();
  const widths = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  await page
    .getByRole("navigation", { name: "Workspace navigation" })
    .getByRole("link", { name: "Transactions", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Transactions", exact: true }),
  ).toBeVisible();
});

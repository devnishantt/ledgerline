import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { serveStatic } from "hono/cloudflare-workers";
import { authenticate, bootstrap, keys } from "./auth";
import { accounts } from "./accounts";
import { imports } from "./imports";
import { transactions } from "./transactions";
import { rules } from "./rules";
import { runs } from "./runs";
import { reviews } from "./reviews";
import { reporting } from "./reporting";
import { Problem, type Env } from "./context";
import { limit, security } from "./security";
export function createApp() {
  const app = new Hono<Env>();
  app.use("*", security);
  app.onError((error, c) => {
    let status = 503,
      code = "STORAGE_UNAVAILABLE",
      message = "Storage is temporarily unavailable";
    if (error instanceof Problem) {
      status = error.status;
      code = error.code;
      message = error.message;
    } else if (error instanceof RangeError) {
      status = 422;
      code = "REPORT_RANGE";
      message =
        "Currency aggregate exceeds exact reporting range; use period-specific accounts";
    } else if (
      /UNIQUE constraint|constraint failed|capacity reached/i.test(
        error.message,
      )
    ) {
      status = 409;
      code = "WRITE_CONFLICT";
      message = "Duplicate data or concurrent update; reload before retrying";
    }
    if (status === 401) c.header("WWW-Authenticate", "Bearer");
    return c.json(
      { error: { code, message, requestId: c.get("requestId") } },
      status as 400,
    );
  });
  app.use(
    "/api/*",
    bodyLimit({
      maxSize: 256000,
      onError: (c) =>
        c.json(
          {
            error: {
              code: "BODY_LIMIT",
              message: "Request exceeds 250 KB",
              requestId: c.get("requestId"),
            },
          },
          413,
        ),
    }),
  );
  app.get("/health/live", (c) => c.json({ status: "ok" }));
  app.get("/health/ready", async (c) => {
    await c.env.DB.prepare("SELECT id FROM workspaces LIMIT 1").all();
    return c.json({ status: "ready" });
  });
  app.use("/api/*", limit);
  app.route("/api/workspaces", bootstrap);
  const api = new Hono<Env>();
  api.use("*", authenticate);
  api.route("/keys", keys);
  api.route("/accounts", accounts);
  api.route("/imports", imports);
  api.route("/transactions", transactions);
  api.route("/rules", rules);
  api.route("/runs", runs);
  api.route("/runs", reviews);
  api.route("/", reporting);
  api.all("*", (c) =>
    c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "API route not found",
          requestId: c.get("requestId"),
        },
      },
      404,
    ),
  );
  app.route("/api", api);
  app.use("/static/*", serveStatic({ root: "./" }));
  app.get("*", serveStatic({ path: "./index.html" }));
  return app;
}

import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowUpRight, Inbox, LoaderCircle } from "lucide-react";
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <section>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </section>
      {action}
    </header>
  );
}
export function Card({
  title,
  children,
  action,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="card">
      {title && (
        <header className="card-header">
          <h2>{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
export function Empty({
  title = "Nothing here yet",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <section className="empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      <p>
        {children ??
          "Create a record to start building your reconciliation trail."}
      </p>
    </section>
  );
}
export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <p role="alert" className="notice error">
      <AlertCircle size={17} />
      {error instanceof Error ? error.message : String(error)}
    </p>
  ) : null;
}
export function Loading() {
  return (
    <p role="status" className="loading">
      <LoaderCircle className="spin" size={18} />
      Loading workspace data…
    </p>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [success, setSuccess] = useState(""),
    client = useQueryClient();
  const run = async (
    fn: () => Promise<unknown>,
    message = "Saved successfully",
  ) => {
    setBusy(true);
    setError(null);
    setSuccess("");
    try {
      await fn();
      await client.invalidateQueries();
      setSuccess(message);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, success, run };
}
export function Feedback({ action }: { action: ReturnType<typeof useAction> }) {
  return (
    <>
      <ErrorNotice error={action.error} />
      {action.success && (
        <p role="status" className="notice success">
          {action.success}
        </p>
      )}
    </>
  );
}
export function Submit({
  busy,
  children,
}: {
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <button className="button primary" disabled={busy} type="submit">
      {busy ? (
        <LoaderCircle className="spin" size={16} />
      ) : (
        <ArrowUpRight size={16} />
      )}{" "}
      {children}
    </button>
  );
}
export function Metric({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  accent?: boolean;
}) {
  return (
    <article className={"metric " + (accent ? "accent" : "")}>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

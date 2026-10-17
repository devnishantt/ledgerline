import { useState } from "react";
import {
  ArrowRight,
  Check,
  ShieldCheck,
  GitCompareArrows,
  Fingerprint,
} from "lucide-react";
import { request } from "../api";
import { Logo } from "../components/Shell";
import { ErrorNotice } from "../components/ui";
export function Login({
  onConnect,
}: {
  onConnect: (key: string) => Promise<void>;
}) {
  const [key, setKey] = useState(""),
    [operator, setOperator] = useState(""),
    [name, setName] = useState(""),
    [create, setCreate] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [issued, setIssued] = useState("");
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (create) {
        const data = await request(
          "/workspaces",
          { method: "POST", body: JSON.stringify({ name }) },
          operator,
        );
        setIssued(data.apiKey.key);
        setKey(data.apiKey.key);
        setCreate(false);
        setOperator("");
      } else await onConnect(key);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-layout">
      <section className="login-story">
        <Logo />
        <span className="login-tag">THE RECONCILIATION WORKSPACE</span>
        <h1>
          Close the books.
          <br />
          <em>Open up clarity.</em>
        </h1>
        <p>
          A considered workspace for matching transactions, investigating
          differences, and reviewing every decision.
        </p>
        <ul>
          <li>
            <GitCompareArrows />
            Explainable matching, never silent guesses
          </li>
          <li>
            <ShieldCheck />
            Independent review before finalization
          </li>
          <li>
            <Fingerprint />A verifiable trail from import to close
          </li>
        </ul>
        <footer>
          Less chasing spreadsheets. More confidence in your numbers.
        </footer>
      </section>
      <section className="login-form">
        <div className="form-intro">
          <span className="mini-mark">ll.</span>
          <p className="eyebrow">WELCOME TO LEDGERLINE</p>
          <h2>
            {create ? "Create your workspace" : "Your numbers, connected."}
          </h2>
          <p className="muted">
            {create
              ? "An operator token is required to provision a workspace."
              : "Connect with a workspace API key to get started."}
          </p>
        </div>
        {issued && (
          <aside className="notice success">
            <Check size={16} />
            <section>
              <strong>Save your administrator key now.</strong>
              <code className="secret-output">{issued}</code>
              <small>
                It is shown only once by the API. Store it in your password
                manager.
              </small>
            </section>
          </aside>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {create ? (
            <>
              <label>
                Workspace name
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Finance"
                />
              </label>
              <label>
                Operator token
                <input
                  required
                  type="password"
                  autoComplete="off"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                />
              </label>
            </>
          ) : (
            <label>
              Workspace API key
              <input
                required
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="ll_…"
              />
            </label>
          )}
          <ErrorNotice error={error} />
          <button className="button primary full" disabled={busy}>
            {busy
              ? "Connecting…"
              : create
                ? "Create workspace"
                : "Open workspace"}
            <ArrowRight size={17} />
          </button>
        </form>
        <button
          className="text-button"
          onClick={() => {
            setCreate(!create);
            setError(null);
          }}
        >
          {create
            ? "Already have a key? Connect instead"
            : "Operator setup: create a workspace"}
        </button>
        <p className="login-security">
          <ShieldCheck size={15} />
          Credentials stay in memory and are cleared when you sign out or
          reload. Only use on a trusted device.
        </p>
      </section>
    </main>
  );
}

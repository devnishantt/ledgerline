import { useState } from "react";
import { Landmark, Plus } from "lucide-react";
import { post, useApi, type Account } from "../api";
import { currencies } from "../../domain/money";
import {
  Badge,
  Card,
  Empty,
  ErrorNotice,
  Feedback,
  Loading,
  PageHeader,
  Submit,
  useAction,
} from "../components/ui";
export function Accounts({ admin }: { admin: boolean }) {
  const q = useApi<{ items: Account[] }>("/accounts"),
    action = useAction(),
    [show, setShow] = useState(false),
    [name, setName] = useState(""),
    [currency, setCurrency] = useState("USD"),
    [institution, setInstitution] = useState("");
  return (
    <>
      <PageHeader
        eyebrow="BANKING FOUNDATION"
        title="Accounts"
        description="A separate currency and reconciliation period for every account."
        action={
          admin && (
            <button className="button primary" onClick={() => setShow(!show)}>
              <Plus size={16} />
              New account
            </button>
          )
        }
      />
      {show && (
        <Card title="Add an account">
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              void action.run(async () => {
                await post("/accounts", { name, currency, institution });
                setShow(false);
                setName("");
              });
            }}
          >
            <label>
              Account name
              <input
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Operating · October 2026"
              />
            </label>
            <label>
              Currency
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {currencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Institution
              <input
                maxLength={100}
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Bank or payment provider"
              />
            </label>
            <Submit busy={action.busy}>Create account</Submit>
          </form>
        </Card>
      )}
      <Feedback action={action} />
      <ErrorNotice error={q.error} />
      {q.isPending ? (
        <Loading />
      ) : !q.data?.items.length ? (
        <Card>
          <Empty title="Build your banking foundation">
            Create a period-specific account before importing statements.
            Accounts support up to 400 statement rows.
          </Empty>
        </Card>
      ) : (
        <section className="account-grid">
          {q.data.items.map((a) => (
            <article className="card account-card" key={a.id}>
              <header>
                <span className="account-icon">
                  <Landmark size={24} />
                </span>
                <Badge tone="green">{a.currency}</Badge>
              </header>
              <h2>{a.name}</h2>
              <p>{a.institution || "Independent account"}</p>
              <footer>
                <small>
                  Created {new Date(a.created_at).toLocaleDateString()}
                </small>
                <a href="#imports" className="text-link">
                  Import statements →
                </a>
              </footer>
            </article>
          ))}
        </section>
      )}
      <p className="footnote">
        Account currencies are fixed to keep matching and reporting exact.
        Create another account for a new currency or period.
      </p>
    </>
  );
}

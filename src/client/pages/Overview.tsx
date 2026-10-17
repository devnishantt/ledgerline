import { ArrowUpRight, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { useApi } from "../api";
import { formatMoney } from "../../domain/money";
import {
  Badge,
  Card,
  Empty,
  ErrorNotice,
  Loading,
  Metric,
  PageHeader,
} from "../components/ui";
export function Overview() {
  const q = useApi("/dashboard");
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorNotice error={q.error} />;
  const { summary, counts, recent } = q.data,
    rate = summary.transactions
      ? Math.round(
          ((summary.transactions - summary.unmatched) / summary.transactions) *
            100,
        )
      : 0;
  return (
    <>
      <PageHeader
        eyebrow="YOUR FINANCIAL CONTROL CENTER"
        title="Clarity at a glance."
        description="A considered view of your statements, exceptions, and the work ahead."
        action={
          <a className="button primary" href="#imports">
            Import a statement <ArrowUpRight size={16} />
          </a>
        }
      />
      <section className="welcome-strip">
        <section>
          <span className="tiny-label">FROM STATEMENT TO SIGN-OFF</span>
          <h2>
            Every transaction has a story.
            <br />
            Make sure both sides agree.
          </h2>
          <p>
            Import. Match. Independently review. Close with a trail you can
            verify.
          </p>
          <a href="#runs">
            Go to reconciliation <ArrowUpRight size={15} />
          </a>
        </section>
        <div className="completion-ring">
          <svg
            viewBox="0 0 120 120"
            role="img"
            aria-label={`${rate}% of statement rows approved`}
          >
            <circle
              cx="60"
              cy="60"
              r="49"
              fill="none"
              stroke="#d7e6de"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="49"
              fill="none"
              stroke="#235d4e"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${rate * 3.079} 307.9`}
              transform="rotate(-90 60 60)"
            />
            <text
              x="60"
              y="59"
              textAnchor="middle"
              fontSize="26"
              fill="#183e33"
            >
              {rate}%
            </text>
            <text x="60" y="76" textAnchor="middle" fontSize="8" fill="#6b8277">
              APPROVED ROWS
            </text>
          </svg>
        </div>
      </section>
      <section className="metrics-grid">
        <Metric
          label="Statement rows"
          value={summary.transactions.toLocaleString()}
          detail={`${counts.accounts} connected accounts`}
        />
        <Metric
          label="Approved pairs"
          value={summary.approved}
          detail="Independently reviewed matches"
          accent
        />
        <Metric
          label="Pending proposals"
          value={summary.proposed}
          detail="Waiting for a review decision"
        />
        <Metric
          label="Unmatched rows"
          value={summary.unmatched}
          detail="Not allocated to an approved pair"
        />
      </section>
      <section className="dashboard-grid">
        <Card
          title="Position by currency"
          action={<Badge>Never combined across currencies</Badge>}
        >
          {summary.currencies.length ? (
            <div className="currency-list">
              {summary.currencies.map((row: any) => (
                <article key={row.currency}>
                  <span className="currency-avatar">{row.currency}</span>
                  <section>
                    <h3>{formatMoney(row.bank, row.currency)}</h3>
                    <p>Bank statement balance</p>
                  </section>
                  <section className="currency-difference">
                    <Badge tone={row.difference === 0 ? "green" : "amber"}>
                      {row.difference === 0
                        ? "Balanced"
                        : formatMoney(row.difference, row.currency)}
                    </Badge>
                    <small>{row.unmatched} rows unresolved</small>
                  </section>
                </article>
              ))}
            </div>
          ) : (
            <Empty title="Your first statement starts here">
              Add an account, then import bank and ledger CSVs to see your
              position.
            </Empty>
          )}
          <a className="card-link" href="#transactions">
            Explore all transactions <ArrowUpRight size={15} />
          </a>
        </Card>
        <Card title="Close checklist">
          <ol className="checklist">
            {[
              [
                counts.accounts > 0,
                "Set up an account",
                "Choose a currency and institution.",
              ],
              [
                counts.imports >= 2,
                "Import both statements",
                "Bring bank and ledger records together.",
              ],
              [
                counts.runs > 0,
                "Run your matching rules",
                "Keep ambiguous candidates unresolved.",
              ],
              [
                summary.approved > 0,
                "Get an independent review",
                "A second credential approves the pairs.",
              ],
            ].map(([done, title, description], i) => (
              <li key={i}>
                <span className={done ? "step done" : "step"}>
                  {done ? <CheckCircle2 size={17} /> : i + 1}
                </span>
                <section>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </section>
              </li>
            ))}
          </ol>
          <div className="mini-note">
            <ShieldCheck size={18} />
            <span>
              Approval is separate from matching. Nothing is silently signed
              off.
            </span>
          </div>
        </Card>
      </section>
      <Card
        title="Recent workspace activity"
        action={
          <a className="text-link" href="#audit">
            View audit trail <ArrowUpRight size={14} />
          </a>
        }
      >
        {recent.length ? (
          <ul className="activity-list">
            {recent.map((event: any, i: number) => (
              <li key={i}>
                <span className="activity-icon">
                  <Clock3 size={16} />
                </span>
                <section>
                  <strong>{event.action.replaceAll(".", " ")}</strong>
                  <small>Actor {event.actor_id.slice(0, 8)}</small>
                </section>
                <time dateTime={event.created_at}>
                  {new Date(event.created_at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <Empty />
        )}
      </Card>
    </>
  );
}

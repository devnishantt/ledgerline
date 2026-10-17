import { useState } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { post, useApi, type Account, type RuleRow, type RunRow } from "../api";
import {
  Badge,
  Card,
  ErrorNotice,
  Feedback,
  PageHeader,
  Submit,
  useAction,
} from "../components/ui";
import { DataTable } from "../components/DataTable";
export function Runs({ admin }: { admin: boolean }) {
  const q = useApi<{ items: RunRow[] }>("/runs"),
    rules = useApi<{ items: RuleRow[] }>("/rules"),
    accounts = useApi<{ items: Account[] }>("/accounts"),
    action = useAction();
  const [show, setShow] = useState(false),
    [name, setName] = useState(""),
    [accountId, setAccount] = useState(""),
    [ruleId, setRule] = useState("");
  return (
    <>
      <PageHeader
        eyebrow="FROM PROPOSAL TO CONFIDENCE"
        title="Reconciliation"
        description="Immutable statement snapshots. Explainable matches. Independent sign-off."
        action={
          admin && (
            <button className="button primary" onClick={() => setShow(!show)}>
              <Plus size={16} />
              New reconciliation
            </button>
          )
        }
      />
      {show && (
        <Card title="Start a reconciliation">
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              void action.run(async () => {
                const detail = await post("/runs", { accountId, ruleId, name });
                window.location.hash = "runs/" + detail.run.id;
              });
            }}
          >
            <label>
              Run name
              <input
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="October operating close"
              />
            </label>
            <label>
              Account
              <select
                required
                value={accountId}
                onChange={(e) => {
                  setAccount(e.target.value);
                  setRule("");
                }}
              >
                <option value="">Select account</option>
                {accounts.data?.items.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Matching policy
              <select
                required
                value={ruleId}
                onChange={(e) => setRule(e.target.value)}
              >
                <option value="">Select matching rule</option>
                {rules.data?.items
                  .filter((r) => r.account_id === accountId)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </label>
            <Submit busy={action.busy}>Generate proposals</Submit>
          </form>
        </Card>
      )}
      <Feedback action={action} />
      <ErrorNotice error={q.error ?? rules.error ?? accounts.error} />
      <Card title="Reconciliation history">
        <DataTable
          rows={q.data?.items ?? []}
          columns={[
            {
              accessorKey: "name",
              header: "Reconciliation",
              cell: ({ row }) => (
                <a className="text-link" href={"#runs/" + row.original.id}>
                  {row.original.name}
                  <ArrowUpRight size={13} />
                </a>
              ),
            },
            { accessorKey: "account_name", header: "Account" },
            {
              accessorKey: "status",
              header: "State",
              cell: ({ getValue }) => (
                <Badge tone={getValue() === "finalized" ? "green" : "amber"}>
                  {getValue() as string}
                </Badge>
              ),
            },
            { accessorKey: "pending", header: "Pending review" },
            { accessorKey: "ambiguity_count", header: "Ambiguous candidates" },
            {
              id: "date",
              header: "Created",
              cell: ({ row }) =>
                new Date(row.original.created_at).toLocaleDateString(),
            },
          ]}
        />
      </Card>
    </>
  );
}

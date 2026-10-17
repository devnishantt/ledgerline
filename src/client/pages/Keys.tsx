import { useState } from "react";
import { Plus } from "lucide-react";
import { post, request, useApi } from "../api";
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
export function Keys() {
  const q = useApi<{ items: any[] }>("/keys"),
    action = useAction(),
    [show, setShow] = useState(false),
    [label, setLabel] = useState(""),
    [role, setRole] = useState("reviewer"),
    [days, setDays] = useState(30),
    [issued, setIssued] = useState("");
  return (
    <>
      <PageHeader
        eyebrow="SEPARATE DUTIES, CLEAR IDENTITIES"
        title="Access & keys"
        description="Issue one credential per separately controlled identity. Rotate before expiry."
        action={
          <button className="button primary" onClick={() => setShow(!show)}>
            <Plus size={16} />
            Issue credential
          </button>
        }
      />
      <Feedback action={action} />
      <ErrorNotice error={q.error} />
      {issued && (
        <aside className="notice success">
          <section>
            <strong>
              Save this credential securely. It is only returned once.
            </strong>
            <code className="secret-output">{issued}</code>
            <button className="text-button" onClick={() => setIssued("")}>
              Dismiss credential
            </button>
          </section>
        </aside>
      )}
      {show && (
        <Card title="Issue an access key">
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              void action.run(async () => {
                const result = await post("/keys", {
                  label,
                  role,
                  expiresInDays: days,
                });
                setIssued(result.key);
                setShow(false);
              });
            }}
          >
            <label>
              Identity label
              <input
                required
                minLength={2}
                maxLength={100}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Reviewer · finance operations"
              />
            </label>
            <label>
              Role
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="reviewer">Reviewer · approve or reject</option>
                <option value="viewer">Viewer · read only</option>
                <option value="admin">Administrator · manage workspace</option>
              </select>
            </label>
            <label>
              Expires in days
              <input
                type="number"
                min={1}
                max={365}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </label>
            <Submit busy={action.busy}>Issue key</Submit>
          </form>
        </Card>
      )}
      <Card title="Credential metadata">
        <DataTable
          rows={q.data?.items ?? []}
          columns={[
            { accessorKey: "label", header: "Identity" },
            {
              accessorKey: "role",
              header: "Role",
              cell: ({ getValue }) => <Badge>{getValue() as string}</Badge>,
            },
            {
              accessorKey: "prefix",
              header: "Key prefix",
              cell: ({ getValue }) => <code>{getValue() as string}…</code>,
            },
            {
              id: "expiry",
              header: "Expires",
              cell: ({ row }) =>
                new Date(row.original.expires_at).toLocaleDateString(),
            },
            {
              id: "status",
              header: "State",
              cell: ({ row }) => (
                <Badge
                  tone={
                    row.original.revoked_at
                      ? "red"
                      : row.original.expires_at < new Date().toISOString()
                        ? "amber"
                        : "green"
                  }
                >
                  {row.original.revoked_at
                    ? "Revoked"
                    : row.original.expires_at < new Date().toISOString()
                      ? "Expired"
                      : "Active"}
                </Badge>
              ),
            },
            {
              id: "revoke",
              header: "Action",
              cell: ({ row }) =>
                !row.original.revoked_at && (
                  <button
                    className="text-button destructive"
                    disabled={action.busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Revoke this key? It will lose access immediately.",
                        )
                      )
                        void action.run(
                          () =>
                            request("/keys/" + row.original.id, {
                              method: "DELETE",
                            }),
                          "Credential revoked.",
                        );
                    }}
                  >
                    Revoke
                  </button>
                ),
            },
          ]}
        />
      </Card>
      <p className="footnote">
        The initial administrator credential expires after 30 days. Keep a
        separately stored rotating administrator key; expired keys cannot
        recover themselves.
      </p>
    </>
  );
}

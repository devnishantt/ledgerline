import { daysBetween } from "./dates";
import { referenceKey } from "./normalize";
import type { Candidate, Rule, Transaction } from "./types";
export function scorePair(
  bank: Transaction,
  ledger: Transaction,
  rule: Rule,
): Omit<Candidate, "ambiguous"> | null {
  if (
    bank.side !== "bank" ||
    ledger.side !== "ledger" ||
    bank.account_id !== ledger.account_id ||
    bank.workspace_id !== ledger.workspace_id ||
    bank.currency !== ledger.currency
  )
    return null;
  const variance = bank.amount - ledger.amount,
    days = daysBetween(bank.date, ledger.date);
  if (Math.abs(variance) > rule.tolerance || days > rule.date_window)
    return null;
  const a = referenceKey(bank.reference),
    b = referenceKey(ledger.reference);
  const sameReference = Boolean(a && b && a === b);
  if (rule.reference_mode === "require" && !sameReference) return null;
  const score =
    (variance === 0 ? 60 : 40) +
    (days === 0 ? 20 : Math.max(0, 20 - days * 3)) +
    (rule.reference_mode !== "ignore" && sameReference ? 20 : 0);
  if (score < rule.min_score) return null;
  return {
    bankId: bank.id,
    ledgerId: ledger.id,
    score,
    variance,
    reason: [
      variance === 0 ? "Exact amount" : "Within tolerance",
      days === 0 ? "same day" : `${days} day gap`,
      sameReference ? "reference aligned" : "no aligned reference",
    ].join(" · "),
  };
}
export function propose(transactions: Transaction[], rule: Rule): Candidate[] {
  const bank = transactions.filter((t) => t.side === "bank"),
    ledger = transactions.filter((t) => t.side === "ledger");
  const all = bank.flatMap((a) =>
    ledger
      .map((b) => scorePair(a, b, rule))
      .filter((p): p is NonNullable<typeof p> => p !== null),
  );
  const proposals: Candidate[] = [];
  // Tied best candidates stay unresolved. We never arbitrarily allocate money.
  for (const transaction of bank) {
    const ranked = all
      .filter((p) => p.bankId === transaction.id)
      .sort(
        (a, b) => b.score - a.score || a.ledgerId.localeCompare(b.ledgerId),
      );
    const best = ranked[0];
    if (!best) continue;
    const rival = all.some(
      (p) =>
        p.bankId !== best.bankId &&
        p.ledgerId === best.ledgerId &&
        p.score >= best.score,
    );
    proposals.push({
      ...best,
      ambiguous: Boolean(ranked[1]?.score === best.score || rival),
    });
  }
  const used = new Set<string>();
  return proposals
    .sort((a, b) => b.score - a.score || a.bankId.localeCompare(b.bankId))
    .map((p) => {
      const conflict = used.has(p.ledgerId);
      if (!p.ambiguous && !conflict) used.add(p.ledgerId);
      return { ...p, ambiguous: p.ambiguous || conflict };
    });
}

export const currencies = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "INR",
  "CHF",
  "SGD",
  "SEK",
] as const;
export type Currency = (typeof currencies)[number];
export function exponent(currency: string): number {
  if (!currencies.includes(currency as Currency))
    throw new Error("Unsupported currency");
  return currency === "JPY" ? 0 : 2;
}
export function toMinor(value: string, currency: string): number {
  const digits = exponent(currency);
  if (!/^-?\d+(\.\d+)?$/.test(value.trim()))
    throw new Error("Amount must be a plain decimal");
  const negative = value.trim().startsWith("-");
  const [whole, fraction = ""] = value.trim().replace("-", "").split(".");
  if (fraction.length > digits)
    throw new Error("Too many decimal places for currency");
  const minor =
    BigInt(whole) * 10n ** BigInt(digits) +
    BigInt(fraction.padEnd(digits, "0") || "0");
  if (minor > 9_000_000_000_000n)
    throw new Error("Amount exceeds supported limit");
  return Number(minor) * (negative && minor !== 0n ? -1 : 1);
}
export function decimal(minor: number, currency: string): string {
  if (!Number.isSafeInteger(minor))
    throw new Error("Minor amount must be a safe integer");
  const digits = exponent(currency),
    abs = Math.abs(minor);
  return `${minor < 0 ? "-" : ""}${Math.floor(abs / 10 ** digits)}${digits ? "." + String(abs % 10 ** digits).padStart(digits, "0") : ""}`;
}
export function formatMoney(minor: number, currency: string): string {
  exponent(currency);
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    minor / 10 ** exponent(currency),
  );
}

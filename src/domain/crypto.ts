export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
      .join(",") +
    "}"
  );
}
export async function digest(value: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(hash), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
export function newKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return (
    "ll_" + Array.from(bytes, (n) => n.toString(16).padStart(2, "0")).join("")
  );
}
export async function secretEqual(a: string, b: string): Promise<boolean> {
  const x = await digest(a),
    y = await digest(b);
  let difference = 0;
  for (let i = 0; i < x.length; i++)
    difference |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return difference === 0;
}
export const id = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

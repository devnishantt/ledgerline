export type Value = string | number | null;
export interface Statement {
  bind(...values: Value[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown[]>;
}
export type Operation = { sql: string; params?: Value[] };
export async function all<T>(
  db: Database,
  sql: string,
  params: Value[] = [],
): Promise<T[]> {
  return (
    await db
      .prepare(sql)
      .bind(...params)
      .all<T>()
  ).results;
}
export async function first<T>(
  db: Database,
  sql: string,
  params: Value[] = [],
): Promise<T | null> {
  return db
    .prepare(sql)
    .bind(...params)
    .first<T>();
}
export async function batch(
  db: Database,
  operations: Operation[],
): Promise<void> {
  await db.batch(
    operations.map((o) => db.prepare(o.sql).bind(...(o.params ?? []))),
  );
}
export function insertMany(
  table: string,
  columns: string[],
  rows: Value[][],
): Operation[] {
  if (!/^[a-z_]+$/.test(table) || columns.some((c) => !/^[a-z_]+$/.test(c)))
    throw new Error("Unsafe SQL identifier");
  const size = Math.floor(90 / columns.length),
    result: Operation[] = [];
  if (size < 1 || rows.some((r) => r.length !== columns.length))
    throw new Error("Invalid insert shape");
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    result.push({
      sql: `INSERT INTO ${table} (${columns.join(",")}) VALUES ${chunk.map(() => "(" + columns.map(() => "?").join(",") + ")").join(",")}`,
      params: chunk.flat(),
    });
  }
  return result;
}

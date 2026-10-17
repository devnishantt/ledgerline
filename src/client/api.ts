import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
z.config({ jitless: true });
const errorEnvelope = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
import type { Match, Run, Transaction, Rule } from "../domain/types";
let credential = "";
export const setCredential = (key: string) => {
  credential = key;
};
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function request<T = any>(
  path: string,
  options: RequestInit = {},
  override?: string,
): Promise<T> {
  const response = await fetch("/api" + path, {
    ...options,
    headers: {
      Authorization: "Bearer " + (override ?? credential),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const content = await response.json();
  if (!response.ok) {
    const parsed = errorEnvelope.safeParse(content);
    throw new ApiError(
      response.status,
      parsed.success ? parsed.data.error.code : "REQUEST_FAILED",
      parsed.success ? parsed.data.error.message : "Request failed",
    );
  }
  return content as T;
}
export const post = <T = any>(path: string, data: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(data) });
export const useApi = <T = any>(path: string) =>
  useQuery<T>({
    queryKey: [path],
    queryFn: () => request<T>(path),
    retry: false,
  });
export async function download(path: string, filename: string) {
  const response = await fetch("/api" + path, {
    headers: { Authorization: "Bearer " + credential },
  });
  if (!response.ok) {
    const parsed = errorEnvelope.safeParse(await response.json());
    throw new Error(
      parsed.success ? parsed.data.error.message : "Export failed",
    );
  }
  const url = URL.createObjectURL(await response.blob()),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export type Account = {
  id: string;
  name: string;
  currency: string;
  institution: string;
  created_at: string;
};
export type RuleRow = Rule & { account_name: string };
export type RunRow = Run & {
  account_name: string;
  pending: number;
  ambiguity_count: number;
};
export type Detail = {
  run: RunRow;
  transactions: Transaction[];
  matches: Match[];
  summary: {
    transactions: number;
    approved: number;
    proposed: number;
    rejected: number;
    unmatched: number;
    currencies: {
      currency: string;
      bank: number;
      ledger: number;
      difference: number;
      unmatched: number;
    }[];
  };
};

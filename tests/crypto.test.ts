import { test, expect } from "bun:test";
import { canonical, digest, newKey, secretEqual } from "../src/domain/crypto";

test("canonicalize nested object keys while preserving array order", async () => {
  expect(canonical({ z: [2, 1], a: { y: 2, x: 1 } })).toBe(
    '{"a":{"x":1,"y":2},"z":[2,1]}',
  );
});

test("hash the standard SHA-256 empty input vector", async () => {
  expect(await digest("")).toBe(
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
});

test("generate unique high-entropy credential values", async () => {
  const key = newKey();
  expect(key).toMatch(/^ll_[a-f0-9]{64}$/);
  expect(newKey()).not.toBe(key);
});

test("compare equal and unequal secrets without length exceptions", async () => {
  expect(await secretEqual("same", "same")).toBe(true);
  expect(await secretEqual("same", "")).toBe(false);
});

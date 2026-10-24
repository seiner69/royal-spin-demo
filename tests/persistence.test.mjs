import assert from "node:assert/strict";
import test from "node:test";
import { readSavedProgress, writeSavedProgress } from "../.test-build/persistence.js";

const progress = Object.freeze({ balance: 1250, totalWin: 300, spins: 5, wins: 2 });
const storageWith = (saved) => ({ getItem: () => saved, setItem: () => {} });

test("restores a valid synthetic save with the established storage key", () => {
  const storage = storageWith(JSON.stringify(progress));
  storage.getItem = (key) => { assert.equal(key, "royal-spin-save"); return JSON.stringify(progress); };
  assert.deepEqual(readSavedProgress(() => storage), progress);
});

test("missing, damaged and non-object saves do not block initialization", () => {
  for (const saved of [null, "", "{broken", "null", "[]", "42", '"text"']) {
    assert.equal(readSavedProgress(() => storageWith(saved)), null);
  }
});

test("restoration only accepts the existing numeric progress fields", () => {
  assert.deepEqual(readSavedProgress(() => storageWith(JSON.stringify({
    balance: 500, totalWin: "300", spins: 2, wins: null, unrelated: "ignored",
  }))), { balance: 500, spins: 2 });
});

test("a read error is treated as an unavailable save", () => {
  const storage = { getItem() { throw new DOMException("Synthetic denied read", "SecurityError"); }, setItem() {} };
  assert.equal(readSavedProgress(() => storage), null);
});

test("a throwing storage property getter is contained during reads and writes", () => {
  const host = {};
  Object.defineProperty(host, "localStorage", {
    get() { throw new DOMException("Synthetic blocked storage", "SecurityError"); },
  });
  const provider = () => host.localStorage;
  assert.equal(readSavedProgress(provider), null);
  assert.equal(writeSavedProgress(progress, provider), false);
});

test("successful writes preserve the key and the complete synthetic payload", () => {
  let stored;
  const storage = { getItem: () => null, setItem(key, value) { stored = { key, value }; } };
  assert.equal(writeSavedProgress(progress, () => storage), true);
  assert.equal(stored.key, "royal-spin-save");
  assert.deepEqual(JSON.parse(stored.value), progress);
});

test("quota and access write failures return false without changing in-memory progress", () => {
  for (const name of ["QuotaExceededError", "SecurityError"]) {
    const storage = { getItem: () => null, setItem() { throw new DOMException("Synthetic write failure", name); } };
    assert.equal(writeSavedProgress(progress, () => storage), false);
    assert.deepEqual(progress, { balance: 1250, totalWin: 300, spins: 5, wins: 2 });
  }
});

test("a later successful write is still possible after a transient failure", () => {
  let fail = true, stored;
  const storage = { getItem: () => null, setItem(key, value) {
    if (fail) throw new DOMException("Synthetic storage full", "QuotaExceededError");
    stored = { key, value };
  } };
  assert.equal(writeSavedProgress(progress, () => storage), false);
  fail = false;
  assert.equal(writeSavedProgress(progress, () => storage), true);
  assert.deepEqual(JSON.parse(stored.value), progress);
});

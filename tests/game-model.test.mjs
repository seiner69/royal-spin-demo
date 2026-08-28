import assert from "node:assert/strict";
import test from "node:test";
import { BETS, PAYLINES, STARTING_BALANCE, makeOutcome, randomGrid } from "../.test-build/game-model.js";

test("game constants stay within the intended virtual-chip model", () => {
  assert.equal(STARTING_BALANCE, 20_000);
  assert.deepEqual(BETS, [50, 100, 250, 500]);
  assert.equal(PAYLINES.length, 5);
  assert.ok(PAYLINES.every((line) => line.length === 5));
});

test("random grid always contains fifteen known symbols", () => {
  const grid = randomGrid(() => 0.5);
  assert.equal(grid.length, 15);
  assert.ok(grid.every((symbol) => ["seven", "diamond", "crown", "star", "bell", "cherry"].includes(symbol)));
});

test("deterministic sources cover every payout tier", () => {
  const mega = makeOutcome(100, () => 0);
  const big = makeOutcome(100, () => 0.1);
  const win = makeOutcome(100, () => 0.5);
  const miss = makeOutcome(100, () => 0.9);

  assert.equal(mega.tier, "mega");
  assert.equal(mega.payout, 3000);
  assert.equal(mega.winningCells.length, 5);
  assert.equal(big.tier, "big");
  assert.ok(big.payout >= 800);
  assert.equal(win.tier, "win");
  assert.equal(win.winningCells.length, 3);
  assert.equal(miss.tier, "miss");
  assert.equal(miss.payout, 0);
});

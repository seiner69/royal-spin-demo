export type SymbolKey = "seven" | "diamond" | "crown" | "star" | "bell" | "cherry";

export type Outcome = {
  grid: SymbolKey[];
  payout: number;
  multiplier: number;
  winningCells: number[];
  tier: "miss" | "win" | "big" | "mega";
  label: string;
};

export const SYMBOLS: Record<SymbolKey, { glyph: string; label: string }> = {
  seven: { glyph: "7", label: "幸运七" },
  diamond: { glyph: "◆", label: "钻石" },
  crown: { glyph: "♛", label: "皇冠" },
  star: { glyph: "★", label: "金星" },
  bell: { glyph: "●", label: "金球" },
  cherry: { glyph: "●●", label: "樱桃" },
};

const SYMBOL_KEYS = Object.keys(SYMBOLS) as SymbolKey[];

export const PAYLINES = [
  [5, 6, 7, 8, 9],
  [0, 1, 2, 3, 4],
  [10, 11, 12, 13, 14],
  [0, 6, 12, 8, 4],
  [10, 6, 2, 8, 14],
] as const;

export const BETS = [50, 100, 250, 500] as const;
export const STARTING_BALANCE = 20_000;

type RandomSource = () => number;

function pick<T>(items: readonly T[], random: RandomSource): T {
  return items[Math.floor(random() * items.length)];
}

export function randomSymbol(random: RandomSource = Math.random): SymbolKey {
  return pick(SYMBOL_KEYS, random);
}

export function randomGrid(random: RandomSource = Math.random): SymbolKey[] {
  return Array.from({ length: 15 }, () => randomSymbol(random));
}

export function makeOutcome(bet: number, random: RandomSource = Math.random): Outcome {
  const roll = random();
  const grid = randomGrid(random);
  const line = pick(PAYLINES, random);

  if (roll < 0.08) {
    line.forEach((cell) => (grid[cell] = "seven"));
    const multiplier = pick([30, 40, 50], random);
    return { grid, payout: bet * multiplier, multiplier, winningCells: [...line], tier: "mega", label: "传奇大奖" };
  }

  if (roll < 0.28) {
    const symbol = pick<SymbolKey>(["crown", "diamond", "seven"], random);
    line.forEach((cell) => (grid[cell] = symbol));
    const multiplier = pick([8, 10, 15], random);
    return { grid, payout: bet * multiplier, multiplier, winningCells: [...line], tier: "big", label: "超级大奖" };
  }

  if (roll < 0.82) {
    const symbol = pick<SymbolKey>(["cherry", "star", "bell", "diamond"], random);
    const start = random() > 0.5 ? 0 : 2;
    const cells = line.slice(start, start + 3);
    cells.forEach((cell) => (grid[cell] = symbol));
    const multiplier = pick([1.5, 2, 3, 4], random);
    return { grid, payout: Math.round(bet * multiplier), multiplier, winningCells: [...cells], tier: "win", label: "漂亮命中" };
  }

  return { grid, payout: 0, multiplier: 0, winningCells: [], tier: "miss", label: "差一点" };
}

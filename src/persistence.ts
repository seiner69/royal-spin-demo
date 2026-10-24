export type SavedProgress = {
  balance: number;
  totalWin: number;
  spins: number;
  wins: number;
};

type ProgressStorage = Pick<Storage, "getItem" | "setItem">;
type StorageProvider = () => ProgressStorage;

const SAVE_KEY = "royal-spin-save";
const getBrowserStorage: StorageProvider = () => window.localStorage;

// Persistence is optional: even obtaining localStorage can throw in a browser.
export function readSavedProgress(
  getStorage: StorageProvider = getBrowserStorage,
): Partial<SavedProgress> | null {
  try {
    const saved = getStorage().getItem(SAVE_KEY);
    if (!saved) return null;
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    const record = parsed as Record<string, unknown>;
    const progress: Partial<SavedProgress> = {};
    for (const key of ["balance", "totalWin", "spins", "wins"] as const) {
      if (typeof record[key] === "number") progress[key] = record[key];
    }
    return progress;
  } catch {
    return null;
  }
}

export function writeSavedProgress(
  progress: SavedProgress,
  getStorage: StorageProvider = getBrowserStorage,
): boolean {
  try {
    getStorage().setItem(SAVE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    // Keep the current game in memory if access is denied or the quota is full.
    return false;
  }
}

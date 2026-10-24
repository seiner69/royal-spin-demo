import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { BETS, STARTING_BALANCE, SYMBOLS, makeOutcome, randomGrid } from "./game-model";
import type { Outcome, SymbolKey } from "./game-model";
import { readSavedProgress, writeSavedProgress } from "./persistence";

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function playWinSound(tier: Outcome["tier"]) {
  if (tier === "miss" || typeof window === "undefined") return;
  const AudioCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtor) return;

  const context = new AudioCtor();
  const notes = tier === "mega" ? [523, 659, 784, 1047] : tier === "big" ? [440, 554, 659] : [523, 659];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.14, context.currentTime + index * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.08 + 0.22);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(context.currentTime + index * 0.08);
    oscillator.stop(context.currentTime + index * 0.08 + 0.24);
  });
  window.setTimeout(() => void context.close(), 900);
}

export default function Home() {
  const [grid, setGrid] = useState<SymbolKey[]>([
    "crown", "diamond", "seven", "star", "cherry",
    "cherry", "seven", "seven", "seven", "diamond",
    "bell", "star", "crown", "bell", "cherry",
  ]);
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [betIndex, setBetIndex] = useState(1);
  const [spinning, setSpinning] = useState(false);
  const [autoLeft, setAutoLeft] = useState(0);
  const [result, setResult] = useState<Outcome | null>(null);
  const [totalWin, setTotalWin] = useState(0);
  const [spins, setSpins] = useState(0);
  const [wins, setWins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const bet = BETS[betIndex];
  const hitRate = spins ? Math.round((wins / spins) * 100) : 82;
  const jackpot = useMemo(() => 8_888_888 + spins * 137, [spins]);

  useEffect(() => {
    const saved = readSavedProgress();
    if (saved) {
      if (saved.balance !== undefined) setBalance(saved.balance);
      if (saved.totalWin !== undefined) setTotalWin(saved.totalWin);
      if (saved.spins !== undefined) setSpins(saved.spins);
      if (saved.wins !== undefined) setWins(saved.wins);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeSavedProgress({ balance, totalWin, spins, wins });
  }, [balance, hydrated, spins, totalWin, wins]);

  const spin = useCallback(
    (fromAuto = false) => {
      if (spinning || balance < bet) {
        if (balance < bet) setAutoLeft(0);
        return;
      }

      setSpinning(true);
      setResult(null);
      setBalance((value) => value - bet);

      const ticker = window.setInterval(() => setGrid(randomGrid()), 70);
      window.setTimeout(() => {
        window.clearInterval(ticker);
        const next = makeOutcome(bet);
        setGrid(next.grid);
        setResult(next);
        setBalance((value) => value + next.payout);
        setSpins((value) => value + 1);

        if (next.payout > 0) {
          setTotalWin((value) => value + next.payout);
          setWins((value) => value + 1);
          setStreak((value) => value + 1);
          playWinSound(next.tier);
        } else {
          setStreak(0);
        }

        setSpinning(false);
        if (fromAuto) setAutoLeft((value) => Math.max(0, value - 1));
      }, 930);
    },
    [balance, bet, spinning],
  );

  useEffect(() => {
    if (autoLeft <= 0 || spinning) return;
    const timer = window.setTimeout(() => spin(true), 360);
    return () => window.clearTimeout(timer);
  }, [autoLeft, spin, spinning]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.code === "Space" && !target?.closest("button, input, select")) {
        event.preventDefault();
        spin(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [spin]);

  const changeBet = (direction: number) => {
    if (spinning || autoLeft > 0) return;
    setBetIndex((value) => Math.max(0, Math.min(BETS.length - 1, value + direction)));
  };

  const toggleAuto = () => {
    if (spinning && autoLeft === 0) return;
    setAutoLeft((value) => (value > 0 ? 0 : 20));
  };

  const refill = () => {
    setBalance(STARTING_BALANCE);
    setTotalWin(0);
    setSpins(0);
    setWins(0);
    setStreak(0);
    setResult(null);
    setAutoLeft(0);
  };

  return (
    <main className="game-shell">
      <div className="casino-glow casino-glow-left" aria-hidden="true" />
      <div className="casino-glow casino-glow-right" aria-hidden="true" />

      <header className="topbar">
        <div className="brand-lockup" aria-label="Royal Spin">
          <span className="brand-crown">♛</span>
          <span>
            <b>ROYAL</b>
            <em>SPIN</em>
          </span>
        </div>

        <div className="top-status">
          <div className="profile-chip">
            <span className="avatar">R</span>
            <span><small>尊享玩家</small><strong>LV. 28</strong></span>
          </div>
          <div className="balance-chip" aria-live="polite">
            <span className="coin">●</span>
            <span><small>虚拟筹码</small><strong>{formatNumber(balance)}</strong></span>
            <button type="button" onClick={refill} aria-label="重新领取两万虚拟筹码">＋</button>
          </div>
          <button className="daily-button" type="button" onClick={refill}>
            <span>每日奖励</span>
            <strong>领取筹码</strong>
          </button>
        </div>
      </header>

      <section className="game-layout">
        <aside className="event-rail" aria-label="游戏活动">
          <div className="vip-card">
            <span className="vip-kicker">ROYAL CLUB</span>
            <span className="vip-gem">◆</span>
            <h2>黑钻特权</h2>
            <p>本局奖励加速中</p>
            <div className="vip-progress"><i /></div>
            <small>距离下一等级 680 XP</small>
          </div>
          <div className="mini-card">
            <span className="mini-icon">♠</span>
            <div><small>幸运时刻</small><strong>命中率 82%</strong></div>
          </div>
          <div className="mini-card">
            <span className="mini-icon gold">★</span>
            <div><small>连胜加成</small><strong>{streak ? `x${Math.min(5, streak + 1)}` : "等待触发"}</strong></div>
          </div>
        </aside>

        <section className={`slot-stage ${result?.tier === "mega" ? "mega-active" : ""}`} aria-label="五轴三行高爆率老虎机">
          <div className="jackpot-marquee">
            <span className="jackpot-wing">◆</span>
            <div>
              <small>GRAND JACKPOT</small>
              <strong>{formatNumber(jackpot)}</strong>
            </div>
            <span className="jackpot-wing">◆</span>
          </div>

          <div className="machine-frame">
            <div className="machine-header">
              <div className="payout-mode"><i /> 爽玩模式 · 82% 命中</div>
              <div className="paylines">5 条高能中奖线</div>
            </div>

            <div className={`reels ${spinning ? "is-spinning" : ""}`} aria-live="polite" aria-busy={spinning}>
              <div className="reel-shine" aria-hidden="true" />
              <div className="payline-line" aria-hidden="true" />
              {grid.map((symbol, index) => {
                const winning = result?.winningCells.includes(index);
                return (
                  <div
                    className={`symbol symbol-${symbol} ${winning ? "is-winning" : ""}`}
                    key={`${index}-${symbol}`}
                    aria-label={SYMBOLS[symbol].label}
                  >
                    <span>{SYMBOLS[symbol].glyph}</span>
                  </div>
                );
              })}
            </div>

            <div className="win-display" aria-live="assertive">
              {spinning ? (
                <><small>好运正在聚拢</small><strong>SPINNING</strong></>
              ) : result ? (
                <><small>{result.label}{result.multiplier ? ` · ${result.multiplier}X` : ""}</small><strong className={`win-${result.tier}`}>{result.payout ? `+${formatNumber(result.payout)}` : "再来一把"}</strong></>
              ) : (
                <><small>上一局赢得</small><strong>+2,500</strong></>
              )}
            </div>

            <div className="control-deck">
              <div className="bet-control">
                <small>单次下注</small>
                <div>
                  <button type="button" onClick={() => changeBet(-1)} disabled={betIndex === 0 || spinning || autoLeft > 0} aria-label="减少下注">−</button>
                  <strong>{formatNumber(bet)}</strong>
                  <button type="button" onClick={() => changeBet(1)} disabled={betIndex === BETS.length - 1 || spinning || autoLeft > 0} aria-label="增加下注">＋</button>
                </div>
              </div>

              <button
                className="spin-button"
                type="button"
                onClick={() => spin(false)}
                disabled={spinning || autoLeft > 0 || balance < bet}
              >
                <span className="spin-arrow">↻</span>
                <span><strong>{spinning ? "旋转中" : "开始旋转"}</strong><small>按空格键也可以</small></span>
              </button>

              <button
                className={`auto-button ${autoLeft > 0 ? "is-on" : ""}`}
                type="button"
                onClick={toggleAuto}
                aria-pressed={autoLeft > 0}
              >
                <span className="toggle"><i /></span>
                <span><small>自动旋转</small><strong>{autoLeft > 0 ? `剩余 ${autoLeft} 次` : "连转 20 次"}</strong></span>
              </button>
            </div>
          </div>

          {result && result.tier !== "miss" && (
            <div className={`celebration celebration-${result.tier}`} aria-hidden="true">
              {Array.from({ length: 28 }, (_, index) => (
                <i
                  key={index}
                  style={{
                    "--x": `${(index * 37) % 100}%`,
                    "--d": `${(index % 7) * 0.07}s`,
                    "--r": `${(index * 53) % 360}deg`,
                  } as CSSProperties}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="stats-rail" aria-label="游戏统计">
          <div className="boost-card">
            <span className="boost-tag">LIMITED</span>
            <span className="boost-title">SUPER<br />BOOST</span>
            <span className="boost-multiplier">最高 50X</span>
            <small>大奖概率已提升</small>
          </div>
          <div className="stats-card">
            <h2>本机战绩</h2>
            <dl>
              <div><dt>实际命中</dt><dd>{hitRate}%</dd></div>
              <div><dt>累计赢得</dt><dd>{formatNumber(totalWin)}</dd></div>
              <div><dt>旋转次数</dt><dd>{formatNumber(spins)}</dd></div>
            </dl>
          </div>
          <p className="game-note">仅供娱乐 · 只使用虚拟金币<br />不提供充值、提现或实物奖励</p>
        </aside>
      </section>

      <nav className="bottom-nav" aria-label="主导航">
        <button className="active" type="button"><span>♛</span>老虎机</button>
        <button type="button"><span>♠</span>大厅</button>
        <button type="button"><span>◆</span>赛事</button>
        <button type="button"><span>★</span>奖励</button>
        <button type="button"><span>●</span>我的</button>
      </nav>
    </main>
  );
}

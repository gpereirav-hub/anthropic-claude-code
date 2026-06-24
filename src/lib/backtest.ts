// Backtesting: paste historical bet results as CSV and get ROI, hit rate and
// variance. Deliberately format-tolerant so users can drop in a tracker export.
//
// Expected columns (header row, case-insensitive, order-free):
//   stake   — wager amount
//   odds    — decimal odds of the bet (combined parlay odds are fine)
//   result  — win | loss | push | void   (push/void return the stake)
// Extra columns are ignored.

export interface BacktestRow {
  stake: number;
  odds: number;
  result: "win" | "loss" | "push";
  profit: number;
}

export interface BacktestSummary {
  rows: BacktestRow[];
  bets: number;
  wins: number;
  losses: number;
  pushes: number;
  hitRate: number;
  totalStaked: number;
  totalProfit: number;
  /** ROI = total profit / total staked. */
  roi: number;
  /** Std dev of per-bet ROI (profit/stake), a variance read on the strategy. */
  unitStdDev: number;
  errors: string[];
}

function normalizeResult(s: string): "win" | "loss" | "push" | null {
  const v = s.trim().toLowerCase();
  if (["win", "won", "w", "1", "true"].includes(v)) return "win";
  if (["loss", "lose", "lost", "l", "0", "false"].includes(v)) return "loss";
  if (["push", "void", "p", "refund", "tie"].includes(v)) return "push";
  return null;
}

/** Minimal CSV splitter (handles simple quoted fields). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

export function parseBacktestCsv(csv: string): BacktestSummary {
  const errors: string[] = [];
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return emptySummary(["Need a header row plus at least one data row."]);
  }

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const iStake = header.findIndex((h) => /stake|wager|risk|amount/.test(h));
  const iOdds = header.findIndex((h) => /odds|price|dec/.test(h));
  const iResult = header.findIndex((h) => /result|outcome|status|won/.test(h));

  if (iStake < 0 || iOdds < 0 || iResult < 0) {
    errors.push("Could not find stake / odds / result columns in the header.");
    return emptySummary(errors);
  }

  const rows: BacktestRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r]);
    const stake = parseFloat(cells[iStake]);
    const odds = parseFloat(cells[iOdds]);
    const result = normalizeResult(cells[iResult] ?? "");
    if (!Number.isFinite(stake) || !Number.isFinite(odds) || odds <= 1 || result === null) {
      errors.push(`Row ${r + 1}: skipped (bad stake/odds/result).`);
      continue;
    }
    let profit = 0;
    if (result === "win") profit = stake * (odds - 1);
    else if (result === "loss") profit = -stake;
    else profit = 0; // push returns stake
    rows.push({ stake, odds, result, profit });
  }

  return summarize(rows, errors);
}

function summarize(rows: BacktestRow[], errors: string[]): BacktestSummary {
  const bets = rows.length;
  const wins = rows.filter((r) => r.result === "win").length;
  const losses = rows.filter((r) => r.result === "loss").length;
  const pushes = rows.filter((r) => r.result === "push").length;
  const decided = wins + losses;
  const totalStaked = rows.reduce((s, r) => s + r.stake, 0);
  const totalProfit = rows.reduce((s, r) => s + r.profit, 0);

  const unitReturns = rows.map((r) => (r.stake > 0 ? r.profit / r.stake : 0));
  const meanUnit = unitReturns.reduce((a, b) => a + b, 0) / Math.max(1, bets);
  const unitVar =
    unitReturns.reduce((a, b) => a + (b - meanUnit) ** 2, 0) / Math.max(1, bets);

  return {
    rows,
    bets,
    wins,
    losses,
    pushes,
    hitRate: decided > 0 ? wins / decided : 0,
    totalStaked,
    totalProfit,
    roi: totalStaked > 0 ? totalProfit / totalStaked : 0,
    unitStdDev: Math.sqrt(Math.max(0, unitVar)),
    errors,
  };
}

function emptySummary(errors: string[]): BacktestSummary {
  return {
    rows: [],
    bets: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    hitRate: 0,
    totalStaked: 0,
    totalProfit: 0,
    roi: 0,
    unitStdDev: 0,
    errors,
  };
}

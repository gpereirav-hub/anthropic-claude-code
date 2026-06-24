# Parlay Analyzer — The Honest Numbers

A single-page sports-betting **parlay analyzer** that tells you, with real math and
real context, whether a parlay is actually worth placing. Not a payout calculator —
it estimates *true* probability, strips out the sportsbook's vig, accounts for how
legs interact, and gives a clear-eyed verdict even when that verdict is "don't bet
this."

Everything runs **client-side**. No data leaves the browser; nothing is persisted.

![client-side](https://img.shields.io/badge/logic-100%25%20client--side-34d399)

## What it does

- **Odds in any format** — American (`+150` / `-200`), decimal (`2.50`), fractional
  (`3/2`), with auto-conversion and a display toggle.
- **Vig / juice removal** — three selectable methods (multiplicative / normalization,
  **Shin's method**, and the **power/log** method), with per-leg hold and the
  **compounded** vig across the whole parlay made brutally visible.
- **Expected value** — per-leg and parlay EV%, EV in dollars, the long-run result over
  100 bets, and the break-even win probability vs. your true estimate.
- **Correlation engine** — set a correlation coefficient between any pair of legs, get
  auto-suggested directions for common same-game combos, and see when a book is
  **mispricing correlation** (where genuine +EV in SGPs hides).
- **Monte Carlo** — 10k–100k trial simulation using a **Gaussian copula** so
  correlations flow through to the simulated hit rate and confidence interval.
- **Poisson goal model** — xG → totals and 1X2 probabilities for soccer / low-event
  markets.
- **Bankroll & risk** — full / half / **quarter** Kelly, a bankroll-percentage
  guardrail, simulated **risk of ruin**, and the parlay's variance in plain language.
- **Market intelligence** — line movement, reverse-line-movement detection, closing
  line value, and **line shopping** across books with EV recomputed at the best price.
- **Per-sport context** — situational factor inputs (weather, pace, injuries, rest,
  goalie confirmation, ballpark, xG, surface…) that nudge your true-probability
  estimate, each labelled with where a live feed would plug in.
- **Verdict engine** — a blunt badge ("Strong +EV" → "Sucker Bet"), the true house
  edge, the single biggest weakness, and concrete suggestions to improve the ticket.
- **Backtesting** — paste historical results as CSV for ROI, hit rate and variance.

## Run it

```bash
npm install
npm run dev        # start the dev server
npm run build      # production build to dist/
npm run preview    # serve the production build
npm test           # run the unit + integration test suite
npm run typecheck  # strict TypeScript check
```

## How it's built

- **React + TypeScript + Tailwind v4 + Vite**, charts via **Recharts**.
- All math lives in small, **pure, unit-tested functions** under `src/lib/`, with the
  formulas written out in code comments. 60 tests cover odds conversion, vig removal
  (incl. Shin/power), EV, Kelly, correlation, Poisson, Monte Carlo, risk of ruin,
  backtesting, and an end-to-end pipeline check.

### Source map

| Area | File |
| --- | --- |
| Odds conversions | `src/lib/odds.ts` |
| Vig removal (multiplicative / Shin / power) | `src/lib/vig.ts` |
| EV, Kelly, parlay combination | `src/lib/ev.ts` |
| Correlation engine + SGP suggestions | `src/lib/correlation.ts` |
| Monte Carlo (Gaussian copula) | `src/lib/montecarlo.ts` |
| Poisson goal model | `src/lib/poisson.ts` |
| Variance, risk of ruin, guardrail | `src/lib/risk.ts` |
| Elo sanity check | `src/lib/elo.ts` |
| Market intelligence (movement, RLM, CLV, shopping) | `src/lib/market.ts` |
| Per-sport context factors | `src/lib/sports.ts` |
| Backtest CSV import | `src/lib/backtest.ts` |
| Analysis aggregator | `src/lib/analyze.ts` |
| Verdict engine | `src/lib/verdict.ts` |

### Wiring in live data

Where a real feed would normally supply data, the code leaves clearly labelled hooks:

- **Odds APIs** → `marketSiblingsDecimal` (opposing prices for vig removal) and
  `bookQuotes` (line shopping).
- **Injury / weather / stats feeds** → the per-sport context factors in
  `src/lib/sports.ts`, each carrying a `feed` note for the intended source.

## A note on honesty

The longer a parlay gets, the worse its expected value typically becomes — every leg
compounds the book's vig. This tool exists to make that house edge undeniable, not to
help you beat it. Estimates are only as good as your inputs, and no model beats an
efficient market consistently without a real, durable edge. Bet only what you can
afford to lose. If gambling stops being fun, call 1-800-GAMBLER.

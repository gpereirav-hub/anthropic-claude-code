// Market-intelligence helpers: line movement, reverse line movement, closing
// line value and line shopping. These signal sharp vs. public money. Live
// odds feeds would populate the inputs; the math here is feed-agnostic.

import type { BookQuote, Leg } from "./types";
import { decimalToImpliedProb } from "./odds";

export type MoveDirection = "shortened" | "lengthened" | "unchanged";

export interface LineMovement {
  /** Implied probability at open vs. now. */
  openImplied: number;
  nowImplied: number;
  /** Positive when the price shortened (book thinks it's MORE likely). */
  impliedDelta: number;
  direction: MoveDirection;
}

/** Compare opening to current odds for one leg. */
export function lineMovement(leg: Leg): LineMovement | null {
  if (leg.openingDecimalOdds === undefined) return null;
  const openImplied = decimalToImpliedProb(leg.openingDecimalOdds);
  const nowImplied = decimalToImpliedProb(leg.decimalOdds);
  const impliedDelta = nowImplied - openImplied;
  let direction: MoveDirection = "unchanged";
  if (impliedDelta > 1e-4) direction = "shortened";
  else if (impliedDelta < -1e-4) direction = "lengthened";
  return { openImplied, nowImplied, impliedDelta, direction };
}

/**
 * Reverse line movement: the line moves AGAINST the side the public is
 * hammering. If most public bets are on this selection yet its price has
 * lengthened (gotten worse for the book to offer), sharp money is likely on
 * the other side — a classic sharp signal.
 */
export function reverseLineMovement(leg: Leg): boolean {
  const move = lineMovement(leg);
  if (!move || leg.publicBetPct === undefined) return false;
  const publicHeavy = leg.publicBetPct >= 60;
  // Public heavy on this side but the line lengthened against them.
  return publicHeavy && move.direction === "lengthened";
}

/**
 * Closing line value estimate. If you bet at `betDecimal` and the line closes
 * at `closeDecimal`, beating the close (your price implies a lower prob than
 * the closing price) is the single best long-run predictor of a winning
 * bettor. Returns CLV as a percentage edge over the close.
 */
export function closingLineValue(betDecimal: number, closeDecimal: number): number {
  // You have CLV when your decimal odds exceed the closing decimal odds.
  return betDecimal / closeDecimal - 1;
}

export interface BestQuote {
  best: BookQuote | null;
  /** The leg's own/posted decimal for comparison. */
  posted: number;
  /** Improvement in decimal odds from shopping (best − posted). */
  improvement: number;
}

/** Find the best available price across the user's book and shopped books. */
export function bestAvailable(leg: Leg): BestQuote {
  let best: BookQuote = { book: "Your book", decimal: leg.decimalOdds };
  for (const q of leg.bookQuotes) {
    if (q.decimal > best.decimal) best = q;
  }
  return {
    best,
    posted: leg.decimalOdds,
    improvement: best.decimal - leg.decimalOdds,
  };
}

// Default state and factories. The app opens with a realistic sample parlay so
// the analysis is populated immediately — the user can clear or edit it.

import type { Leg, ParlaySettings } from "./lib/types";

let counter = 0;
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function newLeg(partial: Partial<Leg> = {}): Leg {
  return {
    id: uid("leg"),
    league: "NFL",
    betType: "moneyline",
    selection: "",
    decimalOdds: 1.91,
    marketSiblingsDecimal: [],
    nudges: [],
    bookQuotes: [],
    voided: false,
    ...partial,
  };
}

export const defaultSettings: ParlaySettings = {
  stake: 50,
  bankroll: 2000,
  maxStakeFraction: 0.02,
  vigMethod: "multiplicative",
  displayFormat: "american",
  sgpMode: false,
  mcTrials: 20000,
};

/** A plausible 3-leg NFL parlay with vig visible on each two-way market. */
export function sampleLegs(): Leg[] {
  return [
    newLeg({
      league: "NFL",
      betType: "moneyline",
      selection: "Chiefs ML",
      decimalOdds: 1.5, // -200
      marketSiblingsDecimal: [2.6], // opponent +160-ish, builds a real overround
    }),
    newLeg({
      league: "NFL",
      betType: "spread",
      selection: "Eagles -3.5",
      decimalOdds: 1.91, // -110
      marketSiblingsDecimal: [1.91], // -110 other side
      bookQuotes: [{ book: "Book B", decimal: 1.95 }],
    }),
    newLeg({
      league: "NFL",
      betType: "total",
      selection: "Ravens/Bills Over 48.5",
      decimalOdds: 1.87, // -115
      marketSiblingsDecimal: [1.95], // Under -105
      openingDecimalOdds: 1.91,
      publicBetPct: 68,
    }),
  ];
}

// Per-sport contextual factors. These are the situational inputs that move
// REAL probabilities. We do not fabricate live data — each factor is a labelled
// hook the user fills in (or that a future live feed plugs into), nudging the
// leg's true-probability estimate up or down with a documented reason.

import type { BetType, League } from "./types";

export interface ContextFactor {
  /** Stable key. */
  key: string;
  label: string;
  /** What it captures and why it matters. */
  hint: string;
  /** Where a live feed would normally supply this. */
  feed: string;
}

const UNIVERSAL: ContextFactor[] = [
  { key: "form", label: "Recent form (L5–L10)", hint: "Win/cover streaks and trend direction.", feed: "Stats API / results DB" },
  { key: "h2h", label: "Head-to-head record", hint: "How these specific teams/players match up historically.", feed: "Stats API" },
  { key: "homeaway", label: "Home/away split", hint: "Venue-specific performance gap.", feed: "Stats API" },
  { key: "rest", label: "Rest / scheduling", hint: "Back-to-backs, short weeks, days of rest.", feed: "Schedule API" },
  { key: "travel", label: "Travel distance", hint: "Cross-country / time-zone fatigue.", feed: "Schedule + geo" },
  { key: "injuries", label: "Injuries / lineups", hint: "Confirmed actives, late scratches, load management.", feed: "Injury feed (e.g. Rotowire)" },
  { key: "motivation", label: "Motivation / stakes", hint: "Playoff seeding, tanking, dead-rubber games.", feed: "Standings + editorial" },
  { key: "coaching", label: "Coaching tendencies", hint: "Aggressiveness, pace, situational play-calling.", feed: "Charting data" },
];

const BY_LEAGUE: Partial<Record<League, ContextFactor[]>> = {
  NFL: [
    { key: "weather", label: "Weather (wind/precip/temp)", hint: "Wind > 15mph crushes passing totals; cold/rain favors unders.", feed: "Weather API + venue (dome?)" },
    { key: "pace", label: "Pace / plays per game", hint: "More snaps → more scoring chances.", feed: "Charting data" },
    { key: "redzone", label: "Red-zone efficiency", hint: "TDs vs FGs swings totals and team totals.", feed: "Stats API" },
    { key: "trenches", label: "O-line vs D-line", hint: "Pressure rate and run-blocking edge.", feed: "PFF-style grades" },
    { key: "snaps", label: "Snap counts (props)", hint: "Projected usage for the player propped.", feed: "Snap-count feed" },
  ],
  NCAAF: [
    { key: "weather", label: "Weather (wind/precip/temp)", hint: "Outdoor totals swing hard on wind and rain.", feed: "Weather API" },
    { key: "pace", label: "Pace / tempo", hint: "Hurry-up offenses inflate totals.", feed: "Charting data" },
    { key: "mismatch", label: "Talent mismatch", hint: "Recruiting/roster gap, common in non-conference.", feed: "Recruiting + ratings" },
  ],
  NBA: [
    { key: "pace", label: "Pace", hint: "Possessions per 48 — drives totals and prop volume.", feed: "Stats API" },
    { key: "drtg_pos", label: "Def rating vs position", hint: "How the opponent defends the propped player's position.", feed: "Matchup data" },
    { key: "usage", label: "Usage rate", hint: "Share of possessions used while on court.", feed: "Stats API" },
    { key: "minutes", label: "Minutes projection", hint: "Blowout/rest risk caps a star's minutes.", feed: "Projection model" },
    { key: "foul", label: "Foul-trouble risk", hint: "Early fouls cut minutes and aggression.", feed: "Charting data" },
    { key: "defender", label: "Defender matchup", hint: "Primary on-ball defender quality.", feed: "Tracking data" },
  ],
  NCAAB: [
    { key: "pace", label: "Pace / tempo", hint: "Tempo-free pace estimate.", feed: "KenPom-style ratings" },
    { key: "drtg_pos", label: "Def rating vs position", hint: "Opponent's positional defense.", feed: "Matchup data" },
  ],
  MLB: [
    { key: "sp", label: "Starting pitcher matchup", hint: "Starter quality and recent form drives everything.", feed: "Probable pitchers feed" },
    { key: "bullpen", label: "Bullpen fatigue", hint: "Recent IP load on the relief corps.", feed: "Usage logs" },
    { key: "park", label: "Ballpark factor", hint: "Hitter- vs pitcher-friendly dimensions.", feed: "Park factors table" },
    { key: "wind", label: "Wind direction", hint: "Blowing out boosts HR/runs; in suppresses them.", feed: "Weather API" },
    { key: "platoon", label: "Platoon splits", hint: "L/R matchup advantages in the lineup.", feed: "Splits data" },
    { key: "umpire", label: "Umpire strike zone", hint: "Tight vs wide zone shifts run expectancy.", feed: "Umpire scorecards" },
  ],
  NHL: [
    { key: "goalie", label: "Starting goalie confirmed", hint: "Confirmed starter vs backup is enormous.", feed: "Goalie confirmation feed" },
    { key: "specialteams", label: "Power-play / penalty-kill", hint: "PP% and PK% matchup.", feed: "Stats API" },
    { key: "b2b_goalie", label: "Back-to-back goalie fatigue", hint: "Second night of a back-to-back.", feed: "Schedule API" },
  ],
  Soccer: [
    { key: "rotation", label: "Lineup rotation", hint: "Congested fixtures → rested/rotated XI.", feed: "Predicted lineups" },
    { key: "congestion", label: "Fixture congestion", hint: "Midweek European games before a league match.", feed: "Schedule API" },
    { key: "xg_for", label: "xG for", hint: "Expected goals created — feeds the Poisson λ.", feed: "xG provider (Opta/Understat)" },
    { key: "xg_against", label: "xG against", hint: "Expected goals conceded — feeds opponent λ.", feed: "xG provider" },
    { key: "stakes", label: "Competition stakes", hint: "Relegation/title vs mid-table dead rubber.", feed: "Standings" },
  ],
  Tennis: [
    { key: "surface", label: "Surface / style", hint: "Clay vs grass vs hard suits different games.", feed: "Match data" },
    { key: "fitness", label: "Recent fitness / load", hint: "Three-setters and travel pile up.", feed: "Schedule + reports" },
    { key: "h2h_surface", label: "H2H on surface", hint: "Matchup history on this surface specifically.", feed: "Match data" },
  ],
  MMA: [
    { key: "style", label: "Style matchup", hint: "Striker vs grappler, reach, stance.", feed: "Tale of the tape" },
    { key: "camp", label: "Camp / weight cut", hint: "Cut difficulty and camp reports.", feed: "Reporting" },
    { key: "layoff", label: "Layoff / ring rust", hint: "Time since last fight.", feed: "Records DB" },
  ],
  Golf: [
    { key: "coursefit", label: "Course fit", hint: "Driving distance / approach profile vs the course.", feed: "Strokes-gained data" },
    { key: "form_sg", label: "Recent strokes-gained", hint: "SG trend over recent starts.", feed: "SG provider" },
    { key: "weather_wave", label: "Weather wave", hint: "AM/PM tee-time draw advantage.", feed: "Weather + tee times" },
  ],
  Racing: [
    { key: "track", label: "Track / surface", hint: "Dirt vs turf, track condition.", feed: "Form guide" },
    { key: "draw", label: "Draw / post position", hint: "Gate advantage.", feed: "Race card" },
    { key: "going", label: "Going / conditions", hint: "Firm vs soft ground suits different runners.", feed: "Course report" },
  ],
};

/** Context factors applicable to a leg given its league and bet type. */
export function contextFactors(league: League, _betType: BetType): ContextFactor[] {
  return [...UNIVERSAL, ...(BY_LEAGUE[league] ?? [])];
}

export const LEAGUES: League[] = [
  "NFL", "NCAAF", "NBA", "NCAAB", "MLB", "NHL",
  "Soccer", "Tennis", "MMA", "Golf", "Racing", "Other",
];

export const BET_TYPES: { value: BetType; label: string }[] = [
  { value: "moneyline", label: "Moneyline" },
  { value: "spread", label: "Spread" },
  { value: "total", label: "Total (O/U)" },
  { value: "player_prop", label: "Player prop" },
  { value: "team_prop", label: "Team prop" },
  { value: "alt_line", label: "Alt line" },
  { value: "futures", label: "Futures" },
];

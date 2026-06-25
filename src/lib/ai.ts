// Claude integration. Because this is a static, backend-less app, the user
// supplies their own Anthropic API key and we call the API directly from the
// browser (dangerouslyAllowBrowser). The key lives only in localStorage on the
// user's machine — it is never sent anywhere except api.anthropic.com.
//
// Two capabilities:
//   1. extractParlayFromImage — vision reads a betslip screenshot into legs.
//   2. streamChat — a chatbot grounded in the computed evaluation.

import Anthropic from "@anthropic-ai/sdk";
import type { BetType, League, Leg } from "./types";
import { americanToDecimal } from "./odds";
import { LEAGUES, BET_TYPES } from "./sports";
import { newLeg } from "../state";

// Default to the most capable current model for both vision and chat.
const MODEL = "claude-opus-4-8";

const KEY_STORAGE = "parlay.anthropicKey";

export function getStoredKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function storeKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* ignore quota/availability errors */
  }
}

export function makeClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

/** A data URL ("data:image/png;base64,....") split into the SDK's image source. */
export function dataUrlToImageSource(dataUrl: string): {
  media_type: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  data: string;
} {
  const m = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.*)$/);
  if (!m) throw new Error("Unsupported image format — use PNG, JPEG, WebP or GIF.");
  let mt = m[1];
  if (mt === "image/jpg") mt = "image/jpeg";
  return {
    media_type: mt as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
    data: m[3],
  };
}

interface ExtractedLeg {
  league: string;
  betType: string;
  selection: string;
  oddsAmerican: number;
}

export interface ExtractionResult {
  legs: Leg[];
  stake: number | null;
  sportsbook: string | null;
  /** Combined American odds if the slip showed them, for a sanity cross-check. */
  combinedOddsAmerican: number | null;
  notes: string | null;
}

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "report_parlay",
  description:
    "Report every leg of the parlay shown in the betslip screenshot, plus the stake and any combined odds.",
  input_schema: {
    type: "object",
    properties: {
      sportsbook: {
        type: "string",
        description: "Name of the sportsbook if visible (DraftKings, FanDuel, etc.), else empty string.",
      },
      stake: {
        type: "number",
        description: "Wager/stake amount in dollars. Use 0 if not visible.",
      },
      combined_odds_american: {
        type: "number",
        description: "The total/combined parlay odds in American format if shown, else 0.",
      },
      notes: {
        type: "string",
        description: "Anything ambiguous or unreadable in the slip; empty string if all clear.",
      },
      legs: {
        type: "array",
        description: "One entry per selection/leg in the parlay.",
        items: {
          type: "object",
          properties: {
            league: {
              type: "string",
              enum: LEAGUES,
              description: "Sport/league. Use 'Other' if unclear.",
            },
            betType: {
              type: "string",
              enum: BET_TYPES.map((b) => b.value),
              description:
                "moneyline, spread, total, player_prop, team_prop, alt_line, or futures.",
            },
            selection: {
              type: "string",
              description: "The exact selection text, e.g. 'Chiefs ML' or 'Mahomes Over 274.5 Pass Yds'.",
            },
            oddsAmerican: {
              type: "number",
              description:
                "This leg's price in American odds (e.g. -110, +150). Convert from decimal/fractional if needed.",
            },
          },
          required: ["league", "betType", "selection", "oddsAmerican"],
        },
      },
    },
    required: ["legs", "stake"],
  },
};

const EXTRACTION_PROMPT = `You are reading a sports betting parlay slip (a screenshot from a sportsbook).
Extract every leg precisely. For each leg capture the league, the bet type, the full selection text,
and the price in American odds. If a price is shown in decimal (e.g. 1.91) or fractional (e.g. 10/11),
convert it to American. Capture the stake/wager and the combined parlay odds if visible. Do not invent
legs you cannot see. Report your findings with the report_parlay tool.`;

function normalizeLeague(s: string): League {
  const hit = LEAGUES.find((l) => l.toLowerCase() === s.toLowerCase());
  return hit ?? "Other";
}

function normalizeBetType(s: string): BetType {
  const hit = BET_TYPES.find((b) => b.value === s);
  return hit ? hit.value : "moneyline";
}

/** Send a betslip image to Claude and map the result into editable legs. */
export async function extractParlayFromImage(
  client: Anthropic,
  dataUrl: string
): Promise<ExtractionResult> {
  const img = dataUrlToImageSource(dataUrl);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: "report_parlay" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
  if (!toolUse) throw new Error("Claude did not return a structured parlay. Try a clearer screenshot.");

  const input = toolUse.input as {
    legs?: ExtractedLeg[];
    stake?: number;
    sportsbook?: string;
    combined_odds_american?: number;
    notes?: string;
  };

  const legs: Leg[] = (input.legs ?? [])
    .filter((l) => Number.isFinite(l.oddsAmerican) && Math.abs(l.oddsAmerican) >= 100)
    .map((l) =>
      newLeg({
        league: normalizeLeague(l.league),
        betType: normalizeBetType(l.betType),
        selection: l.selection || "",
        decimalOdds: americanToDecimal(l.oddsAmerican),
      })
    );

  if (legs.length === 0) {
    throw new Error("No readable legs were found in the screenshot.");
  }

  return {
    legs,
    stake: input.stake && input.stake > 0 ? input.stake : null,
    sportsbook: input.sportsbook || null,
    combinedOddsAmerican: input.combined_odds_american || null,
    notes: input.notes || null,
  };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CHAT_SYSTEM = `You are the assistant inside an honest sports-betting parlay analyzer. The user has had a
parlay evaluated and may ask you questions about it. A full, pre-computed analysis of THIS parlay is provided
below — treat those numbers as ground truth and explain them plainly.

Rules:
- Be concise, direct, and numerate. Reference the specific numbers from the analysis.
- Be honest about expected value: if the parlay is -EV, say so clearly. Don't cheerlead a bad bet.
- Explain concepts (vig, no-vig fair odds, correlation, Kelly, variance, EV) in plain language when asked.
- You may suggest how to improve the ticket (drop a leg, shop a line, trim legs) based on the analysis.
- Never guarantee outcomes. Remind the user that estimates are only as good as the inputs, and that no model
  beats an efficient market consistently. Keep responses focused; answer the question asked.
- If asked about responsible gambling, be supportive and mention 1-800-GAMBLER.`;

/**
 * Stream a chat reply grounded in the analysis context. Calls onDelta with text
 * chunks as they arrive and resolves with the full reply.
 */
export async function streamChat(
  client: Anthropic,
  analysisContext: string,
  history: ChatMessage[],
  onDelta: (text: string) => void
): Promise<string> {
  const system = `${CHAT_SYSTEM}\n\n--- CURRENT PARLAY ANALYSIS ---\n${analysisContext}`;

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  });

  stream.on("text", (delta) => onDelta(delta));
  const final = await stream.finalMessage();
  const text = final.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return text;
}

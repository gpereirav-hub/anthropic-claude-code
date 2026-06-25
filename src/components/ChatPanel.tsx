// Chat about the current evaluation. Grounded in the computed analysis context;
// streams replies token-by-token.
import { useRef, useState, useEffect } from "react";
import type Anthropic from "@anthropic-ai/sdk";
import { streamChat, type ChatMessage } from "../lib/ai";
import { Button, Card } from "./ui";

const SUGGESTIONS = [
  "Is this parlay worth placing?",
  "Which leg is dragging it down?",
  "Explain the vig on this ticket.",
  "How much should I stake?",
];

export function ChatPanel({
  client,
  context,
  hasParlay,
}: {
  client: Anthropic | null;
  context: string;
  hasParlay: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text: string) => {
    if (!client || !text.trim() || streaming) return;
    setError(null);
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    try {
      await streamChat(client, context, history, (delta) => {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            next[next.length - 1] = { role: "assistant", content: last.content + delta };
          }
          return next;
        });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/401|authentication/i.test(msg) ? "API key rejected (401)." : msg);
      // Drop the empty/failed assistant turn.
      setMessages((prev) => prev.filter((m, i) => !(i === prev.length - 1 && m.role === "assistant" && m.content === "")));
    } finally {
      setStreaming(false);
    }
  };

  return (
    <Card
      title="Ask about this evaluation"
      subtitle="Claude answers using the exact numbers computed above"
      right={
        messages.length > 0 ? (
          <Button variant="ghost" onClick={() => setMessages([])}>
            Clear chat
          </Button>
        ) : undefined
      }
    >
      {!client && (
        <div className="mb-3 rounded-lg border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-300">
          Add your Anthropic API key above to chat about the parlay.
        </div>
      )}

      <div
        ref={scrollRef}
        className="mb-3 max-h-80 min-h-[120px] space-y-3 overflow-y-auto rounded-lg bg-slate-950/40 p-3"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center">
            <p className="text-xs text-slate-500">
              {hasParlay
                ? "Ask anything about the parlay — EV, vig, correlation, sizing, or how to improve it."
                : "Add or extract a parlay first, then ask questions about it."}
            </p>
            {hasParlay && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    disabled={!client}
                    onClick={() => send(s)}
                    className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 hover:border-sky-600 hover:text-sky-300 disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} streaming={streaming && i === messages.length - 1} />)
        )}
      </div>

      {error && <div className="mb-2 text-xs text-rose-400">{error}</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={hasParlay ? "Ask about EV, vig, sizing…" : "Add a parlay first…"}
          disabled={!client || streaming || !hasParlay}
          className="flex-1 rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 disabled:opacity-50"
        />
        <Button variant="primary" disabled={!client || streaming || !input.trim() || !hasParlay}>
          {streaming ? "…" : "Send"}
        </Button>
      </form>
    </Card>
  );
}

function Bubble({ role, content, streaming }: { role: "user" | "assistant"; content: string; streaming: boolean }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
          isUser ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-200"
        }`}
      >
        {content || (streaming ? "…" : "")}
        {streaming && content && <span className="ml-0.5 animate-pulse">▌</span>}
      </div>
    </div>
  );
}

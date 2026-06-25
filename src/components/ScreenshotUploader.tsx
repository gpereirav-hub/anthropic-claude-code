// Drop or pick a betslip screenshot; Claude vision extracts the legs.
import { useRef, useState } from "react";
import type Anthropic from "@anthropic-ai/sdk";
import { extractParlayFromImage, type ExtractionResult } from "../lib/ai";
import { Button, Card, Pill } from "./ui";

export function ScreenshotUploader({
  client,
  onExtracted,
}: {
  client: Anthropic | null;
  onExtracted: (r: ExtractionResult) => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image (PNG, JPEG, WebP or GIF).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setDataUrl(reader.result as string);
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!client || !dataUrl) return;
    setBusy(true);
    setError(null);
    try {
      const result = await extractParlayFromImage(client, dataUrl);
      onExtracted(result);
    } catch (e) {
      setError(humanError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Evaluate from a screenshot"
      subtitle="Drop a betslip image — Claude reads the legs, then the math takes over"
      right={client ? <Pill tone="good">AI ready</Pill> : <Pill tone="warn">add API key below</Pill>}
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) loadFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
          drag ? "border-sky-500 bg-sky-500/5" : "border-slate-700 hover:border-slate-600"
        }`}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="betslip preview"
            className="max-h-64 rounded-lg border border-slate-700 object-contain"
          />
        ) : (
          <>
            <div className="text-3xl">🧾</div>
            <p className="mt-2 text-sm text-slate-300">Drop a betslip screenshot here, or click to browse</p>
            <p className="mt-1 text-[11px] text-slate-600">PNG · JPEG · WebP · GIF — stays in your browser</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) loadFile(f);
          }}
        />
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-700/50 bg-rose-900/20 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button variant="primary" onClick={analyze} disabled={!client || !dataUrl || busy}>
          {busy ? "Reading slip…" : "Analyze betslip"}
        </Button>
        {dataUrl && (
          <Button
            variant="ghost"
            onClick={() => {
              setDataUrl(null);
              setError(null);
            }}
          >
            Clear image
          </Button>
        )}
        {!client && <span className="text-[11px] text-slate-500">Add your Anthropic API key below to enable extraction.</span>}
      </div>
      <p className="mt-2 text-[11px] text-slate-600">
        Vision extraction can misread odds — review the legs it pulls and edit anything that's off before trusting the verdict.
      </p>
    </Card>
  );
}

function humanError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/401|authentication/i.test(msg)) return "API key was rejected (401). Check the key below.";
  if (/429|rate.?limit/i.test(msg)) return "Rate limited (429). Wait a moment and try again.";
  if (/permission|403/i.test(msg)) return "This key lacks access to the model (403).";
  if (/CORS|Failed to fetch|NetworkError/i.test(msg))
    return "Network/CORS error reaching the Anthropic API from the browser.";
  return msg;
}

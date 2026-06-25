// Bring-your-own Anthropic API key. Stored only in localStorage, used to call
// the API directly from the browser. Nothing is sent to any third party.
import { useState } from "react";
import { Button, Card, Pill, TextInput } from "./ui";

export function ApiKeySetup({
  hasKey,
  onSave,
}: {
  hasKey: boolean;
  onSave: (key: string) => void;
}) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);

  return (
    <Card
      title="Anthropic API key"
      subtitle="Needed for screenshot reading and the chat — your key, your account"
      right={hasKey ? <Pill tone="good">key saved</Pill> : <Pill tone="warn">not set</Pill>}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <TextInput
          type={show ? "text" : "password"}
          value={value}
          placeholder={hasKey ? "•••••••• (saved) — paste a new key to replace" : "sk-ant-..."}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setShow((s) => !s)}>
            {show ? "Hide" : "Show"}
          </Button>
          <Button
            variant="primary"
            disabled={!value.trim()}
            onClick={() => {
              onSave(value.trim());
              setValue("");
            }}
          >
            Save
          </Button>
          {hasKey && (
            <Button
              variant="danger"
              onClick={() => {
                onSave("");
                setValue("");
              }}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
        The key is stored in your browser's localStorage and sent only to api.anthropic.com over HTTPS.
        Get one at console.anthropic.com. Calls are billed to your own Anthropic account. On a shared
        device, remove it when you're done.
      </p>
    </Card>
  );
}

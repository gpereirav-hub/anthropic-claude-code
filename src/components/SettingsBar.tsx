// Global controls: stake, bankroll, vig method, display format, SGP mode, MC trials.
import type { OddsFormat, ParlaySettings, VigMethod } from "../lib/types";
import { Field, NumberInput, Select, Toggle, Pill } from "./ui";

export function SettingsBar({
  settings,
  onChange,
}: {
  settings: ParlaySettings;
  onChange: (s: ParlaySettings) => void;
}) {
  const set = <K extends keyof ParlaySettings>(k: K, v: ParlaySettings[K]) =>
    onChange({ ...settings, [k]: v });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Field label="Stake ($)">
          <NumberInput
            value={settings.stake}
            min={0}
            step={5}
            onChange={(e) => set("stake", Math.max(0, Number(e.target.value)))}
          />
        </Field>
        <Field label="Bankroll ($)">
          <NumberInput
            value={settings.bankroll}
            min={0}
            step={50}
            onChange={(e) => set("bankroll", Math.max(0, Number(e.target.value)))}
          />
        </Field>
        <Field label="Max stake / bankroll" hint="Guardrail threshold">
          <Select
            value={settings.maxStakeFraction}
            onChange={(e) => set("maxStakeFraction", Number(e.target.value))}
          >
            <option value={0.01}>1%</option>
            <option value={0.02}>2%</option>
            <option value={0.03}>3%</option>
            <option value={0.05}>5%</option>
          </Select>
        </Field>
        <Field label="Vig removal" hint="How the juice is stripped">
          <Select
            value={settings.vigMethod}
            onChange={(e) => set("vigMethod", e.target.value as VigMethod)}
          >
            <option value="multiplicative">Multiplicative</option>
            <option value="shin">Shin's method</option>
            <option value="power">Power / log</option>
          </Select>
        </Field>
        <Field label="Display odds as">
          <Select
            value={settings.displayFormat}
            onChange={(e) => set("displayFormat", e.target.value as OddsFormat)}
          >
            <option value="american">American</option>
            <option value="decimal">Decimal</option>
            <option value="fractional">Fractional</option>
          </Select>
        </Field>
        <Field label="Monte Carlo trials">
          <Select
            value={settings.mcTrials}
            onChange={(e) => set("mcTrials", Number(e.target.value))}
          >
            <option value={10000}>10,000</option>
            <option value={20000}>20,000</option>
            <option value={50000}>50,000</option>
            <option value={100000}>100,000</option>
          </Select>
        </Field>
        <div className="flex items-end pb-1">
          <div className="flex flex-col gap-2">
            <Toggle
              checked={settings.sgpMode}
              onChange={(v) => set("sgpMode", v)}
              label="Same-game (SGP)"
            />
            {settings.sgpMode && (
              <Pill tone="info" title="In SGP mode, correlations between legs are modelled.">
                correlation on
              </Pill>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

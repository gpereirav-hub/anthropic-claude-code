// Small presentational primitives so the panels stay consistent and terse.
import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg shadow-black/20 ${className}`}
    >
      {(title || right) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-200">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "default",
  hint,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "good" | "bad" | "warn";
  hint?: string;
}) {
  const toneCls =
    tone === "good"
      ? "text-emerald-400"
      : tone === "bad"
      ? "text-rose-400"
      : tone === "warn"
      ? "text-amber-400"
      : "text-slate-100";
  return (
    <div className="rounded-lg bg-slate-800/40 px-3 py-2" title={hint}>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`tabular text-lg font-semibold ${toneCls}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

export function Pill({
  children,
  tone = "default",
  title,
}: {
  children: ReactNode;
  tone?: "default" | "good" | "bad" | "warn" | "info";
  title?: string;
}) {
  const map: Record<string, string> = {
    default: "bg-slate-700/50 text-slate-300 border-slate-600",
    good: "bg-emerald-500/15 text-emerald-300 border-emerald-600/40",
    bad: "bg-rose-500/15 text-rose-300 border-rose-600/40",
    warn: "bg-amber-500/15 text-amber-300 border-amber-600/40",
    info: "bg-sky-500/15 text-sky-300 border-sky-600/40",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-slate-400">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-slate-600">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" {...props} className={`${inputCls} tabular ${props.className ?? ""}`} />;
}

export function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputCls} ${props.className ?? ""}`}>
      {children}
    </select>
  );
}

export function Button({
  children,
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost" | "danger";
}) {
  const map = {
    default: "border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200",
    primary: "bg-sky-600 hover:bg-sky-500 text-white",
    ghost: "text-slate-400 hover:text-slate-200 hover:bg-slate-800",
    danger: "border border-rose-700/50 text-rose-300 hover:bg-rose-900/30",
  };
  return (
    <button
      {...props}
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${map[variant]} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-xs font-medium text-slate-300"
    >
      <span
        className={`relative h-5 w-9 rounded-full transition ${
          checked ? "bg-sky-600" : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
      {label}
    </button>
  );
}

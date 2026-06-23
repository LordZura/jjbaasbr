"use client";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudOff,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

// ── Panel ────────────────────────────────────────────────────────────────────

export function Panel({
  children,
  className,
  title,
  icon,
  accent,
  right,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: ReactNode;
  accent?: string;
  right?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "border border-white/10 bg-black/40 p-4 backdrop-blur-sm sm:p-5",
        className,
      )}
      style={accent ? { boxShadow: `inset 0 0 0 1px ${accent}22` } : undefined}
    >
      {(title || right) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-xl uppercase tracking-wide sm:text-2xl">
            {icon}
            {title}
          </h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

export function Stat({
  label,
  value,
  accent,
  className,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("border border-white/10 bg-white/[0.03] px-3 py-2", className)}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p
        className="truncate font-display text-xl uppercase leading-tight text-white sm:text-2xl"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

// ── Two-step confirm button ───────────────────────────────────────────────────

export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Sure?",
  className,
  title,
}: {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: ReactNode;
  className?: string;
  title?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      title={title}
      onClick={() => {
        if (armed) {
          onConfirm();
          setArmed(false);
        } else {
          setArmed(true);
        }
      }}
      className={cn(
        "flex items-center justify-center gap-1.5 border px-3 py-2 text-xs font-black uppercase tracking-wide transition",
        armed
          ? "border-rose bg-rose/15 text-rose"
          : "border-white/10 bg-white/5 text-zinc-300 hover:border-rose hover:text-rose",
        className,
      )}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}

// ── Sync indicator (corner) ───────────────────────────────────────────────────

export function SyncBadge() {
  const status = useStore((s) => s.status);
  const mode = useStore((s) => s.mode);

  const map = {
    loading: {
      icon: <Loader2 size={13} className="animate-spin" />,
      text: "Loading…",
      cls: "text-zinc-300 border-white/15",
    },
    saving: {
      icon: <Loader2 size={13} className="animate-spin" />,
      text: "Saving…",
      cls: "text-gold border-gold/40",
    },
    synced: {
      icon: <CheckCircle2 size={13} />,
      text: "Synced",
      cls: "text-acid border-acid/40",
    },
    error: {
      icon: <CloudOff size={13} />,
      text: "Offline",
      cls: "text-rose border-rose/50",
    },
  }[status];

  return (
    <div
      className={cn(
        "pointer-events-none flex items-center gap-1.5 border bg-black/70 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] backdrop-blur",
        map.cls,
      )}
      title={
        mode === "supabase"
          ? "Shared live via Supabase"
          : mode === "local"
            ? "Shared across tabs (local). Add Supabase env vars for cross-device sync."
            : "In-memory only"
      }
    >
      {map.icon}
      {map.text}
      <span className="ml-1 flex items-center gap-1 text-zinc-500">
        <Cloud size={11} />
        {mode === "supabase" ? "Cloud" : mode === "local" ? "Local" : "Mem"}
      </span>
    </div>
  );
}

// ── Toast stack ───────────────────────────────────────────────────────────────

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => {
        const tone =
          t.kind === "error"
            ? "border-rose/60 text-rose"
            : t.kind === "success"
              ? "border-acid/60 text-acid"
              : "border-cyan/60 text-cyan";
        const Icon =
          t.kind === "error"
            ? AlertTriangle
            : t.kind === "success"
              ? CheckCircle2
              : Info;
        return (
          <div
            key={t.id}
            className={cn(
              "animate-overlay-in pointer-events-auto flex items-center gap-3 border bg-black/90 px-4 py-3 text-sm font-bold shadow-impact backdrop-blur",
              tone,
            )}
          >
            <Icon size={16} className="shrink-0" />
            <span className="min-w-0 flex-1 text-zinc-100">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="text-zinc-500 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Empty hint ────────────────────────────────────────────────────────────────

export function EmptyHint({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid place-items-center gap-2 border border-dashed border-white/15 bg-black/30 px-6 py-10 text-center">
      {icon && <div className="text-zinc-500">{icon}</div>}
      <p className="font-display text-xl uppercase text-zinc-300">{title}</p>
      {children && (
        <p className="max-w-md text-sm text-zinc-500">{children}</p>
      )}
    </div>
  );
}

export function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------------------------------- Button --------------------------------- */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500 border border-red-500/40",
  secondary:
    "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 focus-visible:ring-zinc-500 border border-zinc-600/60",
  danger:
    "bg-red-900/40 text-red-200 hover:bg-red-900/70 focus-visible:ring-red-600 border border-red-800",
  ghost:
    "bg-transparent text-zinc-300 hover:text-white hover:bg-zinc-800/70 focus-visible:ring-zinc-600 border border-transparent",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

/* ---------------------------------- Inputs --------------------------------- */

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("z4k-input", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("z4k-input", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("z4k-input", props.className)} />;
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="z4k-label">
      {children}
    </label>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function Checkbox({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-300">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-900 accent-red-600"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

/* ---------------------------------- Badge ---------------------------------- */

type BadgeTone = "green" | "yellow" | "red" | "gray" | "blue";

const badgeTones: Record<BadgeTone, string> = {
  green: "bg-green-500/15 text-green-300 border-green-500/30",
  yellow: "bg-yellow-500/15 text-yellow-200 border-yellow-500/30",
  red: "bg-red-500/15 text-red-300 border-red-500/30",
  gray: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  blue: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

export function Badge({
  tone = "gray",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------------------------- Card ----------------------------------- */

export function Card({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={cn("z4k-card p-4", className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
        {children}
      </h2>
      {sub ? <p className="mt-1 text-sm text-zinc-400">{sub}</p> : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent",
        className,
      )}
      aria-hidden
    />
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}

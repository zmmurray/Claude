import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** Small, dependency-free design-system primitives for the cinematic theme. */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-charcoal-700 bg-charcoal-850 p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cream-50">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex gap-3">{actions}</div> : null}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-amber-accent text-charcoal-950 hover:bg-amber-bright font-medium",
  secondary:
    "border border-charcoal-600 bg-charcoal-800 text-cream-100 hover:border-amber-deep",
  ghost: "text-muted hover:text-cream-100",
  danger: "border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[color-mix(in_srgb,var(--color-danger)_15%,transparent)]",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm transition-colors ${buttonStyles[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-cream-300">
      {children}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-charcoal-600 bg-charcoal-900 px-3 py-2 text-sm text-cream-50 placeholder:text-muted-dim focus:border-amber-deep focus:outline-none focus:ring-1 focus:ring-amber-deep ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-charcoal-600 bg-charcoal-900 px-3 py-2 text-sm text-cream-50 placeholder:text-muted-dim focus:border-amber-deep focus:outline-none focus:ring-1 focus:ring-amber-deep ${props.className ?? ""}`}
    />
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-charcoal-600 bg-charcoal-800 px-2.5 py-0.5 text-xs text-muted">
      {children}
    </span>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning";
  children: ReactNode;
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-deep/60 bg-[color-mix(in_srgb,var(--color-amber-accent)_10%,transparent)] text-amber-bright"
      : "border-charcoal-600 bg-charcoal-800 text-muted";
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${toneClass}`}>{children}</div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-charcoal-600 bg-charcoal-850/50 p-10 text-center">
      <p className="text-cream-100">{title}</p>
      {children ? <div className="mt-3 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

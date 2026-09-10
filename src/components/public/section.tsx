import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
  align = "left",
  as: Heading = "h2",
}: {
  eyebrow?: string | null;
  title: string;
  description?: string | null;
  action?: { href: string; label: string };
  className?: string;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div
      className={cn(
        "mb-8 gap-4",
        align === "center"
          ? "flex flex-col items-center text-center"
          : "flex flex-col sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-700">
            {eyebrow}
          </p>
        ) : null}
        <Heading className="text-2xl font-bold sm:text-3xl">{title}</Heading>
        {description ? (
          <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary-700 transition-colors hover:text-accent-700"
        >
          {action.label}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

export function Section({
  className,
  children,
  muted = false,
  id,
}: {
  className?: string;
  children: React.ReactNode;
  muted?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={cn(muted && "bg-muted/50", "py-14 sm:py-20", className)}>
      <div className="container">{children}</div>
    </section>
  );
}

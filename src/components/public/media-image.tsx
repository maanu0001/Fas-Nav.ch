import Image from "next/image";

import { LogoMark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

export type MediaLike = {
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
} | null | undefined;

/**
 * Bild mit definiertem Fallback. Verhindert kaputte Layouts,
 * wenn eine Organisation noch kein Bild hinterlegt hat.
 */
export function MediaImage({
  media,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
  fallbackLabel,
  fallback,
}: {
  media: MediaLike;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fallbackLabel?: string;
  fallback?: "organization" | "event";
}) {
  if (!media?.url && fallback) {
    return <Image src={fallback === "organization" ? "/brand/default-organization-banner.svg" : "/brand/default-event-banner.svg"} alt={alt} fill sizes={sizes} priority={priority} unoptimized className={cn("object-cover",className)} />;
  }
  if (!media?.url) {
    return (
      <div
        className={cn(
          // Wie beim echten Bild (next/image mit "fill") den Elternbereich
          // vollständig ausfüllen. Ohne diese Positionierung schrumpft der
          // Platzhalter auf die Höhe des Signets und sitzt als scheinbar
          // loses Kästchen am oberen Rand.
          "absolute inset-0 flex items-center justify-center",
          "bg-gradient-to-br from-primary-100 via-secondary to-primary-50",
          className,
        )}
        role="img"
        aria-label={fallbackLabel ?? alt}
      >
        <LogoMark className="h-11 w-11 text-base opacity-20" variant="dark" />
      </div>
    );
  }

  return (
    <Image
      src={media.url}
      alt={media.alt || alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}

/** Quadratisches Logo mit Rahmen – für Cards und Detail-Header. */
export function LogoImage({
  media,
  name,
  className,
  size = 64,
}: {
  media: MediaLike;
  name: string;
  className?: string;
  size?: number;
}) {
  if (!media?.url) {
    return (
      <div className={cn("relative shrink-0 overflow-hidden rounded-xl border border-border bg-card",className)} style={{width:size,height:size}}>
        <Image src="/brand/default-organization-logo.svg" alt={`Logo ${name}`} fill sizes={`${size}px`} unoptimized className="object-contain" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={media.url}
        alt={media.alt || `Logo ${name}`}
        fill
        sizes={`${size}px`}
        className="object-contain p-1.5"
      />
    </div>
  );
}

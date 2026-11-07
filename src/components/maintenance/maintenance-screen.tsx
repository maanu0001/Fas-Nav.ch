import Image from "next/image";
import { LogIn, Wrench } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { SITE } from "@/lib/constants";

/**
 * Wartungsseite.
 *
 * Bewusst ohne Kopf- und Fusszeile der Website: Während der Wartung soll
 * nichts anklickbar sein, was ohnehin nicht erreichbar ist. Die Anmeldung
 * bleibt erreichbar, damit sich die Administration anmelden und den
 * Wartungsmodus wieder ausschalten kann.
 */
export function MaintenanceScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-16">
      <main id="inhalt" className="w-full max-w-lg text-center">
        <Image
          src="/brand/fas-nav-logo-transparent.png"
          alt={SITE.name}
          width={320}
          height={320}
          priority
          className="mx-auto h-auto w-full max-w-[15rem] object-contain dark:hidden"
        />
        {/*
          Das Logo ist für hellen Grund gezeichnet. Im dunklen Modus steht es
          deshalb auf einer ruhigen hellen Fläche, statt seine Navy-Anteile im
          Hintergrund verschwinden zu lassen.
        */}
        <div className="mx-auto hidden w-fit rounded-3xl bg-white/95 p-6 shadow-card ring-1 ring-white/20 dark:block">
          <Image
            src="/brand/fas-nav-logo-transparent.png"
            alt={SITE.name}
            width={320}
            height={320}
            priority
            className="h-auto w-full max-w-[13rem] object-contain"
          />
        </div>

        <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Wrench className="h-3.5 w-3.5" aria-hidden />
          Wartungsarbeiten
        </p>

        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Wir sind gleich wieder da
        </h1>

        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          {message}
        </p>

        <div className="mt-8">
          <ButtonLink href="/login" variant="primary" size="lg">
            <LogIn />
            Anmelden
          </ButtonLink>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Für Administratorinnen und Administratoren von {SITE.name}.
        </p>
      </main>
    </div>
  );
}

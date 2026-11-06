import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, CalendarDays, Code2, HeartHandshake, MapPinned,
  MessageCircleHeart, MonitorCog, Server, ShieldCheck, Sparkles, Users,
  Wrench, HandHeart,
} from "lucide-react";

import { FasnachtHeroArtwork } from "@/components/public/fasnacht-hero-artwork";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Über Fas-Nav.ch – Die Idee hinter der Fasnachtsplattform",
  description: "Erfahre, warum Fas-Nav.ch entstanden ist, wer die Schweizer Fasnachtsplattform entwickelt und wie Abo-Beiträge ihren unabhängigen Betrieb ermöglichen.",
  path: "/ueber",
  keywords: ["Über Fas-Nav.ch", "Schweizer Fasnacht", "Guggenmusik", "Fasnachtsplattform", "Fas-Nav Projekt"],
});

const benefits = [
  { icon: MapPinned, title: "Ein zentraler Ort", description: "Fasnachten, Guggen und Veranstaltungen entdecken, statt Informationen auf vielen verschiedenen Kanälen zusammensuchen zu müssen." },
  { icon: Users, title: "Mehr Sichtbarkeit", description: "Organisationen erhalten einen Platz, an dem sie ihre Arbeit, ihren Verein und ihre Veranstaltungen selbst präsentieren können." },
  { icon: CalendarDays, title: "Einfacher informiert", description: "Eine übersichtliche Agenda hilft Interessierten, die Fasnacht in ihrer Region und darüber hinaus zu entdecken." },
];

const funding = [
  { icon: Server, number: "01", title: "Hosting & Infrastruktur", description: "Server, Speicherplatz und weitere technische Dienste, die für den laufenden Betrieb notwendig sind." },
  { icon: ShieldCheck, number: "02", title: "Sicherheit & Zuverlässigkeit", description: "Regelmässige Wartung, technische Pflege und Massnahmen für einen stabilen Plattformbetrieb." },
  { icon: Wrench, number: "03", title: "Verbesserungen & Entwicklung", description: "Bestehende Funktionen optimieren, Probleme beheben und neue Möglichkeiten für die Fasnacht schaffen." },
  { icon: HandHeart, number: "04", title: "Persönlicher Einsatz", description: "Eine bescheidene Entschädigung für die Zeit, die neben dem Studium in Entwicklung, Betreuung und Weiterentwicklung fliesst." },
];

export default function AboutPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-white/10 bg-hero text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <div aria-hidden className="pointer-events-none absolute -left-28 top-10 h-72 w-72 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="container relative grid items-center gap-8 py-16 sm:py-20 lg:grid-cols-[1.1fr_.9fr] lg:gap-10 lg:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
              <Sparkles className="h-4 w-4 text-gold-300" aria-hidden />
              Hinter den Kulissen
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Für die Fasnacht.<br />
              <span className="text-brand-accent">Für die Menschen dahinter.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              Die Schweizer Fasnacht lebt von Leidenschaft, Kreativität und unzähligen
              Menschen, die Jahr für Jahr etwas Besonderes auf die Beine stellen.
              Fas-Nav.ch möchte ihnen einen gemeinsamen digitalen Ort geben.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/fasnachten" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-primary-950 transition hover:bg-white/90">
                Fas-Nav entdecken <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/kontakt" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Kontakt aufnehmen
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[520px]" aria-hidden>
            <FasnachtHeroArtwork />
          </div>
        </div>
      </section>

      <section className="container py-16 sm:py-24" aria-labelledby="idee">
        <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">01 · Die Idee</p>
            <h2 id="idee" className="mt-3 font-display text-3xl font-bold sm:text-4xl">Eine gemeinsame Bühne für die Schweizer Fasnacht.</h2>
          </div>
          <div className="space-y-5 text-[15px] leading-8 text-slate-700 sm:text-base">
            <p>Informationen rund um die Schweizer Fasnacht sind häufig über verschiedene Websites, soziale Netzwerke und Veranstaltungskalender verteilt. Fas-Nav.ch wurde mit dem Ziel entwickelt, diese Informationen an einem Ort zusammenzubringen.</p>
            <p>Die Plattform soll Organisationen die Möglichkeit geben, sich unkompliziert zu präsentieren, ihre Veranstaltungen sichtbar zu machen und neue Menschen zu erreichen.</p>
            <p>Gleichzeitig sollen Fasnachtsbegeisterte einfacher entdecken können, was in ihrer Region und darüber hinaus stattfindet.</p>
          </div>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div key={title} className="group rounded-2xl border border-border bg-card p-6 shadow-subtle transition duration-300 hover:-translate-y-1 hover:shadow-card">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/50 py-16 sm:py-24" aria-labelledby="dahinter">
        <div className="container grid items-center gap-10 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-brand-strong px-7 py-10 text-white shadow-card sm:px-10 sm:py-14">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-primary-500/25 blur-3xl" />
            <div className="relative flex min-h-[250px] flex-col justify-between">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                <Code2 className="h-8 w-8 text-gold-300" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Eigenständig entwickelt</p>
                <p className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">Ein Projekt.<br />Viel Herzblut.</p>
                <p className="mt-3 text-sm text-white/65">Unabhängig · studentisch betrieben · aus der Schweiz</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">02 · Wer dahintersteht</p>
            <h2 id="dahinter" className="mt-3 font-display text-3xl font-bold sm:text-4xl">Ein unabhängiges Herzensprojekt.</h2>
            <div className="mt-6 space-y-5 text-[15px] leading-8 text-slate-700 sm:text-base">
              <p>Hinter Fas-Nav.ch steht kein grosses Unternehmen, sondern ein Student, der die Plattform eigenständig entwickelt und betreibt.</p>
              <p>Was als Idee für eine zentrale Fasnachtsplattform begann, ist zu einem stetig wachsenden Projekt geworden. Von der Gestaltung über die Programmierung bis hin zur technischen Betreuung und Weiterentwicklung steckt viel persönliche Arbeit in Fas-Nav.ch.</p>
              <p>Das Ziel ist nicht, möglichst viele Funktionen anzubieten, sondern eine Plattform zu schaffen, die für die Schweizer Fasnacht einen echten Mehrwert bietet.</p>
            </div>
            <div className="mt-7 inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-800">
              <HeartHandshake className="h-5 w-5 shrink-0" aria-hidden />
              Mit Eigeninitiative und Freude an der Sache.
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16 sm:py-24" aria-labelledby="beitraege">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">03 · Transparent erklärt</p>
          <h2 id="beitraege" className="mt-3 font-display text-3xl font-bold sm:text-4xl">Was ermöglichen die Abonnemente?</h2>
          <p className="mt-5 text-[15px] leading-8 text-muted-foreground sm:text-base">Der Betrieb einer digitalen Plattform ist mit laufenden Kosten verbunden. Deshalb gibt es neben kostenlosen Funktionen auch kostenpflichtige Abonnemente. Ihre Einnahmen helfen, Fas-Nav.ch langfristig zuverlässig, sicher und unabhängig betreiben zu können.</p>
        </div>
        <div className="mt-11 grid gap-4 sm:grid-cols-2">
          {funding.map(({ icon: Icon, number, title, description }) => (
            <article key={number} className="relative rounded-2xl border border-border bg-card p-6 shadow-subtle sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><Icon className="h-6 w-6" aria-hidden /></span>
                <span className="font-display text-3xl font-extrabold text-primary-200">{number}</span>
              </div>
              <h3 className="mt-5 font-display text-xl font-bold">{title}</h3>
              <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-primary-200 bg-primary-50 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <MonitorCog className="mt-1 h-7 w-7 shrink-0 text-primary-700" aria-hidden />
            <div>
              <h3 className="font-display text-lg font-bold">Schlank organisiert und langfristig gedacht</h3>
              <p className="mt-2 text-sm leading-7 text-slate-700">Als studentisch betriebenes Projekt ist Fas-Nav.ch bewusst schlank organisiert. Die Abonnemente tragen dazu bei, die Plattform langfristig weiterzuführen und den persönlichen Entwicklungs- und Betreuungsaufwand zumindest teilweise abzugelten. Mit einem Abonnement unterstützt du damit nicht nur deine eigene Präsenz, sondern auch die kontinuierliche Weiterentwicklung der Plattform.</p>
            </div>
          </div>
        </div>
        <div className="mt-7 text-center">
          <Link href="/preise" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 underline-offset-4 hover:underline">
            Abonnemente und Leistungen ansehen <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-border bg-hero py-16 text-white sm:py-20" aria-labelledby="gemeinsam">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-confetti opacity-50" />
        <div className="container relative mx-auto max-w-3xl text-center">
          <MessageCircleHeart className="mx-auto h-10 w-10 text-gold-300" aria-hidden />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/55">04 · Gemeinsam weiterdenken</p>
          <h2 id="gemeinsam" className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">Gemeinsam für eine sichtbare Fasnacht.</h2>
          <p className="mt-5 text-base leading-8 text-white/75">Fas-Nav.ch soll mit den Menschen wachsen, für die es geschaffen wurde. Ideen, Rückmeldungen und Verbesserungsvorschläge sind deshalb jederzeit willkommen. Denn die besten Entwicklungen entstehen dort, wo die Plattform tatsächlich genutzt wird.</p>
          <p className="mt-5 font-display text-xl font-bold text-white">Danke, dass du Teil davon bist.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/fasnachten" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary-950 transition hover:bg-white/90">Fas-Nav entdecken <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            <Link href="/kontakt" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Kontakt aufnehmen</Link>
          </div>
        </div>
      </section>
    </>
  );
}

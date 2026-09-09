"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, Save, Send, Trash2, Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ImageUpload } from "@/components/dashboard/image-upload";
import { OrganizationPreview } from "@/components/dashboard/editor/preview";
import type { EditorState, SocialLinkDraft } from "@/components/dashboard/editor/types";
import { SOCIAL_PLATFORM_LABELS } from "@/lib/constants";
import { organizationGalleryPath } from "@/lib/navigation";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { OrganizationType, PublicationStatus, SocialPlatform } from "@prisma/client";

type Canton = { id: string; name: string; code: string };

const SECTIONS = [
  { id: "grundinformationen", label: "Grundinformationen" },
  { id: "beschreibung", label: "Beschreibung" },
  { id: "merkmale", label: "Merkmale" },
  { id: "bilder", label: "Bilder" },
  { id: "kontakt", label: "Kontakt" },
  { id: "anreise", label: "Anreise" },
  { id: "social", label: "Social Media" },
  { id: "seo", label: "Suchmaschinen" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const PLATFORMS = Object.keys(SOCIAL_PLATFORM_LABELS) as SocialPlatform[];

export function OrganizationEditor({
  organizationId,
  type,
  status,
  publicHref,
  cantons,
  initial,
  canPublish,
}: {
  organizationId: string;
  type: OrganizationType;
  status: PublicationStatus;
  publicHref: string;
  cantons: Canton[];
  initial: EditorState;
  canPublish: boolean;
}) {
  const { toast } = useToast();
  const [state, setState] = React.useState<EditorState>(initial);
  const [saved, setSaved] = React.useState<EditorState>(initial);
  const [section, setSection] = React.useState<SectionId>("grundinformationen");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [publishPending, setPublishPending] = React.useState(false);
  const [currentStatus, setCurrentStatus] = React.useState(status);

  const dirty = React.useMemo(
    () => JSON.stringify(state) !== JSON.stringify(saved),
    [state, saved],
  );

  // Warnt vor Datenverlust beim Verlassen mit ungespeicherten Änderungen.
  React.useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Springt zur Sektion, wenn die Seite mit einem Anker geöffnet wird.
  React.useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (SECTIONS.some((s) => s.id === hash)) setSection(hash as SectionId);
  }, []);

  function set<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function setSocial(index: number, patch: Partial<SocialLinkDraft>) {
    setState((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link, i) =>
        i === index ? { ...link, ...patch } : link,
      ),
    }));
  }

  function addSocial() {
    const used = new Set(state.socialLinks.map((l) => l.platform));
    const next = PLATFORMS.find((p) => !used.has(p)) ?? "OTHER";
    setState((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { platform: next, url: "", label: "" }],
    }));
  }

  function removeSocial(index: number) {
    setState((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index),
    }));
  }

  async function save() {
    setPending(true);
    setErrors({});
    setFormError(null);

    try {
      await apiRequest(`/api/organizations/${organizationId}`, {
        method: "PATCH",
        body: {
          name: state.name,
          shortName: state.shortName || null,
          tagline: state.tagline || null,
          shortDescription: state.shortDescription || null,
          description: state.description || null,
          history: state.history || null,
          importantInfo: state.importantInfo || null,
          city: state.city,
          street: state.street || null,
          zip: state.zip || null,
          cantonId: state.cantonId,
          contactName: state.contactName || null,
          contactEmail: state.contactEmail || null,
          contactPhone: state.contactPhone || null,
          website: state.website || null,
          bookingEmail: state.bookingEmail || null,
          startDate: state.startDate || null,
          endDate: state.endDate || null,
          foundedYear: state.foundedYear || null,
          memberCount: state.memberCount || null,
          repertoire: state.repertoire || null,
          musicStyle: state.musicStyle || null,
          metaTitle: state.metaTitle || null,
          metaDesc: state.metaDesc || null,
          motto: state.motto || null,
          catchmentArea: state.catchmentArea || null,
          associationType: state.associationType || null,
          typicalPeriod: state.typicalPeriod || null,
          organizerName: state.organizerName || null,
          performanceArea: state.performanceArea || null,
          homeCarnival: state.homeCarnival || null,
          hasParade: state.hasParade,
          hasChildrensCarnival: state.hasChildrensCarnival,
          hasMaskedBall: state.hasMaskedBall,
          hasMonsterConcert: state.hasMonsterConcert,
          hasSchnitzelbank: state.hasSchnitzelbank,
          hasBeizenfasnacht: state.hasBeizenfasnacht,
          arrivalByCar: state.arrivalByCar || null,
          arrivalByPublicTransport: state.arrivalByPublicTransport || null,
          arrivalNotes: state.arrivalNotes || null,
          arrivalMapUrl: state.arrivalMapUrl || null,
          arrivalTransportUrl: state.arrivalTransportUrl || null,
          logoId: state.logo?.id ?? null,
          headerId: state.header?.id ?? null,
        },
      });

      // Social Links werden als vollständige Liste gespeichert.
      await apiRequest(`/api/organizations/${organizationId}/social-links`, {
        method: "PUT",
        body: {
          links: state.socialLinks
            .filter((link) => link.url.trim())
            .map((link) => ({
              platform: link.platform,
              url: link.url.trim(),
              label: link.label || null,
            })),
        },
      });

      setSaved(state);
      toast("Änderungen gespeichert.", "success");
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors(fields);
      setFormError(errorMessage(error));
      toast(errorMessage(error), "error");

      // Springt zur Sektion mit dem ersten Fehler.
      const first = Object.keys(fields)[0];
      if (first) {
        const target = SECTION_BY_FIELD[first];
        if (target) setSection(target);
      }
    } finally {
      setPending(false);
    }
  }

  async function changeStatus(next: PublicationStatus) {
    setPublishPending(true);
    setFormError(null);
    try {
      if (dirty) await save();
      await apiRequest(`/api/organizations/${organizationId}/publish`, {
        method: "POST",
        body: { status: next },
      });
      setCurrentStatus(next);
      toast(
        next === "PUBLISHED" ? "Deine Seite ist jetzt öffentlich." : "Status aktualisiert.",
        "success",
      );
    } catch (error) {
      setFormError(errorMessage(error));
      toast(errorMessage(error), "error");
    } finally {
      setPublishPending(false);
    }
  }

  const isCarnival = type === "CARNIVAL";
  const cantonName = cantons.find((c) => c.id === state.cantonId)?.name ?? "";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        {formError ? (
          <Alert variant="error" className="mb-4">
            {formError}
          </Alert>
        ) : null}

        {/* Sektionsauswahl */}
        <div className="-mx-1 mb-5 overflow-x-auto">
          <div className="flex min-w-max gap-1 border-b border-border px-1">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                aria-current={section === item.id ? "true" : undefined}
                className={cn(
                  "-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  section === item.id
                    ? "border-accent-500 text-primary-900"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <Card className="p-5 sm:p-6">
          {section === "grundinformationen" ? (
            <div className="space-y-4">
              <Field label="Name" htmlFor="name" required error={errors.name}>
                <Input
                  id="name"
                  value={state.name}
                  onChange={(e) => set("name", e.target.value)}
                  maxLength={140}
                />
              </Field>

              <Field
                label="Kurzname"
                htmlFor="shortName"
                error={errors.shortName}
                hint="Optional, z.B. für kompakte Darstellungen."
              >
                <Input
                  id="shortName"
                  value={state.shortName}
                  onChange={(e) => set("shortName", e.target.value)}
                  maxLength={60}
                />
              </Field>

              <Field
                label="Claim"
                htmlFor="tagline"
                error={errors.tagline}
                hint="Ein Satz, der deine Organisation auf den Punkt bringt."
              >
                <Input
                  id="tagline"
                  value={state.tagline}
                  onChange={(e) => set("tagline", e.target.value)}
                  maxLength={160}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Ort" htmlFor="city" required error={errors.city}>
                  <Input
                    id="city"
                    value={state.city}
                    onChange={(e) => set("city", e.target.value)}
                    maxLength={120}
                  />
                </Field>
                <Field label="Kanton" htmlFor="cantonId" required error={errors.cantonId}>
                  <Select
                    id="cantonId"
                    value={state.cantonId}
                    onChange={(e) => set("cantonId", e.target.value)}
                  >
                    {cantons.map((canton) => (
                      <option key={canton.id} value={canton.id}>
                        {canton.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Strasse" htmlFor="street" error={errors.street} className="sm:col-span-2">
                  <Input
                    id="street"
                    value={state.street}
                    onChange={(e) => set("street", e.target.value)}
                    maxLength={160}
                  />
                </Field>
                <Field label="PLZ" htmlFor="zip" error={errors.zip}>
                  <Input
                    id="zip"
                    value={state.zip}
                    onChange={(e) => set("zip", e.target.value)}
                    maxLength={10}
                  />
                </Field>
              </div>

              {isCarnival ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Beginn der Fasnacht" htmlFor="startDate" error={errors.startDate}>
                    <Input
                      id="startDate"
                      type="date"
                      value={state.startDate}
                      onChange={(e) => set("startDate", e.target.value)}
                    />
                  </Field>
                  <Field label="Ende der Fasnacht" htmlFor="endDate" error={errors.endDate}>
                    <Input
                      id="endDate"
                      type="date"
                      value={state.endDate}
                      onChange={(e) => set("endDate", e.target.value)}
                    />
                  </Field>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Gründungsjahr" htmlFor="foundedYear" error={errors.foundedYear}>
                      <Input
                        id="foundedYear"
                        type="number"
                        min={1500}
                        max={2200}
                        value={state.foundedYear}
                        onChange={(e) => set("foundedYear", e.target.value)}
                      />
                    </Field>
                    <Field label="Mitgliederzahl" htmlFor="memberCount" error={errors.memberCount}>
                      <Input
                        id="memberCount"
                        type="number"
                        min={0}
                        max={5000}
                        value={state.memberCount}
                        onChange={(e) => set("memberCount", e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Musikstil" htmlFor="musicStyle" error={errors.musicStyle}>
                    <Input
                      id="musicStyle"
                      value={state.musicStyle}
                      onChange={(e) => set("musicStyle", e.target.value)}
                      maxLength={120}
                      placeholder="z.B. Rock, Charts, Traditionell"
                    />
                  </Field>
                </>
              )}
            </div>
          ) : null}

          {section === "beschreibung" ? (
            <div className="space-y-4">
              <Field
                label="Kurzbeschreibung"
                htmlFor="shortDescription"
                error={errors.shortDescription}
                hint="Erscheint in Listen und Suchergebnissen. Zwei bis drei Sätze genügen."
              >
                <Textarea
                  id="shortDescription"
                  value={state.shortDescription}
                  onChange={(e) => set("shortDescription", e.target.value)}
                  rows={3}
                  maxLength={400}
                />
              </Field>

              <Field
                label="Ausführliche Beschreibung"
                htmlFor="description"
                error={errors.description}
                hint="Leerzeile zwischen den Absätzen erzeugt neue Abschnitte."
              >
                <Textarea
                  id="description"
                  value={state.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={10}
                  maxLength={8000}
                />
              </Field>

              <Field label="Geschichte" htmlFor="history" error={errors.history}>
                <Textarea
                  id="history"
                  value={state.history}
                  onChange={(e) => set("history", e.target.value)}
                  rows={6}
                  maxLength={8000}
                />
              </Field>

              {!isCarnival ? (
                <Field label="Repertoire" htmlFor="repertoire" error={errors.repertoire}>
                  <Textarea
                    id="repertoire"
                    value={state.repertoire}
                    onChange={(e) => set("repertoire", e.target.value)}
                    rows={4}
                    maxLength={2000}
                  />
                </Field>
              ) : null}

              <Field
                label="Wichtige Informationen"
                htmlFor="importantInfo"
                error={errors.importantInfo}
                hint="Wird hervorgehoben dargestellt – z.B. Verkehrshinweise oder Absagen."
              >
                <Textarea
                  id="importantInfo"
                  value={state.importantInfo}
                  onChange={(e) => set("importantInfo", e.target.value)}
                  rows={4}
                  maxLength={4000}
                />
              </Field>
            </div>
          ) : null}

          {section === "merkmale" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Diese Angaben stammen teilweise aus recherchierten Daten. Sobald du sie hier
                bearbeitest, werden sie von späteren Datenimporten nicht mehr überschrieben.
              </p>

              <Field label="Motto" htmlFor="motto" error={errors.motto}>
                <Input
                  id="motto"
                  value={state.motto}
                  onChange={(e) => set("motto", e.target.value)}
                  maxLength={300}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Einzugsgebiet" htmlFor="catchmentArea" error={errors.catchmentArea}>
                  <Input
                    id="catchmentArea"
                    value={state.catchmentArea}
                    onChange={(e) => set("catchmentArea", e.target.value)}
                    maxLength={300}
                  />
                </Field>
                <Field label="Vereinsform" htmlFor="associationType" error={errors.associationType}>
                  <Input
                    id="associationType"
                    value={state.associationType}
                    onChange={(e) => set("associationType", e.target.value)}
                    maxLength={160}
                  />
                </Field>
              </div>

              {isCarnival ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Üblicher Zeitraum"
                      htmlFor="typicalPeriod"
                      error={errors.typicalPeriod}
                      hint="z.B. Montag nach Aschermittwoch"
                    >
                      <Input
                        id="typicalPeriod"
                        value={state.typicalPeriod}
                        onChange={(e) => set("typicalPeriod", e.target.value)}
                        maxLength={200}
                      />
                    </Field>
                    <Field label="Veranstalter" htmlFor="organizerName" error={errors.organizerName}>
                      <Input
                        id="organizerName"
                        value={state.organizerName}
                        onChange={(e) => set("organizerName", e.target.value)}
                        maxLength={200}
                      />
                    </Field>
                  </div>

                  <fieldset>
                    <legend className="mb-2 text-sm font-medium text-slate-700">
                      Was gehört zu dieser Fasnacht?
                    </legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(
                        [
                          ["hasParade", "Umzug"],
                          ["hasChildrensCarnival", "Kinderfasnacht"],
                          ["hasMaskedBall", "Maskenball"],
                          ["hasMonsterConcert", "Monsterkonzert"],
                          ["hasSchnitzelbank", "Schnitzelbank"],
                          ["hasBeizenfasnacht", "Beizenfasnacht"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2.5 text-sm text-slate-700">
                          <Checkbox
                            checked={state[key] === true}
                            onChange={(e) => set(key, e.target.checked ? true : false)}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Einsatzgebiet" htmlFor="performanceArea" error={errors.performanceArea}>
                    <Input
                      id="performanceArea"
                      value={state.performanceArea}
                      onChange={(e) => set("performanceArea", e.target.value)}
                      maxLength={300}
                    />
                  </Field>
                  <Field label="Stammfasnacht" htmlFor="homeCarnival" error={errors.homeCarnival}>
                    <Input
                      id="homeCarnival"
                      value={state.homeCarnival}
                      onChange={(e) => set("homeCarnival", e.target.value)}
                      maxLength={200}
                    />
                  </Field>
                </div>
              )}
            </div>
          ) : null}

          {section === "bilder" ? (
            <div className="grid gap-6 sm:grid-cols-2">
              <ImageUpload
                label="Logo"
                hint="Quadratisch, am besten mit transparentem Hintergrund."
                type="LOGO"
                organizationId={organizationId}
                value={state.logo}
                onChange={(media) => set("logo", media)}
                aspect="aspect-square"
              />
              <ImageUpload
                label="Titelbild"
                hint="Breites Bild, mindestens 1600 Pixel breit."
                type="HEADER"
                organizationId={organizationId}
                value={state.header}
                onChange={(media) => set("header", media)}
              />
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Weitere Bilder verwaltest du in der{" "}
                {/*
                  Immer die Galerie der bearbeiteten Organisation, nie die des
                  angemeldeten Kontos: Admin und Team bearbeiten hier fremde
                  Organisationen, und ein fester Verweis auf „meine Galerie"
                  führte sie in die eigene, nicht vorhandene.
                */}
                <Link
                  href={organizationGalleryPath(organizationId)}
                  className="font-medium text-primary-700 underline"
                >
                  Galerie dieser Organisation
                </Link>
                .
              </p>
            </div>
          ) : null}

          {section === "kontakt" ? (
            <div className="space-y-4">
              <Field label="Ansprechperson" htmlFor="contactName" error={errors.contactName}>
                <Input
                  id="contactName"
                  value={state.contactName}
                  onChange={(e) => set("contactName", e.target.value)}
                  maxLength={120}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="E-Mail" htmlFor="contactEmail" error={errors.contactEmail}>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={state.contactEmail}
                    onChange={(e) => set("contactEmail", e.target.value)}
                    maxLength={200}
                  />
                </Field>
                <Field label="Telefon" htmlFor="contactPhone" error={errors.contactPhone}>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={state.contactPhone}
                    onChange={(e) => set("contactPhone", e.target.value)}
                    maxLength={40}
                  />
                </Field>
              </div>

              <Field
                label="Website"
                htmlFor="website"
                error={errors.website}
                hint="Vollständige Adresse inklusive https://"
              >
                <Input
                  id="website"
                  type="url"
                  value={state.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://www.example.ch"
                  maxLength={500}
                />
              </Field>

              {!isCarnival ? (
                <Field
                  label="E-Mail für Buchungsanfragen"
                  htmlFor="bookingEmail"
                  error={errors.bookingEmail}
                  hint="Wird auf deiner Seite als Kontakt für Auftritte angezeigt."
                >
                  <Input
                    id="bookingEmail"
                    type="email"
                    value={state.bookingEmail}
                    onChange={(e) => set("bookingEmail", e.target.value)}
                    maxLength={200}
                  />
                </Field>
              ) : null}
            </div>
          ) : null}

          {section === "anreise" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Alle Angaben sind freiwillig. Auf deiner Seite erscheint nur, was du hier
                ausfüllst – bleibt alles leer, entfällt der Abschnitt „Anreise“ vollständig.
              </p>

              <Field
                label="Mit dem Auto"
                htmlFor="arrivalByCar"
                error={errors.arrivalByCar}
                hint="Zufahrt, Parkmöglichkeiten, Parkhäuser, Sperrungen, Park and Ride."
              >
                <Textarea
                  id="arrivalByCar"
                  rows={5}
                  value={state.arrivalByCar}
                  onChange={(e) => set("arrivalByCar", e.target.value)}
                  maxLength={4000}
                  placeholder="Parkhaus Bahnhof, 5 Gehminuten. Während des Umzugs ist die Altstadt gesperrt."
                />
              </Field>

              <Field
                label="Mit dem ÖV"
                htmlFor="arrivalByPublicTransport"
                error={errors.arrivalByPublicTransport}
                hint="Bahnhof oder Haltestelle, Fussweg, Sonderfahrplan, Nachtverbindungen."
              >
                <Textarea
                  id="arrivalByPublicTransport"
                  rows={5}
                  value={state.arrivalByPublicTransport}
                  onChange={(e) => set("arrivalByPublicTransport", e.target.value)}
                  maxLength={4000}
                  placeholder="Ab Bahnhof 10 Gehminuten. Bus 3 bis Haltestelle Marktplatz."
                />
              </Field>

              <Field
                label="Weitere Hinweise zur Anreise"
                htmlFor="arrivalNotes"
                error={errors.arrivalNotes}
                hint="Velo, Car, Taxi, Shuttle, barrierefreie Anreise oder örtliche Besonderheiten."
              >
                <Textarea
                  id="arrivalNotes"
                  rows={4}
                  value={state.arrivalNotes}
                  onChange={(e) => set("arrivalNotes", e.target.value)}
                  maxLength={4000}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Karte"
                  htmlFor="arrivalMapUrl"
                  error={errors.arrivalMapUrl}
                  hint="Vollständige Adresse inklusive https://"
                >
                  <Input
                    id="arrivalMapUrl"
                    type="url"
                    value={state.arrivalMapUrl}
                    onChange={(e) => set("arrivalMapUrl", e.target.value)}
                    placeholder="https://maps.app.goo.gl/…"
                    maxLength={500}
                  />
                </Field>
                <Field
                  label="Fahrplanauskunft"
                  htmlFor="arrivalTransportUrl"
                  error={errors.arrivalTransportUrl}
                  hint="Zum Beispiel die Verbindung zum Bahnhof."
                >
                  <Input
                    id="arrivalTransportUrl"
                    type="url"
                    value={state.arrivalTransportUrl}
                    onChange={(e) => set("arrivalTransportUrl", e.target.value)}
                    placeholder="https://www.sbb.ch/…"
                    maxLength={500}
                  />
                </Field>
              </div>
            </div>
          ) : null}

          {section === "social" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Verlinke deine Kanäle. Pro Plattform ist ein Link möglich.
              </p>

              {state.socialLinks.map((link, index) => (
                <div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-end">
                  <Field label="Plattform" className="sm:w-40">
                    <Select
                      value={link.platform}
                      onChange={(e) =>
                        setSocial(index, { platform: e.target.value as SocialPlatform })
                      }
                    >
                      {PLATFORMS.map((platform) => (
                        <option key={platform} value={platform}>
                          {SOCIAL_PLATFORM_LABELS[platform]}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field
                    label="Adresse"
                    className="min-w-0 flex-1"
                    error={errors[`links.${index}.url`]}
                  >
                    <Input
                      value={link.url}
                      onChange={(e) => setSocial(index, { url: e.target.value })}
                      placeholder="https://instagram.com/deine-gugge"
                      maxLength={500}
                    />
                  </Field>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSocial(index)}
                    aria-label="Link entfernen"
                    className="self-end"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}

              {state.socialLinks.length < 12 ? (
                <Button variant="outline" onClick={addSocial}>
                  <Plus />
                  Link hinzufügen
                </Button>
              ) : null}
            </div>
          ) : null}

          {section === "seo" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Diese Angaben erscheinen in Google und beim Teilen in sozialen Netzwerken. Ohne
                Angabe verwenden wir automatisch Name und Kurzbeschreibung.
              </p>

              <Field
                label="Titel für Suchmaschinen"
                htmlFor="metaTitle"
                error={errors.metaTitle}
                hint="Maximal 70 Zeichen."
              >
                <Input
                  id="metaTitle"
                  value={state.metaTitle}
                  onChange={(e) => set("metaTitle", e.target.value)}
                  maxLength={70}
                />
              </Field>

              <Field
                label="Beschreibung für Suchmaschinen"
                htmlFor="metaDesc"
                error={errors.metaDesc}
                hint="Maximal 180 Zeichen."
              >
                <Textarea
                  id="metaDesc"
                  value={state.metaDesc}
                  onChange={(e) => set("metaDesc", e.target.value)}
                  rows={3}
                  maxLength={180}
                />
              </Field>

              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Vorschau in Google
                </p>
                <p className="text-sm text-[#1a0dab]">
                  {state.metaTitle || `${state.name} – ${isCarnival ? "Fasnacht" : "Guggenmusik"} in ${state.city}`}
                </p>
                <p className="text-xs text-[#006621]">fas-nav.ch{publicHref}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {state.metaDesc || state.shortDescription || "Noch keine Beschreibung erfasst."}
                </p>
              </div>
            </div>
          ) : null}
        </Card>

        {/* Aktionsleiste */}
        <div className="sticky bottom-0 mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/95 p-3 shadow-lift backdrop-blur">
          <Button onClick={save} disabled={pending || !dirty}>
            {pending ? <Spinner /> : <Save />}
            {pending ? "Wird gespeichert …" : dirty ? "Speichern" : "Gespeichert"}
          </Button>

          {canPublish ? (
            currentStatus === "PUBLISHED" ? (
              <Button
                variant="outline"
                onClick={() => changeStatus("UNPUBLISHED")}
                disabled={publishPending}
              >
                {publishPending ? <Spinner /> : null}
                Offline nehmen
              </Button>
            ) : (
              <Button
                variant="accent"
                onClick={() => changeStatus("PUBLISHED")}
                disabled={publishPending}
              >
                {publishPending ? <Spinner /> : <Send />}
                Veröffentlichen
              </Button>
            )
          ) : null}

          <ButtonLink href={publicHref} target="_blank" rel="noopener noreferrer" variant="ghost">
            <Eye />
            Öffentliche Seite
          </ButtonLink>

          {dirty ? (
            <span className="ml-auto text-xs font-medium text-amber-700">
              Ungespeicherte Änderungen
            </span>
          ) : null}
        </div>
      </div>

      {/* Live-Vorschau */}
      <aside className="xl:sticky xl:top-6 xl:self-start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Live-Vorschau
        </p>
        <OrganizationPreview state={state} type={type} cantonName={cantonName} />
        <p className="mt-2 text-xs text-muted-foreground">
          Vereinfachte Darstellung. Die vollständige Seite siehst du über „Öffentliche Seite“.
        </p>
      </aside>
    </div>
  );
}

/** Ordnet Feldfehler der passenden Editor-Sektion zu. */
const SECTION_BY_FIELD: Record<string, SectionId> = {
  name: "grundinformationen",
  shortName: "grundinformationen",
  tagline: "grundinformationen",
  city: "grundinformationen",
  cantonId: "grundinformationen",
  street: "grundinformationen",
  zip: "grundinformationen",
  startDate: "grundinformationen",
  endDate: "grundinformationen",
  foundedYear: "grundinformationen",
  memberCount: "grundinformationen",
  musicStyle: "grundinformationen",
  shortDescription: "beschreibung",
  description: "beschreibung",
  history: "beschreibung",
  repertoire: "beschreibung",
  importantInfo: "beschreibung",
  motto: "merkmale",
  catchmentArea: "merkmale",
  associationType: "merkmale",
  typicalPeriod: "merkmale",
  organizerName: "merkmale",
  performanceArea: "merkmale",
  homeCarnival: "merkmale",
  contactName: "kontakt",
  contactEmail: "kontakt",
  contactPhone: "kontakt",
  website: "kontakt",
  bookingEmail: "kontakt",
  metaTitle: "seo",
  metaDesc: "seo",
};

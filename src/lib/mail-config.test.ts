import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.AUTH_SECRET ??= "test-secret-fuer-die-verschluesselung";

import { decryptSecret, encryptSecret, isEncrypted } from "@/lib/crypto";
import { SECRET_PLACEHOLDER, mailConfigComplete } from "@/lib/mail-config";
import { mailErrorMessage } from "@/lib/mail";
import {
  MESSAGE_PREVIEW_MAX,
  PREVIEW_TICKET_PLACEHOLDERS,
  TICKET_MAIL_PLACEHOLDERS,
  fillTicketPlaceholders,
  messagePreview,
  ticketMailHtml,
} from "@/lib/ticket-mail";

/**
 * Tests rund um den Mailversand.
 *
 * Zwei Dinge stehen hier im Vordergrund: dass ein hinterlegtes Passwort
 * niemals im Klartext irgendwo landet, und dass die Vorlage nichts auswertet,
 * was in ihr steht.
 */

describe("Verschlüsselung von Zugangsdaten", () => {
  it("legt nichts im Klartext ab", () => {
    const geheim = "sehr-geheimes-smtp-passwort";
    const abgelegt = encryptSecret(geheim);

    assert.ok(!abgelegt.includes(geheim), "Klartext im gespeicherten Wert");
    assert.ok(isEncrypted(abgelegt));
  });

  it("liefert den ursprünglichen Wert zurück", () => {
    const geheim = "P@ssw0rt mit Leerzeichen und Ümläuten";
    assert.equal(decryptSecret(encryptSecret(geheim)), geheim);
  });

  it("erzeugt für denselben Wert zweimal ein anderes Ergebnis", () => {
    assert.notEqual(encryptSecret("gleich"), encryptSecret("gleich"));
  });

  it("erkennt Veränderungen am gespeicherten Wert", () => {
    const abgelegt = encryptSecret("original");
    // Letztes Zeichen der Nutzdaten kippen.
    const verfaelscht = abgelegt.slice(0, -2) + (abgelegt.endsWith("A") ? "B" : "A") + "=";
    assert.equal(decryptSecret(verfaelscht), null);
  });

  it("behandelt Unlesbares als „nicht hinterlegt“ statt zu werfen", () => {
    assert.equal(decryptSecret(null), null);
    assert.equal(decryptSecret(""), null);
    assert.equal(decryptSecret("klartext-ohne-kennzeichnung"), null);
    assert.equal(decryptSecret("enc:v1:kaputt"), null);
  });

  it("verrät im Platzhalter nichts über den Wert", () => {
    assert.ok(!/[a-z0-9]/i.test(SECRET_PLACEHOLDER));
  });
});

describe("Vollständigkeit der Mailkonfiguration", () => {
  it("braucht Host und Absenderadresse", () => {
    assert.equal(mailConfigComplete({ host: "smtp.example.ch", fromEmail: "a@b.ch" }), true);
    assert.equal(mailConfigComplete({ host: "", fromEmail: "a@b.ch" }), false);
    assert.equal(mailConfigComplete({ host: "smtp.example.ch", fromEmail: "" }), false);
    assert.equal(mailConfigComplete({ host: "   ", fromEmail: "  " }), false);
  });
});

describe("Fehlermeldungen des Mailversands", () => {
  it("nennt den Grund, nie ein Zugangsdatum", () => {
    const meldung = mailErrorMessage({
      code: "EAUTH",
      message: "535 Authentication failed for user admin with password xyz123",
    });
    assert.match(meldung, /Authentifizierung/);
    assert.ok(!meldung.includes("xyz123"), "Passwort in der Meldung");
    assert.ok(!meldung.includes("admin"), "Benutzername in der Meldung");
  });

  it("hat für unbekannte Fehler eine allgemeine Fassung", () => {
    assert.equal(mailErrorMessage(new Error("irgendwas mit geheim123")), "Mailversand fehlgeschlagen.");
    assert.ok(!mailErrorMessage(new Error("geheim123")).includes("geheim123"));
  });
});

describe("Platzhalter der Ticketmail", () => {
  it("ersetzt alle vorgesehenen Platzhalter", () => {
    const text = TICKET_MAIL_PLACEHOLDERS.join(" ");
    const ergebnis = fillTicketPlaceholders(text, PREVIEW_TICKET_PLACEHOLDERS);
    assert.ok(!ergebnis.includes("{{"), `nicht ersetzt: ${ergebnis}`);
  });

  it("lässt unbekannte Platzhalter stehen, statt sie stillschweigend zu leeren", () => {
    const ergebnis = fillTicketPlaceholders("{{gibtsNicht}}", PREVIEW_TICKET_PLACEHOLDERS);
    assert.equal(ergebnis, "{{gibtsNicht}}");
  });

  it("wertet nichts aus", () => {
    const boesartig = "${process.env.AUTH_SECRET} {{constructor}} {{__proto__}} <script>alert(1)</script>";
    const ergebnis = fillTicketPlaceholders(boesartig, PREVIEW_TICKET_PLACEHOLDERS);
    assert.equal(ergebnis, boesartig);
  });

  it("füllt den Betreff mit Nummer und Titel", () => {
    const ergebnis = fillTicketPlaceholders(
      "Neue Antwort auf Ticket #{{ticketNumber}}: {{ticketTitle}}",
      PREVIEW_TICKET_PLACEHOLDERS,
    );
    assert.equal(ergebnis, "Neue Antwort auf Ticket #42: Titelbild wird unscharf dargestellt");
  });
});

describe("Nachrichtenausschnitt", () => {
  it("kürzt lange Nachrichten", () => {
    const lang = "W".repeat(1000);
    assert.ok(messagePreview(lang).length <= MESSAGE_PREVIEW_MAX + 1);
  });

  it("macht reinen Text daraus", () => {
    const ergebnis = messagePreview("Zeile eins\n\nZeile zwei <b>fett</b>");
    assert.ok(!ergebnis.includes("\n"));
    assert.ok(!ergebnis.includes("<"));
    assert.ok(!ergebnis.includes(">"));
  });
});

describe("HTML-Fassung", () => {
  it("maskiert Zeichen aus dem Text", () => {
    const html = ticketMailHtml({
      body: 'Ein <script>alert("x")</script> im Text',
      ticketUrl: "https://fas-nav.ch/dashboard/tickets/1",
    });
    assert.ok(!html.includes("<script>"), "unmaskiertes Skript im HTML");
    assert.ok(html.includes("&lt;script&gt;"));
  });

  it("enthält die Schaltfläche zum Ticket", () => {
    const html = ticketMailHtml({
      body: "Text",
      ticketUrl: "https://fas-nav.ch/dashboard/tickets/1",
    });
    assert.match(html, /Ticket öffnen/);
    assert.match(html, /https:\/\/fas-nav\.ch\/dashboard\/tickets\/1/);
  });
});

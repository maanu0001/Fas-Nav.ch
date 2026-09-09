import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TICKET_STATUSES_AWAITING_TEAM,
  TICKET_STATUSES_FINAL,
  TICKET_STATUS_LABELS,
} from "@/lib/constants";
import {
  nextTicketStatus,
  TICKET_SUBJECT_MAX,
  ticketReplyNotificationTitle,
  ticketStatusChanged,
} from "@/lib/ticket-status";
import type { TicketStatus } from "@prisma/client";

/**
 * Tests der Statusautomatik.
 *
 * Der Zustand eines Tickets soll nichts anderes ausdrücken als: Wer ist am
 * Zug? Deshalb prüfen diese Tests die Regel entlang der Fälle, in denen genau
 * das strittig ist – interne Notizen, abgeschlossene Tickets, mehrfache
 * Antworten derselben Seite.
 */

const ALLE: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

describe("nextTicketStatus", () => {
  it("setzt nach einer Antwort des Teams auf Warten auf Kunde", () => {
    for (const current of ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"] as TicketStatus[]) {
      assert.equal(
        nextTicketStatus({ current, fromStaff: true, isInternal: false }),
        "WAITING_FOR_CUSTOMER",
      );
    }
  });

  it("setzt nach einer Antwort der Organisation zurück auf das Team", () => {
    for (const current of ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"] as TicketStatus[]) {
      assert.equal(
        nextTicketStatus({ current, fromStaff: false, isInternal: false }),
        "OPEN",
      );
    }
  });

  it("bleibt stabil, wenn dieselbe Seite zweimal schreibt", () => {
    const ersteTeamantwort = nextTicketStatus({
      current: "OPEN",
      fromStaff: true,
      isInternal: false,
    });
    const zweiteTeamantwort = nextTicketStatus({
      current: ersteTeamantwort,
      fromStaff: true,
      isInternal: false,
    });
    assert.equal(zweiteTeamantwort, "WAITING_FOR_CUSTOMER");

    const ersteKundenantwort = nextTicketStatus({
      current: "WAITING_FOR_CUSTOMER",
      fromStaff: false,
      isInternal: false,
    });
    const zweiteKundenantwort = nextTicketStatus({
      current: ersteKundenantwort,
      fromStaff: false,
      isInternal: false,
    });
    assert.equal(zweiteKundenantwort, "OPEN");
  });

  it("lässt interne Notizen den Zustand nie verändern", () => {
    for (const current of ALLE) {
      for (const fromStaff of [true, false]) {
        assert.equal(
          nextTicketStatus({ current, fromStaff, isInternal: true }),
          current,
          `interne Notiz auf ${current}`,
        );
      }
    }
  });

  it("öffnet abgeschlossene Tickets nicht erneut", () => {
    for (const current of TICKET_STATUSES_FINAL) {
      for (const fromStaff of [true, false]) {
        assert.equal(
          nextTicketStatus({ current, fromStaff, isInternal: false }),
          current,
          `Antwort auf ${current}`,
        );
      }
    }
  });

  it("liefert für jeden Ausgangszustand einen gültigen Zustand", () => {
    for (const current of ALLE) {
      for (const fromStaff of [true, false]) {
        for (const isInternal of [true, false]) {
          const naechster = nextTicketStatus({ current, fromStaff, isInternal });
          assert.ok(ALLE.includes(naechster), `${current} → ${naechster}`);
        }
      }
    }
  });
});

describe("ticketStatusChanged", () => {
  it("meldet nur echte Wechsel", () => {
    assert.equal(ticketStatusChanged("OPEN", "WAITING_FOR_CUSTOMER"), true);
    assert.equal(ticketStatusChanged("OPEN", "OPEN"), false);
    assert.equal(ticketStatusChanged("CLOSED", "CLOSED"), false);
  });
});

describe("Beschriftungen und Listen", () => {
  it("benennt den Zustand aus Sicht der Wartenden", () => {
    assert.equal(TICKET_STATUS_LABELS.OPEN, "Wartet auf Fas-Nav.ch Team");
    assert.equal(TICKET_STATUS_LABELS.WAITING_FOR_CUSTOMER, "Warten auf Kunde");
  });

  it("hat für jeden Zustand genau eine Beschriftung", () => {
    for (const status of ALLE) {
      assert.equal(typeof TICKET_STATUS_LABELS[status], "string");
      assert.ok(TICKET_STATUS_LABELS[status].length > 0);
    }
  });

  it("zählt für das Team weder abgeschlossene noch wartende Tickets", () => {
    for (const status of TICKET_STATUSES_AWAITING_TEAM) {
      assert.ok(!TICKET_STATUSES_FINAL.includes(status), `${status} ist abgeschlossen`);
    }
    assert.ok(!TICKET_STATUSES_AWAITING_TEAM.includes("WAITING_FOR_CUSTOMER"));
    assert.ok(!TICKET_STATUSES_AWAITING_TEAM.includes("CLOSED"));
    assert.ok(!TICKET_STATUSES_AWAITING_TEAM.includes("RESOLVED"));
  });

  it("enthält genau die Zustände, die eine Kundenantwort erzeugt", () => {
    const ausKundenantwort = nextTicketStatus({
      current: "WAITING_FOR_CUSTOMER",
      fromStaff: false,
      isInternal: false,
    });
    assert.ok(TICKET_STATUSES_AWAITING_TEAM.includes(ausKundenantwort));
  });
});

/**
 * Titel der Meldung über eine Antwort.
 *
 * Entscheidend ist die sichtbare Ticketnummer: Die technische Kennung aus der
 * Datenbank sagt niemandem, um welches Ticket es geht.
 */
describe("ticketReplyNotificationTitle", () => {
  it("nennt Ticketnummer und Betreff", () => {
    assert.equal(
      ticketReplyNotificationTitle({ number: 1, subject: "Titelbild wird unscharf dargestellt" }),
      "Antwort auf Ticket #1: Titelbild wird unscharf dargestellt",
    );
  });

  it("verwendet die fortlaufende Nummer, nicht die Datenbankkennung", () => {
    const titel = ticketReplyNotificationTitle({ number: 42, subject: "Frage" });
    assert.match(titel, /#42/);
    assert.ok(!titel.includes("cl"), "keine Kennung im Titel");
  });

  it("unterscheidet die Meldung an das Team", () => {
    assert.equal(
      ticketReplyNotificationTitle({ number: 7, subject: "Frage", forStaff: true }),
      "Neue Antwort in Ticket #7: Frage",
    );
  });

  it("kürzt lange Betreffzeilen, behält aber Nummer und Anfang", () => {
    const lang = "L".repeat(400);
    const titel = ticketReplyNotificationTitle({ number: 3, subject: lang });
    assert.match(titel, /^Antwort auf Ticket #3: /);
    assert.ok(titel.length < lang.length, "Titel ist gekürzt");
    assert.ok(titel.length <= "Antwort auf Ticket #3: ".length + TICKET_SUBJECT_MAX + 1);
  });

  it("lässt kurze Betreffzeilen unangetastet", () => {
    const betreff = "K".repeat(TICKET_SUBJECT_MAX);
    assert.ok(ticketReplyNotificationTitle({ number: 9, subject: betreff }).endsWith(betreff));
  });
});

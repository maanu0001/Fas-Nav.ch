import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PERMISSIONS,
  can,
  isAdmin,
  isStaff,
  membershipRoleAllows,
  organizationCapabilities,
  STAFF_ROLES,
} from "@/lib/rbac";
import type { Role } from "@prisma/client";

/**
 * Tests der Berechtigungsmatrix.
 *
 * Diese Regeln entscheiden über Zugriffe auf Zahlungen, den Datenimport, die
 * Startseite und das Datenqualitäts-Center. Ändert jemand die Matrix, sollen
 * diese Tests das sofort melden.
 */

const ROLLEN: Role[] = ["ADMIN", "TEAM", "FASNACHT", "GUGGE"];

describe("Rollen", () => {
  it("kennt genau vier Rollen", () => {
    assert.deepEqual(ROLLEN.length, 4);
  });

  it("Admin und Team haben plattformweiten Zugriff, Organisationskonten nicht", () => {
    assert.deepEqual(STAFF_ROLES, ["ADMIN", "TEAM"]);
    assert.equal(isStaff("ADMIN"), true);
    assert.equal(isStaff("TEAM"), true);
    assert.equal(isStaff("FASNACHT"), false);
    assert.equal(isStaff("GUGGE"), false);
    assert.equal(isAdmin("TEAM"), false);
    assert.equal(isAdmin("ADMIN"), true);
  });
});

describe("Berechtigungen je Rolle", () => {
  const nurAdmin = [
    "managePayments",
    "viewFinancialFigures",
    "reviewDataQuality",
    "manageHomepage",
    "importData",
    "manageSettings",
    "managePlans",
    "manageStaffAccounts",
  ] as const;

  for (const recht of nurAdmin) {
    it(`${recht}: nur ADMIN`, () => {
      assert.equal(can("ADMIN", recht), true);
      assert.equal(can("TEAM", recht), false);
      assert.equal(can("FASNACHT", recht), false);
      assert.equal(can("GUGGE", recht), false);
    });
  }

  const adminUndTeam = [
    "manageOrganizations",
    "manageAllEvents",
    "manageOrgAccounts",
    "manageSubscriptions",
    "viewAllTickets",
    "verifyOrganizations",
    // Kontaktanfragen und Übernahmeanfragen sind operative Arbeit des Teams.
    "handleContactRequests",
  ] as const;

  for (const recht of adminUndTeam) {
    it(`${recht}: ADMIN und TEAM`, () => {
      assert.equal(can("ADMIN", recht), true);
      assert.equal(can("TEAM", recht), true);
      assert.equal(can("FASNACHT", recht), false);
      assert.equal(can("GUGGE", recht), false);
    });
  }

  it("Organisationskonten erhalten über die globale Rolle kein Plattformrecht", () => {
    for (const recht of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) {
      assert.equal(can("FASNACHT", recht), false, `FASNACHT sollte ${recht} nicht haben`);
      assert.equal(can("GUGGE", recht), false, `GUGGE sollte ${recht} nicht haben`);
    }
  });

  it("ohne Rolle besteht kein Zugriff", () => {
    assert.equal(can(null, "manageOrganizations"), false);
    assert.equal(can(undefined, "managePayments"), false);
  });
});

/**
 * Zugriff auf einzelne Organisationen – die Grundlage der Galerieverwaltung.
 *
 * Die Galerie hat keine eigene Rechteprüfung: Sie hängt an der Fähigkeit
 * `edit` der jeweiligen Organisation, geprüft von `resolveOrganizationAccess`
 * über genau diese Funktion. Die Tests halten deshalb fest, dass Admin und
 * Team in jeder Organisation bearbeiten dürfen und Organisationskonten nur
 * dort, wo sie eine Membership haben.
 */
describe("Fähigkeiten in einer Organisation", () => {
  it("Admin und Team dürfen in jeder Organisation alles – auch ohne Membership", () => {
    for (const role of ["ADMIN", "TEAM"] as Role[]) {
      const faehigkeiten = organizationCapabilities({ role, membershipRole: null });
      assert.deepEqual(faehigkeiten.sort(), ["edit", "manage", "manageMembers", "view"]);
      assert.ok(faehigkeiten.includes("edit"), `${role} darf Galerie bearbeiten`);
    }
  });

  it("Organisationskonten ohne Membership haben keinerlei Zugriff", () => {
    for (const role of ["FASNACHT", "GUGGE"] as Role[]) {
      assert.deepEqual(organizationCapabilities({ role, membershipRole: null }), []);
    }
  });

  it("Organisationskonten leiten ihre Rechte aus der Membership ab", () => {
    for (const role of ["FASNACHT", "GUGGE"] as Role[]) {
      assert.deepEqual(
        organizationCapabilities({ role, membershipRole: "OWNER" }).sort(),
        ["edit", "manage", "manageMembers", "view"],
      );
      assert.deepEqual(
        organizationCapabilities({ role, membershipRole: "MANAGER" }).sort(),
        ["edit", "manage", "view"],
      );
      assert.deepEqual(
        organizationCapabilities({ role, membershipRole: "EDITOR" }).sort(),
        ["edit", "view"],
      );
    }
  });

  it("die Membership eines Plattformkontos schränkt es nicht ein", () => {
    // Ein Admin mit der schwächsten Membership behält den vollen Umfang.
    assert.ok(
      organizationCapabilities({ role: "ADMIN", membershipRole: "EDITOR" }).includes(
        "manageMembers",
      ),
    );
  });

  it("gibt bei jedem Aufruf eine eigene Liste zurück", () => {
    const erste = organizationCapabilities({ role: "ADMIN", membershipRole: null });
    erste.pop();
    const zweite = organizationCapabilities({ role: "ADMIN", membershipRole: null });
    assert.equal(zweite.length, 4);
  });

  it("bestätigt die Rollenmatrix der organisationsinternen Rollen", () => {
    assert.equal(membershipRoleAllows("EDITOR", "edit"), true);
    assert.equal(membershipRoleAllows("EDITOR", "manage"), false);
    assert.equal(membershipRoleAllows("MANAGER", "manageMembers"), false);
    assert.equal(membershipRoleAllows("OWNER", "manageMembers"), true);
  });
});

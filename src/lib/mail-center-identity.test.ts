import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mailboxProviderId } from "@/lib/mail-center-identity";

describe("Mail Center IMAP message identity", () => {
  it("does not confuse incoming self-sent mail with outgoing copy", () => {
    assert.equal(mailboxProviderId("INBOX", "100", 42, "local:<same-id@fas-nav.ch>"), "INBOX:100:42");
  });
  it("reuses local outgoing record for the copy saved in Sent", () => {
    assert.equal(mailboxProviderId("Sent", "100", 20, "local:<same-id@fas-nav.ch>"), "local:<same-id@fas-nav.ch>");
  });
  it("preserves distinct folders and UIDVALIDITY", () => {
    assert.notEqual(mailboxProviderId("INBOX", "100", 42), mailboxProviderId("INBOX", "101", 42));
    assert.equal(mailboxProviderId("Sent", "100", 42), "Sent:100:42");
  });
});

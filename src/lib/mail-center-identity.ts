/** Stable per-folder IMAP key. Incoming messages are always distinct from sent copies. */
export function mailboxProviderId(folder: string, uidvalidity: string, uid: number, knownSentId?: string | null): string {
  const imapId = `${folder}:${uidvalidity}:${uid}`;
  // Self-sent and returned emails share Message-ID but are separate delivery records.
  return folder.toUpperCase() === "INBOX" ? imapId : (knownSentId || imapId);
}

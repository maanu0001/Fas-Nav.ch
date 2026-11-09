import "server-only";

/** Match browser Origin against the externally configured site, not Docker's internal URL. */
export function validBackupOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = [process.env.NEXT_PUBLIC_APP_URL, process.env.AUTH_URL]
    .filter((value): value is string => Boolean(value))
    .flatMap(value => { try { return [new URL(value).origin]; } catch { return []; } });
  // A reverse proxy can expose a different internal URL; never trust Host/X-Forwarded-Host as an allowlist.
  return allowed.includes(origin);
}

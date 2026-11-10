import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, open, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";


export const BACKUP_ROOT = process.env.BACKUP_DIR || "/app/backups";
const ID = /^20\d{6}T\d{6}Z-[a-f0-9]{12}$/;
export function validBackupId(id: string) { return ID.test(id); }
export type BackupEntry = { id: string; createdAt: string; databaseBytes: number; uploadsBytes: number; verified: boolean; restoreTest?: { status: "passed" | "failed"; checkedAt: string; databaseHash?: string; uploadsHash?: string } };
async function hashFile(path: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
async function command(program: string, args: string[], env: NodeJS.ProcessEnv) {
  const child = spawn(program, args, { env, stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", chunk => { stderr = (stderr + chunk).slice(-3000); });
  const exit = new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", code => code === 0 ? resolve() : reject(new Error(program + " failed: " + stderr)));
  });
  try { await exit; } catch (error) { child.kill(); throw error; }
}
export async function listBackups(): Promise<BackupEntry[]> {
  await mkdir(BACKUP_ROOT, { recursive: true, mode: 0o700 });
  const names = await readdir(BACKUP_ROOT);
  const entries = await Promise.all(names.filter(validBackupId).map(async id => {
    try {
      const root = join(BACKUP_ROOT, id);
      const data = JSON.parse(await readFile(join(root, "manifest.json"), "utf8")) as BackupEntry;
      if (data.id !== id) return null;
      const [db, uploads] = await Promise.all([stat(join(root, "database.dump")), stat(join(root, "uploads.tar.gz"))]);
      return { ...data, databaseBytes: db.size, uploadsBytes: uploads.size };
    } catch { return null; }
  }));
  return entries.filter((e): e is BackupEntry => Boolean(e)).sort((a,b) => b.id.localeCompare(a.id));
}
export async function createBackup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL fehlt");
  const parsed = new URL(url);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error("PostgreSQL erforderlich");
  const id = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z") + "-" + randomUUID().replace(/-/g, "").slice(0, 12);
  await mkdir(BACKUP_ROOT, { recursive: true, mode: 0o700 });
  const lockPath = join(BACKUP_ROOT, ".create.lock");
  const lock = await open(lockPath, "wx", 0o600).catch(() => { throw new Error("Ein Backup läuft bereits oder eine verwaiste Sperre muss geprüft werden."); });
  const temp = join(BACKUP_ROOT, ".incomplete-" + id);
  try { await mkdir(temp, { mode: 0o700 }); }
  catch (error) { await lock.close(); await rm(lockPath, { force: true }); throw error; }
  const env = { ...process.env, PGHOST: parsed.hostname, PGPORT: parsed.port || "5432", PGUSER: decodeURIComponent(parsed.username), PGPASSWORD: decodeURIComponent(parsed.password), PGDATABASE: decodeURIComponent(parsed.pathname.slice(1)) };
  try {
    await command("pg_dump", ["--format=custom", "--no-owner", "--no-acl", "--file", join(temp, "database.dump")], env);
    await command("tar", ["-C", process.env.UPLOAD_DIR || "/app/public/uploads", "-czf", join(temp, "uploads.tar.gz"), "."], env);
    const [db, uploads] = await Promise.all([stat(join(temp, "database.dump")), stat(join(temp, "uploads.tar.gz"))]);
    if (!db.size || !uploads.size) throw new Error("Backup unvollständig");
    await command("pg_restore", ["--list", join(temp, "database.dump")], env);
    await validateMediaArchive(join(temp, "uploads.tar.gz"));
    const manifest = { id, createdAt: new Date().toISOString(), databaseBytes: db.size, uploadsBytes: uploads.size, verified: true, sha256: { database: await hashFile(join(temp, "database.dump")), uploads: await hashFile(join(temp, "uploads.tar.gz")) } };
    await writeFile(join(temp, "manifest.json"), JSON.stringify(manifest, null, 2), { mode: 0o600 });
    await rename(temp, join(BACKUP_ROOT, id));
    // Retention must never turn a completed, verified backup into HTTP 500.
    try { await pruneOldBackups(); }
    catch (error) { console.error("Backup retention failed after successful creation", error); }
    return manifest;
  } catch (error) { await rm(temp, { recursive: true, force: true }); throw error; }
  finally { await lock.close(); await rm(lockPath, { force: true }); }
}
export async function getBackupFile(id: string, kind: "database" | "uploads") {
  if (!validBackupId(id)) return null;
  const root = join(BACKUP_ROOT, id);
  const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
  if (manifest.id !== id || manifest.verified !== true) return null;
  const filename = kind === "database" ? "database.dump" : "uploads.tar.gz";
  const path = join(root, filename);
  if (await hashFile(path) !== manifest.sha256?.[kind]) throw new Error("Prüfsumme stimmt nicht überein");
  return { path, filename, size: (await stat(path)).size };
}

/** Reject tar path traversal, absolute paths and links before accepting media archives. */
async function validateMediaArchive(path: string) {
  // Listing is safe, but tar extraction of user-supplied archives is not.
  // Only regular files/directories with relative paths are accepted.
  const { execFile: exec } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(exec);
  const { stdout: names } = await run("tar", ["-tzf", path], { maxBuffer: 32 * 1024 * 1024 });
  const entries = names.split("\n").filter(Boolean);
  if (!entries.length) throw new Error("Medienarchiv ist leer");
  for (const name of entries) {
    // GNU tar includes "./" for the archive root; this is safe.
    if (name === "./" || name === ".") continue;
    const normalized = name.replace(/^\.\//, "");
    if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..") || normalized.includes("\0")) {
      throw new Error("Unsicherer Pfad im Medienarchiv");
    }
  }
  const { stdout: verbose } = await run("tar", ["-tvzf", path], { maxBuffer: 32 * 1024 * 1024 });
  for (const line of verbose.split("\n").filter(Boolean)) {
    if (!["-", "d"].includes(line[0])) throw new Error("Medienarchiv enthält Links oder Spezialdateien");
  }
}
/** Accept a downloaded backup pair only after archive validation. Never writes to live DB. */
export async function importBackupFiles(database: File, uploads: File) {
  const max = Number(process.env.BACKUP_IMPORT_MAX_BYTES || 536870912);
  if (!database.size || !uploads.size || database.size > max || uploads.size > max) throw new Error("Backup-Dateien fehlen oder überschreiten die Grössenbegrenzung.");
  await mkdir(BACKUP_ROOT, { recursive: true, mode: 0o700 });
  const id = new Date().toISOString().slice(0, 19).replace(/[-:]/g, "") + "Z" + "-" + randomUUID().replace(/-/g, "").slice(0, 12);
  const temp = join(BACKUP_ROOT, ".import-" + id);
  await mkdir(temp, { mode: 0o700 });
  try {
    const dbPath = join(temp, "database.dump");
    const uploadPath = join(temp, "uploads.tar.gz");
    await writeFile(dbPath, Buffer.from(await database.arrayBuffer()), { mode: 0o600 });
    await writeFile(uploadPath, Buffer.from(await uploads.arrayBuffer()), { mode: 0o600 });
    await command("pg_restore", ["--list", dbPath], process.env);
    await validateMediaArchive(uploadPath);
    const [db, media] = await Promise.all([stat(dbPath), stat(uploadPath)]);
    const manifest = { id, createdAt: new Date().toISOString(), databaseBytes: db.size, uploadsBytes: media.size, verified: true, sha256: { database: await hashFile(dbPath), uploads: await hashFile(uploadPath) }, source: "import" };
    await writeFile(join(temp, "manifest.json"), JSON.stringify(manifest, null, 2), { mode: 0o600 });
    await rename(temp, join(BACKUP_ROOT, id));
    return manifest;
  } catch (error) { await rm(temp, { recursive: true, force: true }); throw error; }
}

/** Restore rehearsal against a separately configured PostgreSQL server. */
export async function testRestore(id: string) {
  if (!validBackupId(id)) throw new Error("Ungültige Backup-ID");
  const source = process.env.DATABASE_URL;
  const target = process.env.BACKUP_TEST_DATABASE_URL;
  if (!source || !target) throw new Error("Isolierte Testdatenbank ist noch nicht konfiguriert");
  const live = new URL(source);
  const test = new URL(target);
  if (test.hostname === live.hostname || !test.hostname || !test.pathname.slice(1) || !test.password) throw new Error("Testdatenbank muss auf einem anderen PostgreSQL-Server liegen");
  const db = await getBackupFile(id, "database");
  const media = await getBackupFile(id, "uploads");
  if (!db || !media) throw new Error("Backup nicht gefunden");
  const lockPath = join(BACKUP_ROOT, ".restore-test.lock");
  const lock = await open(lockPath, "wx", 0o600).catch(() => { throw new Error("Eine Restore-Prüfung läuft bereits"); });
  const env = { ...process.env, PGHOST: test.hostname, PGPORT: test.port || "5432", PGUSER: decodeURIComponent(test.username), PGPASSWORD: decodeURIComponent(test.password), PGDATABASE: decodeURIComponent(test.pathname.slice(1)) };
  try {
    await command("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-c", "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"], env);
    // Alpine may ship pg_restore 17+ while the test server runs PostgreSQL 16.
    // Render SQL first and remove only the unsupported session setting.
    const sqlPath = join(BACKUP_ROOT, ".restore-test-" + id + ".sql");
    try {
      await command("pg_restore", ["--no-owner", "--no-acl", "--file", sqlPath, db.path], env);
      await command("sed", ["-i", "/^SET transaction_timeout = 0;$/d", sqlPath], env);
      await command("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-f", sqlPath], env);
    } finally {
      await rm(sqlPath, { force: true });
    }
    // Verify media can be extracted safely without touching production uploads.
    await validateMediaArchive(media.path);
    const mediaTestDir = join(BACKUP_ROOT, ".media-test-" + id);
    await mkdir(mediaTestDir, { mode: 0o700 });
    try {
      await command("tar", ["-xzf", media.path, "-C", mediaTestDir], env);
    } finally { await rm(mediaTestDir, { recursive: true, force: true }); }
    await command("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-c", "SELECT 1 / (SELECT count(*)::integer FROM information_schema.tables WHERE table_schema = 'public');"], env);
    const root = join(BACKUP_ROOT, id);
    const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
    manifest.restoreTest = { status: "passed", checkedAt: new Date().toISOString(), databaseHash: await hashFile(db.path), uploadsHash: await hashFile(media.path) };
    await writeFile(join(root, "manifest.json"), JSON.stringify(manifest, null, 2), { mode: 0o600 });
    return manifest.restoreTest;
  } catch (error) {
    const root = join(BACKUP_ROOT, id);
    const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
    manifest.restoreTest = { status: "failed", checkedAt: new Date().toISOString() };
    await writeFile(join(root, "manifest.json"), JSON.stringify(manifest, null, 2), { mode: 0o600 });
    throw error;
  } finally { await lock.close(); await rm(lockPath, { force: true }); }
}

/**
 * Retain recent backups without deleting the last known good recovery point.
 * Failures are non-fatal: never turn a successful backup into an error because
 * an old snapshot could not be deleted.
 */
export async function pruneOldBackups() {
  const days = Number(process.env.BACKUP_RETENTION_DAYS || "30");
  if (!Number.isInteger(days) || days < 7 || days > 3650) return;
  const entries = await listBackups();
  const cutoff = Date.now() - days * 86400000;
  for (const entry of entries.slice(1)) {
    if (new Date(entry.createdAt).getTime() >= cutoff) continue;
    try {
      const root = join(BACKUP_ROOT, entry.id);
      const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
      if (manifest.id !== entry.id || manifest.verified !== true) continue;
      await rm(root, { recursive: true, force: true });
    } catch (error) {
      console.error("Backup retention cleanup failed", entry.id, error);
    }
  }
}

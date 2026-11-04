import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liefert hochgeladene Dateien aus.
 *
 * Notwendig, weil Next.js das Verzeichnis `public/` beim Build einliest:
 * Dateien, die im laufenden Betrieb hinzukommen, würden sonst nicht
 * ausgeliefert. Im Produktivbetrieb hinter nginx oder Traefik kann
 * `/uploads/` alternativ direkt vom Reverse Proxy bedient werden.
 */

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".mp3": "audio/mpeg",
};

const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR ?? "./public/uploads");

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, { params }: Params) {
  const { path: segments } = await params;

  // Path Traversal ausschliessen: Ziel muss innerhalb des Upload-Verzeichnisses liegen.
  const requested = path.resolve(UPLOAD_ROOT, ...segments);
  if (requested !== UPLOAD_ROOT && !requested.startsWith(UPLOAD_ROOT + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const extension = path.extname(requested).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    // Nur bekannte, unkritische Dateitypen werden ausgeliefert.
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const stats = await stat(requested);
    if (!stats.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }

    const stream = Readable.toWeb(
      createReadStream(requested),
    ) as unknown as ReadableStream<Uint8Array>;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(stats.size),
        // Dateinamen sind eindeutig und werden nie überschrieben.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

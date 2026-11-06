import { prisma } from "@/lib/prisma";
import { deleteMedia } from "@/lib/media";

export async function removeUnusedListingMedia(urls: string[]) {
  for (const url of new Set(urls.filter(x => x.startsWith("/uploads/")))) {
    const record = await prisma.media.findFirst({
      where: { url },
      select: { id: true, type: true, caption: true, eventImages: { select: { id: true }, take: 1 } },
    });
    if (!record) continue;
    if (record.type !== "EVENT" && !(record.type === "DOCUMENT" && record.caption === "marketplace-listing")) continue;
    if (record.eventImages.length) continue;
    const references = await prisma.marketplaceListing.count({ where: { imageUrls: { has: url } } });
    if (!references) await deleteMedia(record.id);
  }
}

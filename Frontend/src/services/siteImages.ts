import { apiRequest } from "./api";

/**
 * Photos that admins can set for the public landing page.
 * Backend contract: see Frontend/SITE_IMAGES_API.md
 *
 *   GET    /api/site-images                 public, no login   -> SiteImage[]
 *   PUT    /api/admin/site-images/{slot}    admin only, multipart field "file" -> SiteImage
 *   DELETE /api/admin/site-images/{slot}    admin only         -> 204
 */
export type SiteImageSlot =
  | "fin-connect-programs"
  | "fin-connect-guide"
  | "fin-connect-lab"
  | "fin-connect-partners";

export interface SiteImage {
  slot: SiteImageSlot;
  /** Full https:// address of the image. Must change whenever the image is replaced. */
  url: string;
  updated_at: string;
}

export const siteImageSlots: { slot: SiteImageSlot; label: string; where: string }[] = [
  {
    slot: "fin-connect-programs",
    label: "Programs & Events card",
    where: "FIN CONNECT, first card",
  },
  {
    slot: "fin-connect-guide",
    label: "Career Guide card",
    where: "FIN CONNECT, second card",
  },
  {
    slot: "fin-connect-lab",
    label: "FIN Developer Lab card",
    where: "FIN CONNECT, third card",
  },
  {
    slot: "fin-connect-partners",
    label: "FIN Partners card",
    where: "FIN CONNECT, fourth card",
  },
];

export async function listSiteImages() {
  const rows = await apiRequest<SiteImage[]>("/api/site-images");
  const bySlot: Partial<Record<SiteImageSlot, string>> = {};
  for (const row of rows) bySlot[row.slot] = row.url;
  return bySlot;
}

export function uploadSiteImage(slot: SiteImageSlot, file: Blob, filename: string) {
  const form = new FormData();
  form.append("file", file, filename);
  return apiRequest<SiteImage>(`/api/admin/site-images/${slot}`, {
    method: "PUT",
    body: form,
  });
}

export function removeSiteImage(slot: SiteImageSlot) {
  return apiRequest<void>(`/api/admin/site-images/${slot}`, { method: "DELETE" });
}

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxPickedBytes = 15 * 1024 * 1024;
const maxWidth = 1600;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Shrinks a picked photo in the browser before upload: at most 1600px wide,
 * saved as WebP (JPEG if the browser cannot make WebP). This keeps the upload
 * small (the backend runs on Vercel, which rejects large request bodies) and
 * keeps the landing page fast.
 */
export async function prepareSiteImage(file: File) {
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Choose a JPG, PNG or WebP image.");
  }
  if (file.size > maxPickedBytes) {
    throw new Error("That image is larger than 15 MB. Choose a smaller one.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That file could not be read as an image.");
  }

  try {
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not process this image.");
    // White behind transparent PNGs so they do not turn black in JPEG.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, "image/webp", 0.82);
    let extension = "webp";
    if (!blob || blob.type !== "image/webp") {
      blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
      extension = "jpg";
    }
    if (!blob) throw new Error("Your browser could not process this image.");
    return { blob, filename: `site-image.${extension}` };
  } finally {
    bitmap.close();
  }
}

import type { MediaFile } from "../../types";
/** Build MIME/file name from the actual native crop result instead of assuming JPEG. */
export function avatarFileFromUri(uri: string, id: string): MediaFile {
  const pathname = uri.split(/[?#]/, 1)[0].toLowerCase();
  const ext = /\.(png|jpe?g|webp|heic|heif)$/.exec(pathname)?.[1] ?? "jpg";
  const format = ext === "jpeg" ? "jpg" : ext;
  const mimeType = format === "jpg" ? "image/jpeg"
    : format === "png" ? "image/png" : format === "webp" ? "image/webp"
    : format === "heif" ? "image/heif" : "image/heic";
  return { id, uri, type: "image", mimeType, fileName: `${id}.${format}`, purpose: "avatar" };
}

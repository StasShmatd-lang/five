export async function fileToDataUrl(file: File, maxSide = 720, maxChars = 420_000): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Нужно изображение");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas недоступен");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  let quality = 0.82;
  let out = canvas.toDataURL("image/jpeg", quality);
  while (out.length > maxChars && quality > 0.35) {
    quality -= 0.1;
    out = canvas.toDataURL("image/jpeg", quality);
  }
  if (out.length > maxChars + 40_000) throw new Error("Фото слишком большое");
  return out;
}

export function canvasToDataUrl(canvas: HTMLCanvasElement, maxChars = 380_000): string {
  let quality = 0.88;
  let out = canvas.toDataURL("image/jpeg", quality);
  while (out.length > maxChars && quality > 0.4) {
    quality -= 0.08;
    out = canvas.toDataURL("image/jpeg", quality);
  }
  if (out.length > maxChars + 20_000) throw new Error("Рисунок слишком большой");
  return out;
}

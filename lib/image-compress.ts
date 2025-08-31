export type CompressOptions = {
  maxSize: number; // lado maior em px (ex.: 1600)
  format: "image/webp" | "image/jpeg"; // preferir webp
  quality: number; // 0..1 (ex.: 0.75)
  targetBytes?: number; // opcional: alvo de tamanho (ex.: 500_000)
  minQuality?: number; // limite inferior se usar targetBytes (ex.: 0.5)
};

function drawToCanvas(img: HTMLImageElement, maxSize: number) {
  const { naturalWidth: w, naturalHeight: h } = img;
  const ratio = Math.min(1, maxSize / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * ratio));
  const ch = Math.max(1, Math.round(h * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, cw, ch);
  return canvas;
}

async function blobToFile(blob: Blob, name: string): Promise<File> {
  return new File([blob], name, { type: blob.type, lastModified: Date.now() });
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }

  // cria de novo pra devolver elemento carregado
  const img = new Image();
  img.src = URL.createObjectURL(file);
  return new Promise((resolve) => {
    img.onload = () => resolve(img);
  });
}

export async function compressImageFile(
  file: File,
  opts: CompressOptions
): Promise<File> {
  const img = await loadImageFromFile(file);
  const canvas = drawToCanvas(img, opts.maxSize);

  // função pra encodar com qualidade X
  const encode = (q: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        opts.format,
        q
      );
    });

  // sem alvo de bytes → 1 passo só
  if (!opts.targetBytes) {
    const blob = await encode(opts.quality);
    const ext = opts.format === "image/webp" ? ".webp" : ".jpg";
    const name = file.name.replace(/\.(heic|heif|png|jpg|jpeg|webp)$/i, ext);
    return blobToFile(blob, name);
  }

  // com alvo → binary search de qualidade
  let low = opts.minQuality ?? 0.5;
  let high = opts.quality;
  let bestBlob: Blob | null = null;

  for (let i = 0; i < 6; i++) {
    // 6 iterações já aproxima bem
    const mid = (low + high) / 2;
    const blob = await encode(mid);
    if (blob.size > opts.targetBytes) {
      // ainda grande → reduzir mais
      high = mid;
    } else {
      bestBlob = blob; // bom o suficiente
      low = mid;
    }
  }

  const finalBlob = bestBlob ?? (await encode(low));
  const ext = opts.format === "image/webp" ? ".webp" : ".jpg";
  const name = file.name.replace(/\.(heic|heif|png|jpg|jpeg|webp)$/i, ext);
  return blobToFile(finalBlob, name);
}

export interface CompressedImageResult {
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
}

/**
 * Client-side image compression using an offscreen HTML5 canvas.
 * Preserves aspect ratio, caps max dimension, and outputs optimized JPEG.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1440,
  quality = 0.84
): Promise<CompressedImageResult> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to decode image file.'));
      image.src = objectUrl;
    });

    let { width, height } = img;
    if (width > maxDimension || height > maxDimension) {
      const ratio = Math.min(maxDimension / width, maxDimension / height);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable.');
    }
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error('Image compression failed.'));
        },
        'image/jpeg',
        quality
      );
    });

    const previewUrl = await blobToDataUrl(blob);
    return { blob, previewUrl, width, height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read compressed blob.'));
    };
    reader.onerror = () => reject(new Error('FileReader error.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Compresses an image Blob until its JPEG Data URL fits under `maxChars`,
 * ensuring safe Firestore persistence when Cloud Storage is unavailable.
 */
export async function compressBlobToMaxDataUrl(
  blob: Blob,
  maxChars = 220_000
): Promise<string> {
  const initialUrl = await blobToDataUrl(blob);
  if (initialUrl.length <= maxChars) {
    return initialUrl;
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to decode image blob.'));
      image.src = objectUrl;
    });

    const attempts: Array<{ maxDim: number; quality: number }> = [
      { maxDim: 1080, quality: 0.76 },
      { maxDim: 860, quality: 0.68 },
      { maxDim: 680, quality: 0.58 },
      { maxDim: 520, quality: 0.48 },
    ];

    for (const { maxDim, quality } of attempts) {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.drawImage(img, 0, 0, width, height);

      const candidateBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((res) => resolve(res), 'image/jpeg', quality);
      });
      if (!candidateBlob) continue;
      const candidateUrl = await blobToDataUrl(candidateBlob);
      if (candidateUrl.length <= maxChars) {
        return candidateUrl;
      }
    }

    return initialUrl.slice(0, maxChars);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

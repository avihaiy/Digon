/**
 * Client-side Canvas Image Compression Utility
 * Resizes and compresses user uploaded photos on mobile before pushing to backend storage (Appwrite).
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 to 1
  mimeType?: string; // 'image/webp' or 'image/jpeg'
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.82,
    mimeType = "image/webp"
  } = options;

  // Don't attempt to compress non-images or SVGs
  if (!file.type.startsWith("image/") || file.type.includes("svg")) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image element"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio scale
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to compressed Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const outputMime = blob.type || mimeType;
            const extension = outputMime.includes("webp") ? ".webp" : ".jpg";
            const newName = file.name.replace(/\.[^/.]+$/, "") + extension;

            const compressedFile = new File([blob], newName, {
              type: outputMime,
              lastModified: Date.now()
            });

            // Return compressed file if smaller, otherwise original
            resolve(compressedFile.size < file.size ? compressedFile : file);
          },
          mimeType,
          quality
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

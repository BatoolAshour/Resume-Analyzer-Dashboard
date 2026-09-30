import { fileExtension } from "@/lib/utils";

export interface UploadLimits {
  maxUploadMb: number;
  allowedExtensions: string[];
}

/** Returns a user-facing error, or null when the file can be uploaded. */
export function validateFile(file: File, limits: UploadLimits): string | null {
  const extension = fileExtension(file.name);
  if (!limits.allowedExtensions.includes(extension)) {
    const allowed = limits.allowedExtensions
      .map((e) => e.slice(1).toUpperCase())
      .join(", ");
    return `"${file.name}" is not a supported file type. Upload a ${allowed} file.`;
  }
  if (file.size === 0) {
    return `"${file.name}" is empty.`;
  }
  if (file.size > limits.maxUploadMb * 1024 * 1024) {
    return `"${file.name}" is larger than the ${limits.maxUploadMb} MB limit.`;
  }
  return null;
}

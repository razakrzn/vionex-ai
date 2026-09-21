/**
 * Truncates a filename to a maximum length while preserving the extension.
 * @param filename - The original filename.
 * @param maxLength - The maximum length of the filename base (default 10).
 * @returns The truncated filename with the original extension.
 */
export const truncateFilename = (filename: string, maxLength: number = 10): string => {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex === -1) {
    // No extension
    return filename.length > maxLength ? filename.substring(0, maxLength) : filename;
  }

  const extension = filename.substring(lastDotIndex);
  const nameBase = filename.substring(0, lastDotIndex);

  if (nameBase.length <= maxLength) {
    return filename;
  }

  return nameBase.substring(0, maxLength) + extension;
};


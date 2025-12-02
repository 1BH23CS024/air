/**
 * Parses a string containing keywords (one per line) into an array of strings.
 * Each keyword is on a new line. Empty lines or lines with only whitespace are ignored.
 * @param fileContent The content of the keyword file as a single string.
 * @returns An array of trimmed, non-empty keywords.
 */
export function parseKeywords(fileContent: string): string[] {
  if (!fileContent) {
    return [];
  }

  const lines = fileContent.split("\n");

  const keywords: string[] = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return keywords;
}

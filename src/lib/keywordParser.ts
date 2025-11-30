/**
 * Simulates the content of a text file containing popular search keywords.
 * Each keyword is on a new line. Empty lines or lines with only whitespace are ignored.
 */
const mockKeywordFileContent = `
Technology Trends
AI Ethics in 2024
Global Markets Update
Space Exploration News

Climate Policy Changes
Remote Work Future
`;

/**
 * Parses a string containing keywords (one per line) into an array of strings.
 *
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

const popularKeywords = parseKeywords(mockKeywordFileContent);

console.log("Parsed Keywords:");
console.log(popularKeywords);

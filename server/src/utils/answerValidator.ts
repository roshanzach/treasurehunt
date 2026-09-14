/**
 * Normalizes an answer string for robust, fair comparison:
 * - Trims leading/trailing whitespace
 * - Converts to lowercase
 * - Collapses or removes internal spaces and standard punctuation
 */
export function normalizeAnswer(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    // Replace punctuation with empty string or standard separation
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?]/g, '')
    // Remove all whitespace
    .replace(/\s+/g, '');
}

/**
 * Validates a submitted answer against the correct answer.
 * Supports multiple comma or semicolon separated valid answers if specified in question.
 */
export function validateAnswer(submitted: string, correct: string): boolean {
  if (!submitted || !correct) return false;

  const normalizedSubmitted = normalizeAnswer(submitted);
  if (!normalizedSubmitted) return false;

  // Check if correct contains multiple alternative acceptable answers separated by "|" or ";"
  const alternatives = correct
    .split(/[|;]/)
    .map((ans) => normalizeAnswer(ans))
    .filter((ans) => ans.length > 0);

  if (alternatives.length === 0) {
    return normalizeAnswer(correct) === normalizedSubmitted;
  }

  return alternatives.includes(normalizedSubmitted);
}

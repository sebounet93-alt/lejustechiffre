export interface ScoreResult {
  challengerError: number;
  opponentError: number;
  challengerAccuracy: number;
  opponentAccuracy: number;
  challengerWins: boolean;
  opponentWins: boolean;
  isTie: boolean;
}

export function calculateErrorPercent(guess: number, real: number): number {
  if (real === 0) return guess === 0 ? 0 : 100;
  const error = Math.abs(guess - real) / real * 100;
  return Math.round(error * 10) / 10;
}

export function calculateAccuracy(guess: number, real: number): number {
  if (real === 0 && guess === 0) return 100;
  if (real === 0 || guess === 0) return 0;
  const ratio = Math.min(guess, real) / Math.max(guess, real);
  return Math.round(ratio * 100 * 10) / 10;
}

export function absoluteDifference(guess: number, real: number): number {
  return Math.abs(guess - real);
}

export function formatAccuracy(value: number): string {
  if (value < 10) {
    return value.toFixed(1).replace(".", ",");
  }
  return Math.round(value).toString();
}

export function getReactionMessage(accuracy: number): string {
  if (accuracy >= 90) return "🎯 Incroyable, presque dans le mille !";
  if (accuracy >= 70) return "👏 Bien joué, solide estimation !";
  if (accuracy >= 40) return "🤏 Pas si loin, mais peut mieux faire.";
  return "💥 Complètement à côté !";
}

export function compareScores(
  challengerGuess: number,
  opponentGuess: number,
  real: number
): ScoreResult {
  const challengerError = calculateErrorPercent(challengerGuess, real);
  const opponentError = calculateErrorPercent(opponentGuess, real);
  const challengerAccuracy = calculateAccuracy(challengerGuess, real);
  const opponentAccuracy = calculateAccuracy(opponentGuess, real);
  const isTie = challengerError === opponentError;
  return {
    challengerError,
    opponentError,
    challengerAccuracy,
    opponentAccuracy,
    challengerWins: !isTie && challengerError < opponentError,
    opponentWins: !isTie && opponentError < challengerError,
    isTie,
  };
}

export function formatNumber(value: number): string {
  return value.toLocaleString("fr-FR");
}

/** Format a raw numeric string with fr-FR thousands separators as the user types.
 *  Supports decimals (comma or dot). Only the integer part gets thousands separators.
 *  Examples: "1 278,8", "10,17", "3 000 000" */
export function formatNumberInput(raw: string): string {
  let cleaned = raw.replace(/\s/g, "").replace(/[^\d.,]/g, "");
  cleaned = cleaned.replace(/\./g, ",");
  const firstComma = cleaned.indexOf(",");
  if (firstComma !== -1) {
    cleaned = cleaned.slice(0, firstComma + 1) + cleaned.slice(firstComma + 1).replace(/,/g, "");
  }
  const [intPart, decPart] = cleaned.split(",");
  if (intPart === "" && decPart === undefined) return "";
  const formattedInt = intPart ? Number(intPart).toLocaleString("fr-FR") : "0";
  if (decPart === undefined) {
    return intPart === "" ? "" : formattedInt;
  }
  return `${intPart === "" ? "0" : formattedInt},${decPart}`;
}

/** Strip spaces, replace comma with dot, and parse to a float.
 *  Returns 0 for empty/invalid input. */
export function parseNumberInput(formatted: string): number {
  const cleaned = formatted.replace(/\s/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

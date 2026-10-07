/**
 * Extracts a human-readable message from an unknown error value.
 * Handles Error instances and falls back to string coercion.
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

